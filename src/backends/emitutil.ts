import { Emitter, emit } from './emitter';
import * as ast from '../ast';
import { Type, FunType, OverloadedType, TypeType } from '../type';
import { complete_visit, ast_visit } from '../visit';
import { Prog, Variant } from '../compile/ir';

// Utilities used by the various code-generation backends.

// Get a variable name for a variable by its defining node ID.
export function varsym(defid: number) {
  return 'v' + defid;
}

// Get a function name for a Proc by its ID, which is the same as the
// defining `fun` node ID.
export function procsym(procid: number) {
  return "f" + procid;
}

// Get a string constant name for a quotation (i.e., a Prog) by its ID,
// which is the same as the `quote` node ID.
export function progsym(progid: number) {
  return "q" + progid;
}

// Get a *placeholder token* for a splice escape. This will be used with find
// & replace to substitute in code into an expression.
// TODO Eventually, a better implementation of this idea would just
// concatenate string fragments instead of using find & replace.
export function splicesym(escid: number) {
  return "__SPLICE_" + escid + "__";
}

// Get a variable name for communicating *persist* escapes into an `eval`
// call.
export function persistsym(escid: number) {
  return "p" + escid;
}

/**
 * Get the symbol for a `Prog` or `Variant` (a pre-spliced version of a
 * `Prog`).
 */
export function variantsym(variant: Variant) {
  return progsym(variant.progid) + variant_suffix(variant);
}

/**
 * Emit a suffix indicating the variant, if any. If no variant is provided,
 * return the empty string.
 */
export function variant_suffix(variant: Variant | null) {
  if (variant) {
    return "_" + variant.config.join("_");
  } else {
    return "";
  }
}

// Parenthesize an expression.
export function paren(e: string) {
  return "(" + e + ")";
}

// Repeat a string n times.
function repeat(s: string, n: number): string {
  let o = "";
  for (let i = 0; i < n; ++i) {
    o += s;
  }
  return o;
}

// Indent a string by a given number of spaces.
export function indent(s: string, first = false, spaces = 2): string {
  let space = repeat(" ", spaces);
  let out = s.replace(/\n/g, "\n" + space);
  if (first) {
    out = space + out;
  }
  return out;
}

// A helper for emitting sequence expressions without emitting unneeded code.
export function emit_seq(emitter: Emitter, seq: ast.SeqNode, sep: string,
    pred: (_: ast.ExpressionNode) => boolean = useful_pred): string
{
  let out = "";
  if (pred(seq.lhs)) {
    out += emit(emitter, seq.lhs);
    out += sep;
  }
  out += emit(emitter, seq.rhs);
  return out;
}

// A helper for emitting children of a root node.
export function emit_exprs(emitter: Emitter, exprs: ast.ExpressionNode[], sep: string,
  pred: (_: ast.ExpressionNode) => boolean = useful_pred): string
{
  let out = "";
  for (let i = 0; i < exprs.length; i++) {
    out += emit(emitter, exprs[i]);
    if (i !== exprs.length - 1)
      out += sep;
  }
  return out;
}

// Helper for emitting a header file. Same as normal, but checks both LHS and RHS of seq
export function check_header(emitter: Emitter, expr: ast.ExpressionNode, sep: string,
  pred: (_: ast.ExpressionNode) => boolean = useful_pred): string
  {
    let out = "";
    let rules = complete_visit(
      function (tree: ast.SyntaxNode) {
        return emit(emitter, tree);
      },
      {
        visit_seq(seq: ast.SeqNode, p: void): string {
          let result = "";
          if (pred(seq.lhs)) {
            let lhs = check_header(emitter, seq.lhs, sep);
            result += (lhs !== "") ? lhs + sep : "";
          }
          if (pred(seq.rhs)) {
            let rhs = check_header(emitter, seq.rhs, sep);
            // Don't add sep on RHS
            result += (rhs !== "") ? rhs : "";
          }
          return result;
        }
      }
    );
    return ast_visit(rules, expr, null);
  }

// A helper for emitting assignments. Handles both externs and normal
// variables.
export function emit_assign(emitter: Emitter,
    tree: ast.AssignNode, get_varsym = varsym): string {
  let defid = emitter.ir.defuse[tree.id!];
  let extern = emitter.ir.externs[defid];
  if (extern !== undefined) {
    // Extern assignment.
    return extern + " = " + paren(emit(emitter, tree.expr));
  } else {
    // Ordinary variable assignment.
    let jsvar = get_varsym(defid);
    return jsvar + " = " + paren(emit(emitter, tree.expr));
  }
}

