import { Type, PrimitiveType, INT, FLOAT } from '../type';
import { TypeCheck, TypeEnv } from '../type_check';
import * as ast from '../ast';
import { stack_lookup } from '../util';
import { ASTVisit, ast_visit, complete_visit } from '../visit';
import { _unwrap_array, _is_cpu_scope, _attribute_type, TYPE_NAMES,
  shadervarsym, frag_expr, Glue, ProgKind, prog_kind,
  SHADER_ANNOTATION, emit_glue, is_intrinsic_call } from './gl';
import { Emitter, emit, specialized_prog } from './emitter';
import { varsym, indent, emit_seq, emit_assign, emit_lookup, emit_if,
  emit_while, emit_body, paren, splicesym } from './emitutil';
import { CompilerIR, nearest_quote, Variant } from '../compile/ir';

// Type checking for uniforms, which are automatically demoted from arrays to
// individual values when they persist.

// The type mixin itself.
export function type_mixin(fsuper: TypeCheck): TypeCheck {
  let type_rules = complete_visit(fsuper, {
    // The goal here is to take lookups into prior stages of type `X Array`
    // and turn them into type `X`.
    visit_lookup(tree: ast.LookupNode, env: TypeEnv): [Type, TypeEnv] {
      // Look up the type and stage of a variable.
      if (env.anns[0] === SHADER_ANNOTATION) {  // Shader stage.
        let [t, pos] = stack_lookup(env.stack, tree.ident);
        if (t !== undefined && pos! > 0) {
          return [_unwrap_array(t), env];
        }
      }

      return fsuper(tree, env);
    },

    // Do the same for ordinary persist-escapes.
    // This is one downside of our desugaring: we have two cases here instead
    // of just one (cross-stage variable references). We need this even to
    // type-elaborate the subtrees generated by desugaring.
    visit_escape(tree: ast.EscapeNode, env: TypeEnv): [Type, TypeEnv] {
      let [t, e] = fsuper(tree, env);
      if (env.anns[0] === SHADER_ANNOTATION) {  // Shader stage.
        if (tree.kind === "persist") {
          return [_unwrap_array(t), e];
        }
      }
      return [t, e];
    },
  });

  return function (tree: ast.SyntaxNode, env: TypeEnv): [Type, TypeEnv] {
    return ast_visit(type_rules, tree, env);
  };
};


// The core compiler rules for emitting GLSL code.

function emit_extern(name: string): string {
  return name;
}

function emit_decl(qualifier: string, type: string, name: string) {
  return qualifier + " " + type + " " + name + ";";
}

function emit_type(type: Type): string {
  if (type instanceof PrimitiveType) {
    let name = TYPE_NAMES[type.name];
    if (name === undefined) {
      throw "error: primitive type " + type.name + " unsupported in GLSL";
    } else {
      return name;
    }
  } else {
    throw "error: type unsupported in GLSL: " + type;
  }
}

/**
 * Like `nearest_quote`, finds the closest containing quote expression. This
 * version, however, "passes through" prespliced quotes to their parents.
 */
function nearest_prespliced_quote(ir: CompilerIR, id: number): number {
  let qid = nearest_quote(ir, id)!;
  let quote = ir.progs[qid];
  if (quote && quote.snippet_escape) {
    return nearest_prespliced_quote(ir, quote.snippet_escape);
  }
  return qid;
}

