import { Type, OverloadedType, FunType, CodeType } from '../type';
import { varsym, indent, emit_seq, emit_assign, emit_lookup, emit_if,
  emit_body, paren, splicesym, persistsym, procsym, progsym,
  emit_while, variantsym } from './emitutil';
import { Emitter, emit, emit_scope, emit_main,
  specialized_prog } from './emitter';
import * as ast from '../ast';
import { ast_visit } from '../visit';
import { CompilerIR, Scope, Proc, Prog, Escape,
  nearest_quote, Variant } from '../compile/ir';

export const RUNTIME = `
function assign() {
  var t = arguments[0];
  for (var i = 1; i < arguments.length; ++i)
    for (var k in arguments[i])
      t[k] = arguments[i][k];
  return t;
}
function splice(outer, id, inner, level) {
  var token = '__SPLICE_' + id + '__';
  var code = inner.prog;
  for (var i = 0; i < level; ++i) {
    // Escape the string to fit at the appropriate nesting level.
    code = JSON.stringify(code).slice(1, -1);
  }
  return {
    prog: outer.prog.replace(token, code),
    persist: assign({}, outer.persist, inner.persist)
  };
}
function call(closure, args) {
  return closure.proc.apply(void 0, args.concat(closure.env));
}
function run(code) {
  // Get the persist names and values to bind.
  var params = [];
  var args = [];
  for (var name in code.persist) {
    params.push(name);
    args.push(code.persist[name]);
  }

  // Inject the names into the quote's top-level function wrapper.
  var js = code.prog.replace("()", "(" + params.join(", ") + ")");
  // Strip off the invocation from the end.
  js = js.slice(0, -2);
  // Invoke the extracted function.
  var func = eval(js);
  return func.apply(void 0, args);
}
`.trim();

export const FUNC_ANNOTATION = "js";


// Code-generation utilities.

function _is_fun_type(type: Type): boolean {
  if (type instanceof FunType) {
    return true;
  } else if (type instanceof OverloadedType) {
    return _is_fun_type(type.types[0]);
  } else {
    return false;
  }
}

function emit_extern(name: string, type: Type) {
  if (_is_fun_type(type)) {
    // The extern is a function. Wrap it in the clothing of our closure
    // format (with no environment).
    return "{ proc: " + name + ", env: [] }";
  } else {
    // An ordinary value. Just look it up by name.
    return name;
  }
}

// Create a JavaScript function definition. `name` can be null, in which case
// this is an anonymous function expression.
export function emit_fun(name: string | null, argnames: string[],
    localnames: string[], body: string): string
{
  let anon = (name === null);

  // Emit the definition.
  let out = "";
  if (anon) {
    out += "(";
  }
  out += "function ";
  if (!anon) {
    out += name;
  }
  out += "(" + argnames.join(", ") + ") {\n";
  if (localnames.length) {
    out += "  var " + localnames.join(", ") + ";\n";
  }
  out += indent(body, true);
  out += "\n}";
  if (anon) {
    out += ")";
  }
  return out;
}

// Wrap some code in an anonymous JavaScript function (and possibly invoke it)
// to isolate its variables. The code should define a function called `main`,
// which we will invoke.
export function emit_main_wrapper(code: string, call=true): string {
  let inner_code = code + "\n" + "return main();";
  let wrapper = emit_fun(null, [], [], inner_code);
  if (call) {
    return wrapper + "()";
  } else {
    return wrapper;
  }
}

// Turn a value into a JavaScript string literal. Mutli-line strings become
// nice, readable multi-line concatenations. (This will be obviated by ES6's
// template strings.)
export function emit_string(value: string) {
  if (typeof(value) === "string") {
    let parts: string[] = [];
    let chunks = value.split("\n");
    for (let i = 0; i < chunks.length; ++i) {
      let chunk = chunks[i];
      if (i < chunks.length - 1) {
        chunk += "\n";
      }
      parts.push(JSON.stringify(chunk));
    }
    return parts.join(" +\n");
  } else {
    return JSON.stringify(value);
  }
}

