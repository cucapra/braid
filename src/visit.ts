import * as ast from './ast';
import { merge } from './util';

// An interface that can handle each expression AST node type.
export interface ASTVisit<P, R> {
  visit_root(tree: ast.RootNode, param: P): R;
  visit_literal(tree: ast.LiteralNode, param: P): R;
  visit_seq(tree: ast.SeqNode, param: P): R;
  visit_let(tree: ast.LetNode, param: P): R;
  visit_assign(tree: ast.AssignNode, param: P): R;
  visit_lookup(tree: ast.LookupNode, param: P): R;
  visit_unary(tree: ast.UnaryNode, param: P): R;
  visit_binary(tree: ast.BinaryNode, param: P): R;
  visit_typealias(tree: ast.TypeAliasNode, param: P): R;
  visit_quote(tree: ast.QuoteNode, param: P): R;
  visit_escape(tree: ast.EscapeNode, param: P): R;
  visit_run(tree: ast.RunNode, param: P): R;
  visit_fun(tree: ast.FunNode, param: P): R;
  visit_call(tree: ast.CallNode, param: P): R;
  visit_extern(tree: ast.ExternNode, param: P): R;
  visit_persist(tree: ast.PersistNode, param: P): R;
  visit_if(tree: ast.IfNode, param: P): R;
  visit_while(tree: ast.WhileNode, param: P): R;
  visit_macrocall(tree: ast.MacroCallNode, param: P): R;
  visit_param?(tree: ast.ParamNode, param: P): R;
  visit_tuple(tree: ast.TupleNode, param: P): R;
  visit_tupleind(tree: ast.TupleIndexNode, param: P): R;
  visit_alloc(tree: ast.AllocNode, param: P): R;
}

// Tag-based dispatch to the visit functions. A somewhat messy alternative
// to constructing the AST in a type-safe way, but it'll do.
export function ast_visit<P, R>(visitor: ASTVisit<P, R>,
                                tree: ast.SyntaxNode, param: P): R {
  switch (tree.tag) {
    case "root":
      return visitor.visit_root(<ast.RootNode> tree, param);
    case "literal":
      return visitor.visit_literal(<ast.LiteralNode> tree, param);
    case "seq":
      return visitor.visit_seq(<ast.SeqNode> tree, param);
    case "let":
      return visitor.visit_let(<ast.LetNode> tree, param);
    case "assign":
      return visitor.visit_assign(<ast.AssignNode> tree, param);
    case "lookup":
      return visitor.visit_lookup(<ast.LookupNode> tree, param);
    case "unary":
      return visitor.visit_unary(<ast.UnaryNode> tree, param);
    case "binary":
      return visitor.visit_binary(<ast.BinaryNode> tree, param);
    case "type_alias":
      return visitor.visit_typealias(<ast.TypeAliasNode> tree, param);
    case "quote":
      return visitor.visit_quote(<ast.QuoteNode> tree, param);
    case "escape":
      return visitor.visit_escape(<ast.EscapeNode> tree, param);
    case "run":
      return visitor.visit_run(<ast.RunNode> tree, param);
    case "fun":
      return visitor.visit_fun(<ast.FunNode> tree, param);
    case "call":
      return visitor.visit_call(<ast.CallNode> tree, param);
    case "extern":
      return visitor.visit_extern(<ast.ExternNode> tree, param);
    case "persist":
      return visitor.visit_persist(<ast.PersistNode> tree, param);
    case "if":
      return visitor.visit_if(<ast.IfNode> tree, param);
    case "while":
      return visitor.visit_while(<ast.WhileNode> tree, param);
    case "macrocall":
      return visitor.visit_macrocall(<ast.MacroCallNode> tree, param);
    case "param":
      return visitor.visit_param!(<ast.ParamNode> tree, param);
    case "tuple":
      return visitor.visit_tuple(<ast.TupleNode> tree, param);
    case "tupleind":
      return visitor.visit_tupleind(<ast.TupleIndexNode> tree, param);
    case "alloc":
      return visitor.visit_alloc(<ast.AllocNode> tree, param);

    default:
      throw "error: unknown syntax node " + tree.tag;
  }
}

// An interface that can handle *some* AST node types.
type PartialASTVisit<P, R> = Partial< ASTVisit<P, R> >;

const AST_TYPES = [
  "root", "literal", "seq", "let", "assign", "lookup", "unary", "binary",
  "typealias", "quote", "escape", "run", "fun", "call", "extern", "persist",
  "param", "if", "while", "macro", "macrocall", "tuple", "tupleind", "alloc",
];