let compile_rules: ASTVisit<Emitter, string> = {
  visit_literal(tree: ast.LiteralNode, emitter: Emitter): string {
    let [t,] = emitter.ir.type_table[tree.id!];
    if (t === INT) {
      return tree.value.toString();
    } else if (t === FLOAT) {
      // Make sure that even whole numbers are emitting as floating-point
      // literals.
      let out = tree.value.toString();
      if (out.indexOf(".") === -1) {
        return out + ".0";
      } else {
        return out;
      }
    } else {
      throw "error: unknown literal type";
    }
  },

  visit_seq(tree: ast.SeqNode, emitter: Emitter): string {
    return emit_seq(emitter, tree, ",\n");
  },

  visit_let(tree: ast.LetNode, emitter: Emitter): string {
    let varname = shadervarsym(nearest_prespliced_quote(emitter.ir, tree.id!), tree.id!);
    return varname + " = " + paren(emit(emitter, tree.expr));
  },

  visit_assign(tree: ast.AssignNode, emitter: Emitter): string {
    // TODO Prevent assignment to nonlocal variables.
    let vs = (id:number) => shadervarsym(nearest_prespliced_quote(emitter.ir, tree.id!), id);
    return emit_assign(emitter, tree, vs);
  },

  visit_lookup(tree: ast.LookupNode, emitter: Emitter): string {
    return emit_lookup(emitter, emit_extern, tree, function (id:number) {
      let [type,] = emitter.ir.type_table[id];
      if (_is_cpu_scope(emitter.ir, nearest_prespliced_quote(emitter.ir, id)) && !_attribute_type(type)) {
        // References to variables defined on the CPU ("uniforms") get a
        // special naming convention so they can be shared between multiple
        // shaders in the same program.
        return varsym(id);
      } else {
        // Ordinary shader-scoped variable.
        return shadervarsym(nearest_prespliced_quote(emitter.ir, tree.id!), id);
      }
    });
  },

  visit_unary(tree: ast.UnaryNode, emitter: Emitter): string {
    let p = emit(emitter, tree.expr);
    return tree.op + paren(p);
  },

  visit_binary(tree: ast.BinaryNode, emitter: Emitter): string {
    return paren(emit(emitter, tree.lhs)) + " " +
           tree.op + " " +
           paren(emit(emitter, tree.rhs));
  },

  visit_quote(tree: ast.QuoteNode, emitter: Emitter): string {
    throw "unimplemented";
  },

  visit_escape(tree: ast.EscapeNode, emitter: Emitter): string {
    if (tree.kind === "splice") {
      return splicesym(tree.id!);
    } else if (tree.kind === "persist") {
      return shadervarsym(nearest_prespliced_quote(emitter.ir, tree.id!), tree.id!);
    } else if (tree.kind === "snippet") {
      return splicesym(tree.id!);  // SNIPPET TODO
    } else {
      throw "error: unknown escape kind";
    }
  },

  visit_run(tree: ast.RunNode, emitter: Emitter): string {
    throw "unimplemented";
  },

  visit_fun(tree: ast.FunNode, emitter: Emitter): string {
    throw "unimplemented";
  },

  visit_call(tree: ast.CallNode, emitter: Emitter): string {
    // The fragment call emits nothing here.
    if (frag_expr(tree)) {
      return "";
    }

    // "Swizzle" intrinsic for vectors.
    if (is_intrinsic_call(tree, "swizzle")) {
      if (tree.args[1].tag === "literal") {
        let literal = tree.args[1] as ast.LiteralNode;
        if (literal.type === "string") {
          let vec = emit(emitter, tree.args[0]);
          let spec = literal.value as string;
          return `${vec}.${spec}`;
        } else {
          throw "error: swizzle argument must be a string";
        }
      } else {
        throw "error: swizzle argument must be a literal";
      }
    }

    // Check that it's a static call.
    if (tree.fun.tag === "lookup") {
      let fun = emit(emitter, tree.fun);
      let args: string[] = [];
      for (let arg of tree.args) {
        args.push(emit(emitter, arg));
      }
      return fun + "(" + args.join(", ") + ")";
    }

    throw "error: GLSL backend is not higher-order";
  },

  visit_extern(tree: ast.ExternNode, emitter: Emitter): string {
    let defid = emitter.ir.defuse[tree.id!];
    let name = emitter.ir.externs[defid];
    return emit_extern(name);
  },

  visit_persist(tree: ast.PersistNode, emitter: Emitter): string {
    throw "error: persist cannot appear in source";
  },

  visit_if(tree: ast.IfNode, emitter: Emitter): string {
    let cond = emit(emitter, tree.cond);
    let truex = emit(emitter, tree.truex);
    let falsex = emit(emitter, tree.falsex);

    // Emit a ternary operator that uses a != comparison to convert a
    // floating-point condition to a boolean. WebGL (i.e., OpenGL ES 2.0)
    // doesn't support integer uniforms---or perhaps integers at all?---so we
    // need this to use floating-point numbers as conditions.
    return `(${paren(cond)} != 0.0) ? ${paren(truex)} : ${paren(falsex)}`;
  },

  visit_while(tree: ast.WhileNode, emitter: Emitter): string {
    return emit_while(emitter, tree);
  },

  visit_macrocall(tree: ast.MacroCallNode, emitter: Emitter): string {
    throw "error: macro invocations are sugar";
  },
};