// Emit a JavaScript variable declaration. If `verbose`, then there will be a
// newline between the name and the beginning of the initialization value.
export function emit_var(name: string, value: string, verbose=false): string {
  let out = "var " + name + " =";
  if (verbose) {
    out += "\n";
  } else {
    out += " ";
  }
  out += value;
  out += ";";
  return out;
}

// Like `pretty_value`, but for values in the *compiled* JavaScript world.
export function pretty_value(v: any): string {
  if (typeof v === 'number') {
    return v.toString();
  } else if (typeof v === 'string') {
    return JSON.stringify(v);
  } else if (typeof v === 'boolean') {
    return v.toString();
  } else if (v.proc !== undefined) {
    return "(fun)";
  } else if (v.prog !== undefined) {
    // It is a non-goal of this backend to be able to pretty-print quotations.
    // You can use the interpreter if you want that.
    return "<quote>";
  } else {
    throw "error: unknown value kind";
  }
}


// The core recursive compiler rules.

export let compile_rules = {
  visit_literal(tree: ast.LiteralNode, emitter: Emitter): string {
    if (tree.type === "string") {
      return JSON.stringify(tree.value);
    } else {
      return tree.value.toString();
    }
  },

  visit_seq(tree: ast.SeqNode, emitter: Emitter): string {
    return emit_seq(emitter, tree, ",\n");
  },

  visit_let(tree: ast.LetNode, emitter: Emitter): string {
    let jsvar = varsym(tree.id!);
    return jsvar + " = " + paren(emit(emitter, tree.expr));
  },

  visit_assign(tree: ast.AssignNode, emitter: Emitter): string {
    return emit_assign(emitter, tree);
  },

  visit_lookup(tree: ast.LookupNode, emitter: Emitter): string {
    return emit_lookup(emitter, emit_extern, tree);
  },

  visit_unary(tree: ast.UnaryNode, emitter: Emitter): string {
    let p = emit(emitter, tree.expr);
    let op = tree.op;
    if (op === '~') {
      op = '!';
    }
    return op + paren(p);
  },

  visit_binary(tree: ast.BinaryNode, emitter: Emitter): string {
    let p1 = emit(emitter, tree.lhs);
    let p2 = emit(emitter, tree.rhs);
    return paren(p1) + " " + tree.op + " " + paren(p2);
  },

  visit_quote(tree: ast.QuoteNode, emitter: Emitter): string {
    return emit_quote(emitter, tree.id!);
  },

  visit_escape(tree: ast.EscapeNode, emitter: Emitter): string {
    if (tree.kind === "splice") {
      return splicesym(tree.id!);
    } else if (tree.kind === "persist") {
      return persistsym(tree.id!);
    } else if (tree.kind === "snippet") {
      // We should only see this when pre-splicing is disabled.
      return splicesym(tree.id!);
    } else {
      throw "error: unknown escape kind";
    }
  },

  visit_run(tree: ast.RunNode, emitter: Emitter): string {
    // Compile the expression producing the program we need to invoke.
    let progex = emit(emitter, tree.expr);

    let [t, _] = emitter.ir.type_table[tree.expr.id!];
    if (t instanceof CodeType) {
      // Invoke the appropriate runtime function for executing code values.
      // We use a simple call wrapper for "progfuncs" and a more complex
      // `eval` trick for ordinary string code.
      if (t.annotation === FUNC_ANNOTATION) {
        return `call((${progex}), [])`;
      } else {
        return `run(${paren(progex)})`;
      }
    } else {
      throw "error: running non-code type";
    }
  },

  // A function expression produces a closure value.
  visit_fun(tree: ast.FunNode, emitter: Emitter): string {
    return emit_func(emitter, tree.id!);
  },

  // An invocation unpacks the closure environment and calls the function
  // with its normal arguments and its free variables.
  visit_call(tree: ast.CallNode, emitter: Emitter): string {
    // Compile the function and arguments.
    let func = emit(emitter, tree.fun);
    let args: string[] = [];
    for (let arg of tree.args) {
      args.push(paren(emit(emitter, arg)));
    }

    // Invoke our runtime to complete the closure call.
    return "call(" + paren(func) + ", [" + args.join(", ") + "])";
  },

  visit_extern(tree: ast.ExternNode, emitter: Emitter): string {
    let name = emitter.ir.externs[tree.id!];
    let [type, _] = emitter.ir.type_table[tree.id!];
    return emit_extern(name, type);
  },

  visit_persist(tree: ast.PersistNode, emitter: Emitter): string {
    throw "error: persist cannot appear in source";
  },

  visit_if(tree: ast.IfNode, emitter: Emitter): string {
    return emit_if(emitter, tree);
  },

  visit_while(tree: ast.WhileNode, emitter: Emitter): string {
    return emit_while(emitter, tree);
  },

  visit_macrocall(tree: ast.MacroCallNode, emitter: Emitter): string {
    throw "error: macro invocations are sugar";
  },
};