// Use a fallback function for any unhandled cases in a PartialASTVisit. This
// is some messy run-time metaprogramming!
export function complete_visit <P, R> (
  fallback: (_: ast.SyntaxNode, p: P) => R,
  partial: PartialASTVisit<P, R>):
  ASTVisit<P, R>
{
  let total = < ASTVisit<P, R> > merge(partial);
  for (let kind of AST_TYPES) {
    let fun_name = 'visit_' + kind;
    if (!partial.hasOwnProperty(fun_name)) {
      (<any> total)[fun_name] = fallback;
    }
  }
  return total;
}

// Overlay a partial visitor on top of a complete visitor.
export function compose_visit <P, R> (
  base: ASTVisit<P, R>,
  partial: PartialASTVisit<P, R>):
  ASTVisit<P, R>
{
  return merge(base, partial);
}

// A visitor that traverses the AST recursively (in preorder) and creates a
// copy of it. Override some of these functions to replace parts of the tree
// with new SyntaxNodes.
export type ASTTranslate = (tree: ast.SyntaxNode) => ast.SyntaxNode;
export function ast_translate_rules(fself: ASTTranslate): ASTVisit<void, ast.SyntaxNode> {
  return {
    visit_root(tree: ast.RootNode, param: void): ast.SyntaxNode {
      let child_trees: ast.SyntaxNode[] = [];
      for (let child of tree.children) {
        child_trees.push(fself(child));
      }
      return merge(tree, {
        children: child_trees,
      });
    },

    visit_literal(tree: ast.LiteralNode, param: void): ast.SyntaxNode {
      return merge(tree);
    },

    visit_seq(tree: ast.SeqNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        lhs: fself(tree.lhs),
        rhs: fself(tree.rhs),
      });
    },

    visit_let(tree: ast.LetNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_assign(tree: ast.AssignNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_lookup(tree: ast.LookupNode, param: void): ast.SyntaxNode {
      return merge(tree);
    },

    visit_unary(tree: ast.UnaryNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_binary(tree: ast.BinaryNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        lhs: fself(tree.lhs),
        rhs: fself(tree.rhs),
      });
    },

    visit_typealias(tree: ast.TypeAliasNode, param: void): ast.SyntaxNode {
      return merge(tree);
    },

    visit_quote(tree: ast.QuoteNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_escape(tree: ast.EscapeNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_run(tree: ast.RunNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },

    visit_fun(tree: ast.FunNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        body: fself(tree.body),
      });
    },

    visit_call(tree: ast.CallNode, param: void): ast.SyntaxNode {
      let arg_trees: ast.SyntaxNode[] = [];
      for (let arg of tree.args) {
        arg_trees.push(fself(arg));
      }
      return merge(tree, {
        fun: fself(tree.fun),
        args: arg_trees,
      });
    },

    visit_extern(tree: ast.ExternNode, param: void): ast.ExternNode {
      return merge(tree);
    },

    visit_persist(tree: ast.PersistNode, param: void): ast.SyntaxNode {
      return merge(tree);
    },

    visit_if(tree: ast.IfNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        cond: fself(tree.cond),
        truex: fself(tree.truex),
        falsex: fself(tree.falsex),
      });
    },

    visit_while(tree: ast.WhileNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        cond: fself(tree.cond),
        body: fself(tree.body),
      });
    },

    visit_macrocall(tree: ast.MacroCallNode, param: void): ast.SyntaxNode {
      let arg_trees: ast.SyntaxNode[] = [];
      for (let arg of tree.args) {
        arg_trees.push(fself(arg));
      }
      return merge(tree, {
        args: arg_trees,
      });
    },

    visit_tuple(tree: ast.TupleNode, param: void): ast.SyntaxNode {
      let expr_trees = tree.exprs.map(fself);
      return merge(tree, {
        exprs: expr_trees,
      });
    },

    visit_tupleind(tree: ast.TupleIndexNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        tuple: fself(tree.tuple),
      });
    },

    visit_alloc(tree: ast.AllocNode, param: void): ast.SyntaxNode {
      return merge(tree, {
        expr: fself(tree.expr),
      });
    },
  };
}
export function gen_translate(fself: ASTTranslate): ASTTranslate {
  let rules = ast_translate_rules(fself);
  return function(tree: ast.SyntaxNode): ast.SyntaxNode {
    return ast_visit(rules, tree, null);
  };
}