// A helper for emitting lookups. Also handles both externs and ordinary
// variables.
export function emit_lookup(emitter: Emitter,
    emit_extern: (name: string, type: Type) => string,
    tree: ast.LookupNode,
    get_varsym = varsym): string {
  let defid = emitter.ir.defuse[tree.id!];
  let name = emitter.ir.externs[defid];
  if (name !== undefined) {
    let [type, _] = emitter.ir.type_table[tree.id!];
    return emit_extern(name, type);
  } else {
    // An ordinary variable lookup.
    return get_varsym(defid);
  }
}

/**
 * A helper for emitting if/then/else.
 */
export function emit_if(emitter: Emitter, tree: ast.IfNode): string {
  let cond = emit(emitter, tree.cond);
  let truex = emit(emitter, tree.truex);
  let falsex = emit(emitter, tree.falsex);
  return `${paren(cond)} ? ${paren(truex)} : ${paren(falsex)}`;
}

/**
 * A helper for emitting `while` loops (with no return value).
 */
export function emit_while(emitter: Emitter, tree: ast.WhileNode): string {
  let cond = emit(emitter, tree.cond);
  let body = emit_body(emitter, tree.body, "");
  return `while ${paren(cond)} {\n${indent(body, true)}\n}`;
}

// Flatten sequence trees. This is used at the top level of a function, where
// we want to emit a sequence of statements followed by a `return`.
function flatten_seq(tree: ast.SyntaxNode): ast.ExpressionNode[] {
  let rules = complete_visit(
    function (tree: ast.SyntaxNode) {
      return [tree];
    },
    {
      visit_seq(tree: ast.SeqNode, p: void): ast.ExpressionNode[] {
        let lhs = flatten_seq(tree.lhs);
        let rhs = flatten_seq(tree.rhs);
        return lhs.concat(rhs);
      }
    }
  );
  return <ast.ExpressionNode[]> ast_visit(rules, tree, null);
}

/**
 * A predicate for use with `emit_body` that decides whether an expression is
 * "worth" emitting---i.e., whether it could potentially be effectful.
 * This way, expressions with no effect avoid getting emitted unless their
 * results are actually used.
 */
function useful_pred(tree: ast.ExpressionNode): boolean {
  return ["extern", "lookup", "literal", "type_alias"].indexOf(tree.tag) === -1;
}

/**
 * A predicate that decides whether an expression needs to be emitted as a
 * *statement* instead of as an *expression* in the generated code.
 */
function statement_pred(tree: ast.ExpressionNode): boolean {
  return tree.tag === "while";
}

/**
 * Compile a top-level expression for a backend C-like block, like the body of
 * a function. The idea is to emit a flattish sequence of semicolon-separated
 * statements.
 *
 * The emitted code includes a `return` statement at the end unless the `ret`
 * parameter is null.
 *
 * The optional `pred` function can be used to decide whether an expression is
 * potentially effectful an should be emitted when its result is ignored
 * (i.e., because it is on the LHS of some sequence). The *last* expression in
 * a sequence nesting is always emitted (as the return value of the function).
 *
 * The optional `stmt_pred` can classify expression as needing to be emitted
 * in "statement position". This means they cannot be returned, so "null" is
 * returned instead.
 */
export function emit_body(emitter: Emitter, tree: ast.SyntaxNode,
    ret = "return ", sep = ";",
    pred: (_: ast.ExpressionNode) => boolean = useful_pred,
    stmt_pred: (_: ast.ExpressionNode) => boolean = statement_pred): string
{
  let exprs: ast.ExpressionNode[] = [];
  if (tree.tag === "root") {
    for (let child of (tree as ast.RootNode).children) {
      exprs = exprs.concat(flatten_seq(child));
    }
  } else {
    exprs = flatten_seq(tree);
  }
  let statements: string[] = [];
  for (let i = 0; i < exprs.length; ++i) {
    let expr = exprs[i];
    let s = emit(emitter, expr);
    if (s.length) {
      if (ret && i === exprs.length - 1) {
        // Last statement, and we need to emit a `return`.
        if (stmt_pred(expr)) {
          // Return null.
          statements.push(emit(emitter, expr));
          statements.push(ret + "null");
        } else {
          // Return the expression's value.
          statements.push(ret + emit(emitter, expr));
        }
      } else if (pred(expr)) {
        statements.push(emit(emitter, expr));
      }
    }
  }
  return statements.join(sep + "\n") + sep;
}

/**
 * Check whether a type is any function type, including an overloaded function
 * type.
 */
export function is_fun_type(type: Type): boolean {
  switch (type.type) {
    case TypeType.FUN:
    case TypeType.VARIADIC_FUN:
      return true;
    case TypeType.OVERLOADED:
      return is_fun_type(type.types[0]);
    default:
      return false;
  }
}