function compile(tree: ast.SyntaxNode, emitter: Emitter) {
  return ast_visit(compile_rules, tree, emitter);
}


// Code value emission for quote and function nodes.

// Emit a closure value, which consists of a pair of the code reference and
// the environment (persists and free variables).
function _emit_closure(name: string, env: string[]) {
  return `{ proc: ${name}, env: [${env.join(', ')}] }`;
}

// Get all the names of free variables in a scope.
// In Python: [varsym(id) for id in scope.free]
function _free_vars(scope: Scope) {
  let names: string[] = [];
  for (let fv of scope.free) {
    names.push(varsym(fv));
  }
  return names;
}

// Get a list of key/value pairs for the persists in a Program. The key is the
// JavaScript variable name indicating the persist; the value is either the
// expression to compute its value or just the name again to pass along a
// value from an outer quote.
function _persists(emitter: Emitter, prog: Prog): [string, string][] {
  let pairs: [string, string][] = [];
  for (let esc of prog.persist) {
    let key = persistsym(esc.id);
    let value: string;
    if (esc.owner === prog.id) {
      // We own this persist. Compute the expression.
      value = paren(emit(emitter, esc.body));
    } else {
      // Just pass along the pre-computed value.
      value = key;
    }
    pairs.push([key, value]);
  }
  return pairs;
}

// Emit a function expression as a closure.
function emit_func(emitter: Emitter, scopeid: number):
  string
{
  let args = _free_vars(emitter.ir.procs[scopeid]);

  // The function captures its closed-over references and any persists
  // used inside.
  for (let p of emitter.ir.procs[scopeid].persist) {
    args.push(persistsym(p.id));
  }

  return _emit_closure(procsym(scopeid), args);
}

// Emit a quote as a function closure (i.e., for an f<> quote).
function emit_quote_func(emitter: Emitter, prog: Prog, name: string):
  string
{
  let args = _free_vars(prog);

  // Compile each persist so we can pass it in the environment.
  for (let [key, value] of _persists(emitter, prog)) {
    args.push(value);
  }

  return _emit_closure(name, args);
}

// Generate code for a splice escape. This first generates the code to
// evaluate the expression inside the escape, producing a code value. Then, it
// invokes the runtime to splice the result into the base program value, given
// as `code`.
function emit_splice(emitter: Emitter, esc: Escape, code: string): string {
  let esc_expr = emit(emitter, esc.body);

  // Determine how many levels of *eval* quotes are between the owning
  // quotation and the place where the expression needs to be inserted. This
  // is the number of string-escaping rounds we need.
  let eval_quotes = 0;
  let cur_quote = nearest_quote(emitter.ir, esc.id)!;
  for (let i = 0; i < esc.count - 1; ++i) {
    let prog = emitter.ir.progs[cur_quote];
    if (prog.annotation !== FUNC_ANNOTATION) {
      ++eval_quotes;
    }
    cur_quote = prog.quote_parent!;
  }

  // Emit the call to the `splice` runtime function.
  return `splice(${code}, ${esc.id}, ${paren(esc_expr)}, ${eval_quotes})`;
}

