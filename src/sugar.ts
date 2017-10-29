import { TypeCheck, unquantified_type } from './type_check';
import { TypeTable, elaborate_subtree } from './type_elaborate';
import * as ast from './ast';
import { ASTTranslate, gen_translate, ast_translate_rules,
  ast_visit, compose_visit } from './visit';
import { Gen, stack_lookup, fix, compose, zip } from './util';
import { FunType, CodeType, TypeKind } from './type';

// Another type test for the specific kind of node we're interested in. We'll
// use this to follow one piece of advice from the "Scrap Your Boilerplate"
// paper: when you're interested in one kind of node, first write a function
// that dynamically tests for that kind and does its action. Then use separate
// code to lift it to a recursive traversal.
function is_lookup(tree: ast.SyntaxNode): tree is ast.LookupNode {
  return tree.tag === "lookup";
}

// An inheritance layer on ASTTranslate that desugars auto-persists. This
// *updates* the type_table with information about any newly generated nodes.
function gen_desugar_cross_stage(type_table: TypeTable,
    check: Gen<TypeCheck>):
  Gen<ASTTranslate>
{
  return function (fsuper: ASTTranslate): ASTTranslate {
    return function (tree: ast.SyntaxNode): ast.SyntaxNode {
      if (is_lookup(tree)) {
        let [type, env] = type_table[tree.id!];
        if (tree.ident in env.externs) {
          // Extern accesses are not desugared.
          return fsuper(tree);
        }

        let [, index] = stack_lookup(env.stack, tree.ident);

        if (index === 0) {
          // A variable from the current stage. This is a normal access.
          return fsuper(tree);
        } else {
          // A variable from any other stage is an auto-persist. Construct a
          // persist escape that looks up `index` stages.
          let lookup: ast.LookupNode = { tag: "lookup", ident: tree.ident };
          let escape: ast.EscapeNode = {
            tag: "escape",
            kind: "persist",
            expr: lookup,
            count: index!,
          };

          // Now we elaborate the subtree to preserve the restrictions of the
          // IR.
          let elaborated =
            elaborate_subtree(escape, env, type_table, check);

          return elaborated;
        }
      } else {
        return fsuper(tree);
      }
    };
  };
}

// Get a copy of the *elaborated* AST with cross-stage references (a.k.a.
// "auto-persists") desugared into explicit persist escapes.
export function desugar_cross_stage(tree: ast.SyntaxNode,
    type_table: TypeTable,
    check: Gen<TypeCheck>): ast.SyntaxNode
{
  let _desugar = fix(compose(gen_desugar_cross_stage(type_table, check),
        gen_translate));
  return _desugar(tree);
}


function _desugar_macros(type_table: TypeTable,
                        check: Gen<TypeCheck>): ASTTranslate
{
  function fself(tree: ast.SyntaxNode): ast.SyntaxNode {
    return ast_visit(compose_visit(ast_translate_rules(fself), {
      // Translate macro invocations into escaped function calls.
      visit_macrocall(tree: ast.MacroCallNode, param: void) {
        // Get the environment at the point of the macro call.
        let [, env] = type_table[tree.id!];

        // Find how many levels "away" the macro is. That's how many times
        // we'll need to escape.
        let [macro_type, index] = stack_lookup(env.stack, tree.macro);
        let fun_type = unquantified_type(macro_type!) as FunType;

        // Create the function call that invokes the macro.
        let macro_args: ast.ExpressionNode[] = [];
        let has_snippets = false;
        for (let [param, arg] of zip(fun_type.params, tree.args)) {
          if (param.type === TypeKind.CODE) {
            // Code parameter. Wrap the argument in a quote.
            let as_snippet = !!param.snippet_var;
            has_snippets = has_snippets || as_snippet;
            let quote: ast.QuoteNode = {
              tag: "quote",
              expr: arg,
              annotation: "",
              snippet: as_snippet,
            };
            macro_args.push(quote);
          } else {
            // Ordinary parameter.
            macro_args.push(arg);
          }
        }
        let call: ast.CallNode = {
          tag: "call",
          fun: { tag: "lookup", ident: tree.macro } as ast.LookupNode,
          args: macro_args,
        };

        // Wrap the call in an escape (unless it's the current level).
        let out: ast.SyntaxNode = call;
        if (index! > 0) {
          out = {
            tag: "escape",
            kind: has_snippets ? "snippet" : "splice",
            expr: call,
            count: index,
          } as ast.EscapeNode;
        }

        return elaborate_subtree(out, env, type_table, check);
      }
    }), tree, null);
  }
  return fself;
}

export function desugar_macros(tree: ast.SyntaxNode,
    type_table: TypeTable,
    check: Gen<TypeCheck>): ast.SyntaxNode
{
  return _desugar_macros(type_table, check)(tree);
}
