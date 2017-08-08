/**
 * Some utilities for summarizing SSC ASTs for visual representation in the
 * dingus.
 */

import * as ast from '../../src/ast';
import { ASTVisit, ast_visit } from '../../src/visit';

let GetChildren: ASTVisit<void, ast.SyntaxNode[]> = {
  visit_root(tree: ast.RootNode, _: void): ast.SyntaxNode[] {
    return tree.children;
  },
  visit_literal(tree: ast.LiteralNode, _: void): ast.SyntaxNode[] {
    return [];
  },
  visit_seq(tree: ast.SeqNode, _: void): ast.SyntaxNode[] {
    return [tree.lhs, tree.rhs];
  },
  visit_let(tree: ast.LetNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_assign(tree: ast.AssignNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_lookup(tree: ast.LookupNode, _: void): ast.SyntaxNode[] {
    return [];
  },
  visit_unary(tree: ast.UnaryNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_binary(tree: ast.BinaryNode, _: void): ast.SyntaxNode[] {
    return [tree.lhs, tree.rhs];
  },
  visit_quote(tree: ast.QuoteNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_escape(tree: ast.EscapeNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_run(tree: ast.RunNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
  visit_fun(tree: ast.FunNode, _: void): ast.SyntaxNode[] {
    return [tree.body];
  },
  visit_call(tree: ast.CallNode, _: void): ast.SyntaxNode[] {
    return [tree.fun].concat(tree.args);
  },
  visit_extern(tree: ast.ExternNode, _: void): ast.SyntaxNode[] {
    return [];
  },
  visit_persist(tree: ast.PersistNode, _: void): ast.SyntaxNode[] {
    return [];
  },
  visit_if(tree: ast.IfNode, _: void): ast.SyntaxNode[] {
    return [tree.cond, tree.truex, tree.falsex];
  },
  visit_while(tree: ast.WhileNode, _: void): ast.SyntaxNode[] {
    return [tree.cond, tree.body];
  },
  visit_macrocall(tree: ast.MacroCallNode, _: void): ast.SyntaxNode[] {
    return tree.args;
  },
  visit_typealias(tree: ast.TypeAliasNode, _: void): ast.SyntaxNode[] {
    return [];
  },
  visit_tuple(tree: ast.TupleNode, _: void): ast.SyntaxNode[] {
    return tree.exprs;
  },
  visit_tupleind(tree: ast.TupleIndexNode, _: void): ast.SyntaxNode[] {
    return [tree.tuple];
  },
  visit_alloc(tree: ast.AllocNode, _: void): ast.SyntaxNode[] {
    return [tree.expr];
  },
};

export function get_children(tree: ast.SyntaxNode): ast.SyntaxNode[] {
  return ast_visit(GetChildren, tree, null);
}

let GetName: ASTVisit<void, string> = {
  visit_root(tree: ast.RootNode, _: void): string {
    return "root";
  },
  visit_literal(tree: ast.LiteralNode, _: void): string {
    return tree.value.toString();
  },
  visit_seq(tree: ast.SeqNode, _: void): string {
    return "seq";
  },
  visit_let(tree: ast.LetNode, _: void): string {
    return "var " + tree.ident;
  },
  visit_assign(tree: ast.AssignNode, _: void): string {
    return tree.ident + " =";
  },
  visit_lookup(tree: ast.LookupNode, _: void): string {
    return tree.ident;
  },
  visit_unary(tree: ast.UnaryNode, _: void): string {
    return tree.op;
  },
  visit_binary(tree: ast.BinaryNode, _: void): string {
    return tree.op;
  },
  visit_quote(tree: ast.QuoteNode, _: void): string {
    return "quote";
  },
  visit_escape(tree: ast.EscapeNode, _: void): string {
    if (tree.kind === "persist") {
      return "persist";
    } else {
      return "escape";
    }
  },
  visit_run(tree: ast.RunNode, _: void): string {
    return "run";
  },
  visit_fun(tree: ast.FunNode, _: void): string {
    let params = "";
    for (let param of tree.params) {
      params += " " + param.name;
    }
    return "fun" + params;
  },
  visit_call(tree: ast.CallNode, _: void): string {
    return "call";
  },
  visit_extern(tree: ast.ExternNode, _: void): string {
    return "extern " + tree.name;
  },
  visit_persist(tree: ast.PersistNode, _: void): string {
    return "%" + tree.index;
  },
  visit_if(tree: ast.IfNode, _: void): string {
    return "if";
  },
  visit_while(tree: ast.WhileNode, _: void): string {
    return "while";
  },
  visit_macrocall(tree: ast.MacroCallNode, _: void): string {
    return "@" + tree.macro;
  },
  visit_typealias(tree: ast.TypeAliasNode, _: void): string {
    return "typealias";
  },
  visit_tuple(tree: ast.TupleNode, _: void): string {
    return "tuple";
  },
  visit_tupleind(tree: ast.TupleIndexNode, _: void): string {
    return "." + tree.index;
  },
  visit_alloc(tree: ast.AllocNode, _: void): string {
    return `let ${tree.ident}`;
  },
};

export function get_name(tree: ast.SyntaxNode): string {
  return ast_visit(GetName, tree, null);
}
