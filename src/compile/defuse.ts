import { hd, tl, cons, stack_lookup, merge, fix } from '../util';
import { DefUseTable } from './ir';
import { ASTFold, ast_fold_rules, compose_visit, ast_visit } from '../visit';
import * as ast from '../ast';

export type NameMap = { [name: string]: number };

// The intermediate data structure for def/use analysis is a *stack of stack
// of maps*. The map assigns a defining node ID for names. We need a stack to
// reflect function scopes, and a stack of *those* to reflect quotes.
type NameStack = NameMap[];

/**
 * Create a new stack that shares the same tail but gets a new copy of the head.
 */
function head_overlay <T extends Object> (a: T[]): T[] {
  let hm = Object.assign({}, hd(a));
  return cons(hm, tl(a));
}

// The state structure for the DefUse analysis.
interface State {
  ns: NameStack,  // Variable mapping.
  externs: NameMap,  // Extern mapping.
  snip: NameStack | null,  // Snippet environment.
}

// The def/use analysis case for uses: both lookup and assignment nodes work
// the same way.
function handle_use(tree: ast.LookupNode | ast.AssignNode,
    [state, table]: [State, DefUseTable]):
    [State, DefUseTable]
{
  // Try an ordinary variable lookup.
  let [def_id, _] = stack_lookup(state.ns, tree.ident);
  if (def_id === undefined) {
    // Try an extern.
    def_id = state.externs[tree.ident];
    if (def_id  === undefined) {
      throw "error: variable " + tree.ident + " not in name map";
    }
  }

  let t = table.slice(0);
  t[tree.id!] = def_id;
  return [state, t];
}

// Here's the core def/use analysis. It threads through the ordinary NameStack
// and a special NameMap for externs.
type FindDefUse = ASTFold<[State, DefUseTable]>;
function gen_find_def_use(fself: FindDefUse): FindDefUse {
  let fold_rules = ast_fold_rules(fself);
  let rules = compose_visit(fold_rules, {
    // The "let" case defines a variable in a map to refer to the "let" node.
    visit_let(tree: ast.LetNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      let [s1, t1] = fself(tree.expr, [state, table]);
      let ns = head_overlay(state.ns);
      hd(ns)[tree.ident] = tree.id!;
      return [merge(s1, {ns}), t1];
    },

    // Similarly, "fun" defines variables in the map for its parameters.
    visit_fun(tree: ast.FunNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      // Update the top map with the function parameters.
      let ns = head_overlay(state.ns);
      for (let param of tree.params) {
        hd(ns)[param.name] = param.id!;
      }

      // Traverse the body with this new map.
      let [, t2] = fself(tree.body, [merge(state, {ns}), table]);
      // Then continue outside of the `fun` with the old maps.
      return [state, t2];
    },

    // Lookup (i.e., a use) populates the def/use table based on the name map.
    visit_lookup(tree: ast.LookupNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      return handle_use(tree, [state, table]);
    },

    // A mutation is another kind of use.
    visit_assign(tree: ast.AssignNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      // Recurse into the RHS expression.
      let [s, t] = fself(tree.expr, [state, table]);

      // Record the use.
      return handle_use(tree, [s, t]);
    },

    // On quote, push an empty name map stack.
    visit_quote(tree: ast.QuoteNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      let ns: NameStack;
      if (tree.snippet) {
        // A snippet quote. Resume the old environment.
        if (state.snip === null) {
          throw "error: missing snippet state";
        }
        ns = state.snip;
      } else {
        // Ordinary, independent quote. Use a new, empty name map stack.
        ns = cons(<NameMap> {}, state.ns);
      }

      // Traverse inside the quote.
      let [, t] = fold_rules.visit_quote(tree, [merge(state, {ns, snip: null}), table]);
      // Then throw away the name map stack but preserve the updated table.
      return [state, t];
    },

    // And pop on escape.
    visit_escape(tree: ast.EscapeNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      // Temporarily pop the current quote's scope.
      let ns = tl(state.ns);

      // If this is a snippet escape, preserve it for snippet quotes.
      let snip: NameStack | null = null;
      if (tree.kind === "snippet") {
        snip = state.ns;
      }

      let [_, t] = fold_rules.visit_escape(tree, [merge(state, {ns, snip}), table]);
      // Then restore the old scope and return the updated table.
      return [state, t];
    },

    // Insert extern definitions.
    visit_extern(tree: ast.ExternNode,
      [state, table]: [State, DefUseTable]):
      [State, DefUseTable]
    {
      let externs = Object.assign({}, state.externs, { [tree.name]: tree.id! });
      return [merge(state, {externs}), table];
    },
  });

  return function (tree: ast.SyntaxNode,
    [state, table]: [State, DefUseTable]):
    [State, DefUseTable]
  {
    return ast_visit(rules, tree, [state, table]);
  };
};

// Build a def/use table for lookups that links them to their corresponding
// "let" or "fun" AST nodes.
// You can provide an initial NameMap of externs (for implementing
// intrinsics).
let _find_def_use = fix(gen_find_def_use);
export function find_def_use(tree: ast.SyntaxNode, externs: NameMap): DefUseTable {
  let [_, t] = _find_def_use(tree, [{ ns: [{}], externs, snip: null }, []]);
  return t;
}