// An interface for visiting *type* nodes.
export interface TypeASTVisit<P, R> {
  visit_primitive(tree: ast.PrimitiveTypeNode, param: P): R;
  visit_fun(tree: ast.FunTypeNode, param: P): R;
  visit_code(tree: ast.CodeTypeNode, param: P): R;
  visit_instance(tree: ast.InstanceTypeNode, param: P): R;
  visit_overloaded(tree: ast.OverloadedTypeNode, param: P): R;
  visit_tuple(tree: ast.TupleTypeNode, param: P): R;
}

// Tag-based dispatch to the type visitor visit functions.
export function type_ast_visit<P, R>(visitor: TypeASTVisit<P, R>,
                                     tree: ast.TypeNode, param: P): R {
  switch (tree.tag) {
    case "type_primitive":
      return visitor.visit_primitive(<ast.PrimitiveTypeNode> tree, param);
    case "type_fun":
      return visitor.visit_fun(<ast.FunTypeNode> tree, param);
    case "type_code":
      return visitor.visit_code(<ast.CodeTypeNode> tree, param);
    case "type_instance":
      return visitor.visit_instance(<ast.InstanceTypeNode> tree, param);
    case "type_overloaded":
      return visitor.visit_overloaded(<ast.OverloadedTypeNode> tree, param);
    case "type_tuple":
      return visitor.visit_tuple(<ast.TupleTypeNode> tree, param);

    default:
      throw "error: unknown type syntax node " + tree.tag;
  }
}

// Basic AST visitor rules implementing a "fold," analogous to a list fold.
// This threads a single function through the whole tree, bottom-up.
export type ASTFold <T> = (tree: ast.SyntaxNode, p: T) => T;
export function ast_fold_rules <T> (fself: ASTFold<T>): ASTVisit<T, T> {
  return {
    visit_root(tree: ast.RootNode, p: T): T {
      let p1 = p;
      for (let child of tree.children) {
        p1 = fself(child, p1);
      }
      return p1;
    },

    visit_literal(tree: ast.LiteralNode, p: T): T {
      return p;
    },

    visit_seq(tree: ast.SeqNode, p: T): T {
      let p1 = fself(tree.lhs, p);
      let p2 = fself(tree.rhs, p1);
      return p2;
    },

    visit_let(tree: ast.LetNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_assign(tree: ast.AssignNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_lookup(tree: ast.LookupNode, p: T): T {
      return p;
    },

    visit_unary(tree: ast.UnaryNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_binary(tree: ast.BinaryNode, p: T): T {
      let p1 = fself(tree.lhs, p);
      let p2 = fself(tree.rhs, p1);
      return p2;
    },

    visit_typealias(tree: ast.TypeAliasNode, p: T): T {
      return p;
    },

    visit_quote(tree: ast.QuoteNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_escape(tree: ast.EscapeNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_run(tree: ast.RunNode, p: T): T {
      return fself(tree.expr, p);
    },

    visit_fun(tree: ast.FunNode, p: T): T {
      return fself(tree.body, p);
    },

    visit_call(tree: ast.CallNode, p: T): T {
      let p1 = p;
      for (let arg of tree.args) {
        p1 = fself(arg, p1);
      }
      let p2 = fself(tree.fun, p1);
      return p2;
    },

    visit_extern(tree: ast.ExternNode, p: T): T {
      return p;
    },

    visit_persist(tree: ast.PersistNode, p: T): T {
      return p;
    },

    visit_if(tree: ast.IfNode, p: T): T {
      let p1 = fself(tree.cond, p);
      let p2 = fself(tree.truex, p1);
      let p3 = fself(tree.falsex, p2);
      return p3;
    },

    visit_while(tree: ast.WhileNode, p: T): T {
      let p1 = fself(tree.cond, p);
      let p2 = fself(tree.body, p1);
      return p2;
    },

    visit_macrocall(tree: ast.MacroCallNode, p: T): T {
      let p1 = p;
      for (let arg of tree.args) {
        p1 = fself(arg, p1);
      }
      return p1;
    },

    visit_tuple(tree: ast.TupleNode, p: T): T {
      let p1 = p;
      for (let expr of tree.exprs) {
        p1 = fself(expr, p1);
      }
      return p1;
    },

    visit_tupleind(tree: ast.TupleIndexNode, p: T): T {
      return fself(tree.tuple, p);
    },

    visit_alloc(tree: ast.AllocNode, p: T): T {
      return fself(tree.expr, p);
    },
  };
}