// Emit a quote as a full code value (which supports splicing).
function emit_quote_eval(emitter: Emitter, prog: Prog, name: string):
  string
{
  // Compile each persist in this quote and pack them into a dictionary.
  let persist_pairs: string[] = [];
  for (let [key, value] of _persists(emitter, prog)) {
    persist_pairs.push(`${key}: ${value}`);
  }

  // Include free variables as persists.
  for (let fv of prog.free) {
    persist_pairs.push(varsym(fv) + ": " + varsym(fv));
  }

  // Create the initial program.
  let pers_list = `{ ${persist_pairs.join(", ")} }`;
  let code_expr = `{ prog: ${name}, persist: ${pers_list} }`;

  // Compile each spliced escape expression and call our runtime to splice it
  // into the code value.
  for (let esc of prog.owned_splice) {
    code_expr = emit_splice(emitter, esc, code_expr);
  }

  return code_expr;
}

/**
 * Emit the code reference expression for a quote expression.
 *
 * This generates only a single variant of a pre-spliced quote. The type of
 * the JavaScript value depends on the annotation.
 */
function emit_quote_expr(emitter: Emitter, prog: Prog, name: string) {
  if (prog.annotation === FUNC_ANNOTATION) {
    // A function quote.
    return emit_quote_func(emitter, prog, name);
  } else {
    // An eval (string) quote.
    return emit_quote_eval(emitter, prog, name);
  }
}

/**
 * Emit the `switch` construct that chooses a prespliced program variant.
 */
export function emit_variant_selector(emitter: Emitter, prog: Prog,
                               variants: Variant[],
                               emit_variant: (variant: Variant) => string)
{
  // Emit a "switch" construct that chooses the program variant.
  let body = "";
  for (let variant of variants) {
    let cond_parts = variant.config.map((id, i) => `a${i} === ${id}`);
    let condition = cond_parts.join(" && ");
    let progval = emit_variant(variant);
    body += `if (${condition}) {\n`
    body += `  return ${progval};\n`;
    body += `}\n`;
  }
  body += `throw "unknown configuration";`;
  let argnames = variants[0].config.map((id, i) => `a${i}`);
  let selector = emit_fun(null, argnames, [], body);

  // Invoke the selector switch with expressions for each snippet escape.
  let id_exprs: string[] = [];
  for (let esc of prog.owned_snippet) {
    id_exprs.push(paren(emit(emitter, esc.body)));
  }
  return `${selector}(${ id_exprs.join(", ") })`;
}

/**
 * Emit code for a quote expression.
 *
 * The quote can be a pre-spliced snippet or an ordinary program value.
 */
function emit_quote(emitter: Emitter, scopeid: number): string
{
  let prog = specialized_prog(emitter, scopeid);

  // For snippet quotes, just produce the ID. This is used by the pre-splicing
  // optimization to look up the corresponding pre-spliced program.
  if (prog.snippet_escape !== null) {
    return scopeid.toString();
  }

  // Check whether this is a pre-spliced quote (i.e., it has variants).
  let variants = emitter.ir.presplice_variants[scopeid];
  if (variants === null) {
    // No snippets to pre-splice.
    return emit_quote_expr(emitter, prog, progsym(scopeid));
  } else {
    return emit_variant_selector(
      emitter, prog, variants,
      (variant) => {
        let prog_variant = variant.progs[variant.progid] ||
          specialized_prog(emitter, variant.progid);
        return emit_quote_expr(emitter, prog_variant, variantsym(variant));
      }
    );
  }
}


// Common utilities for emitting Scopes (Procs and Progs).

// Compile all the Procs and progs who are children of a given scope.
function _emit_subscopes(emitter: Emitter, scope: Scope) {
  let out = "";
  for (let id of scope.children) {
    let res = emit_scope(emitter, id);
    if (res !== "") {
      out += res + "\n";
    }
  }
  return out;
}