export function compile(tree: ast.SyntaxNode, emitter: Emitter): string {
  return ast_visit(compile_rules, tree, emitter);
}


// Emitting the surrounding machinery for communicating between stages.

export function compile_prog(parent_emitter: Emitter, progid: number): string
{
  let ir = parent_emitter.ir;
  let emitter: Emitter = {
    ir: ir,
    emit_expr: compile,
    emit_proc: (e: any, p: any) => { throw "procs unimplemented in GLSL" },
    emit_prog: (e: any, p: any) => { throw "progs unimplemented in GLSL" },
    emit_prog_variant:
      (e: any, p: any) => { throw "progs unimplemented in GLSL" },
    variant: parent_emitter.variant,
  };

  // TODO compile the functions

  let prog = specialized_prog(emitter, progid);

  // Check whether this is a vertex or fragment shader or just a GLSL
  // subexpression.
  let kind = prog_kind(ir, progid);
  if (kind === ProgKind.subexpr) {
    return paren(emit(emitter, prog.body));
  }
  if (kind !== ProgKind.vertex && kind !== ProgKind.fragment) {
    throw "error: unexpected program kind";
  }

  // Declare `in` variables for the persists and free variables.
  let decls: string[] = [];
  for (let g of emit_glue(parent_emitter, progid)) {
    let qual: string;
    if (g.attribute) {
      qual = "attribute";
    } else if (g.from_host) {
      qual = "uniform";
    } else {
      qual = "varying";
    }
    decls.push(emit_decl(qual, emit_type(g.type), g.name));
  }

  // Declare `out` variables for the persists (and free variables) in the
  // subprogram. At the same time, accumulate the assignment statements that
  // we'll use to set these `out` variables.
  let varying_asgts: string[] = [];
  // There can be at most one subprogram for every shader.
  if (prog.quote_children.length > 1) {
    throw "error: too many subprograms";
  } else if (prog.quote_children.length === 1) {
    let subprog = ir.progs[prog.quote_children[0]];
    for (let g of emit_glue(parent_emitter, subprog.id!)) {
      if (!g.from_host) {
        decls.push(emit_decl("varying", emit_type(g.type), g.name));

        let value: string;
        if (g.value_name) {
          value = g.value_name;
        } else {
          value = paren(emit(emitter, g.value_expr!));
        }
        varying_asgts.push(`${g.name} = ${value}`);
      }
    }
  }

  // Emit the bound variable declarations.
  let local_decls: string[] = [];
  for (let id of prog.bound) {
    let [t,] = ir.type_table[id];
    local_decls.push(`${emit_type(t)} ${shadervarsym(progid, id)};\n`);
  }
  let local_decls_s = local_decls.join("");

  // Wrap the code in a "main" function.
  let code = emit_body(emitter, prog.body, "");
  code = local_decls_s + code;
  if (varying_asgts.length) {
    code += "\n// pass to next stage\n" + varying_asgts.join(";\n") + ";";
  }
  let main = `void main() {\n${indent(code, true)}\n}`;

  // This version of GLSL requires a precision declaration.
  let out = "precision mediump float;\n";

  // Concatenate the declarations and the main function.
  if (decls.length) {
    out += decls.join("\n") + "\n";
  }
  out += main;
  return out;
}