// Get all the names of bound variables in a scope.
// In Python: [varsym(id) for id in scope.bound]
function _bound_vars(scope: Scope) {
  let names: string[] = [];
  for (let bv of scope.bound) {
    names.push(varsym(bv));
  }
  return names;
}

// Compile the body of a Scope as a JavaScript function.
function _emit_scope_func(emitter: Emitter, name: string,
    argnames: string[], scope: Scope): string {
  // Emit all children scopes.
  let subscopes = _emit_subscopes(emitter, scope);

  // Emit the target function code.
  let localnames = _bound_vars(scope);
  let body = emit_body(emitter, scope.body);

  let func = emit_fun(name, argnames, localnames, body);
  return subscopes + func;
}


// Compiling Procs.

// Compile a single Proc to a JavaScript function definition. If the Proc is
// main, then it is an anonymous function expression; otherwise, this produces
// an appropriately named function declaration.
export function emit_proc(emitter: Emitter, proc: Proc):
  string
{
  // The arguments consist of the actual parameters, the closure environment
  // (free variables), and the persists used inside the function.
  let argnames: string[] = [];
  for (let param of proc.params) {
    argnames.push(varsym(param));
  }
  for (let fv of proc.free) {
    argnames.push(varsym(fv));
  }
  for (let p of proc.persist) {
    argnames.push(persistsym(p.id));
  }

  // Get the name of the function, or null for the main function.
  let name: string;
  if (proc.id === null) {
    name = 'main';
  } else {
    name = procsym(proc.id);
  }

  return _emit_scope_func(emitter, name, argnames, proc);
}


// Compiling Progs.

// Compile a quotation (a.k.a. Prog) to a string constant. Also compiles the
// Procs that appear inside this quotation.
function emit_prog_eval(emitter: Emitter, prog: Prog, name: string): string
{
  // Emit (and invoke) the main function for the program.
  let code = emit_main_wrapper(_emit_scope_func(emitter, 'main', [], prog));

  // Wrap the whole thing in a variable declaration.
  return emit_var(name, emit_string(code), true);
}

// Emit a program as a JavaScript function declaration. This works when the
// program has no splices, and it avoids the overhead of `eval`.
function emit_prog_func(emitter: Emitter, prog: Prog, name: string): string
{
  // The must be no splices.
  if (prog.owned_splice.length) {
    throw "error: splices not allowed in a function quote";
  }

  // Free variables become parameters.
  let argnames: string[] = [];
  for (let fv of prog.free) {
    argnames.push(varsym(fv));
  }

  // Same with the quote's persists.
  for (let esc of prog.persist) {
    argnames.push(persistsym(esc.id));
  }

  return _emit_scope_func(emitter, name, argnames, prog);
}

// Emit a JavaScript Prog (a single variant). The backend depends on the
// annotation.
function emit_prog_decl(emitter: Emitter, prog: Prog, name: string): string {
  if (prog.annotation === FUNC_ANNOTATION) {
    // A function quote. Compile to a JavaScript function.
    return emit_prog_func(emitter, prog, name);
  } else {
    // An ordinary quote. Compile to a string.
    return emit_prog_eval(emitter, prog, name);
  }
}

/**
 * Emit a single-variant program.
 */
export function emit_prog(emitter: Emitter, prog: Prog): string {
  return emit_prog_decl(emitter, prog, progsym(prog.id!));
}

/**
 * Emit a variant of a pre-spliced program.
 */
export function emit_prog_variant(emitter: Emitter, variant: Variant,
                           prog: Prog): string {
  return emit_prog_decl(emitter, prog, variantsym(variant));
}


// Top-level compilation.

// Compile the IR to a complete JavaScript program.
export function codegen(ir: CompilerIR): string {
  let emitter: Emitter = {
    ir: ir,
    compile: compile,
    emit_proc: emit_proc,
    emit_prog: emit_prog,
    emit_prog_variant: emit_prog_variant,
    variant: null,
  };

  // Emit and invoke the main (anonymous) function.
  return emit_main_wrapper(emit_main(emitter));
}
