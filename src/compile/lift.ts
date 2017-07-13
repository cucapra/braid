import * as ast from '../ast';
import { Gen, fix, set_add } from '../util';
import { ASTFold, ast_fold_rules, compose_visit, ast_visit } from '../visit';
import { TypeTable } from '../type_elaborate';
import { Scope, Prog, Proc, Escape, DefUseTable } from './ir';
import { CodeType } from '../type';

// A simple, imperative walk that indexes *all* the syntax nodes in a tree by
// their ID. We use this to build Procs and Progs by looking up the
// corresponding quote, function, and escape nodes.

type IndexTree = ASTFold<void>;
function gen_index_tree(table: ast.SyntaxNode[]): Gen<IndexTree> {
  return function(fself: IndexTree): IndexTree {
    let fold_rules = ast_fold_rules(fself);
    let rules = compose_visit(fold_rules, {
      visit_fun(tree: ast.FunNode, p: void): void
      {
        // Visit the parameters (not expressions).
        for (let param of tree.params) {
          table[param.id!] = param;
        }
        return fold_rules.visit_fun(tree, undefined);
      },
    });

    return function (tree: ast.SyntaxNode, p: void): void
    {
      table[tree.id!] = tree;
      return ast_visit(rules, tree, null);
    };
  };
}

function index_tree(tree: ast.SyntaxNode): ast.SyntaxNode[] {
  let table: ast.ExpressionNode[] = [];
  let _index_tree = fix(gen_index_tree(table));
  _index_tree(tree, undefined);
  return table;
}


// Find the snippet escape ID for every snippet quote. This is recorded in the
// type, so we just reuse that.

type AssocSnippets = ASTFold<number[]>;
function gen_assoc_snippets(type_table: TypeTable): Gen<AssocSnippets> {
  return function (fself: AssocSnippets): AssocSnippets {
    let fold_rules = ast_fold_rules(fself);
    let rules = compose_visit(fold_rules, {
      visit_quote(tree: ast.QuoteNode, escids: number[]): number[]
      {
        let ei = fold_rules.visit_quote(tree, escids);
        if (tree.snippet) {
          ei = ei.slice(0);
          let [t] = type_table[tree.id!];
          if (t instanceof CodeType) {
            if (t.snippet === null) {
              throw "error: snippet quote without snippet ID";
            }
            ei[tree.id!] = t.snippet;
          } else {
            throw "error: quote without code type";
          }
        }
        return ei;
      },
    });

    return function (tree: ast.SyntaxNode, escids: number[]): number[] {
      return ast_visit(rules, tree, escids);
    };
  };
}

function assoc_snippets(tree: ast.SyntaxNode, type_table: TypeTable): number[] {
  let _assoc_snippets = fix(gen_assoc_snippets(type_table));
  return _assoc_snippets(tree, []);
}


// A few AST type tests we'll need.

function _is_quote(tree: ast.SyntaxNode): tree is ast.QuoteNode {
  return tree.tag === "quote";
}

function _is_fun(tree: ast.SyntaxNode): tree is ast.FunNode {
  return tree.tag === "fun";
}

function _is_escape(tree: ast.SyntaxNode): tree is ast.EscapeNode {
  return tree.tag === "escape";
}

function _is_let(tree: ast.SyntaxNode): tree is ast.EscapeNode {
  return tree.tag === "let";
}

// Construct mostly-empty Procs and Progs from an indexed tree. Return:
// - the function table (Procs)
// - the main Proc
// - the program table (Progs)
// - a combined table containing both Procs and Progs
function skeleton_scopes(tree: ast.SyntaxNode, containers: number[],
  index: ast.SyntaxNode[], snippet_escs: number[]):
  [Proc[], Proc, Prog[], Scope[]]
{
  let procs: Proc[] = [];
  let progs: Prog[] = [];
  let scopes: Scope[] = [];
  for (let node of index) {
    if (node !== undefined) {
      if (_is_quote(node) || _is_fun(node)) {
        // Common data for any scope.
        let parent = containers[node.id!];
        let scope: Scope = {
          id: node.id!,
          body: _is_quote(node) ? node.expr : (node as ast.FunNode).body,

          free: [],
          bound: [],
          persist: [],
          splice: [],
          snippet: [],

          parent: parent,
          children: [],
          quote_parent: _nearest_quote(containers, progs, parent),
          quote_children: [],
        };

        // Quote (Prog) specifics.
        if (_is_quote(node)) {
          let prog: Prog = Object.assign(scope, {
            annotation: node.annotation,
            owned_persist: [],
            owned_splice: [],
            owned_snippet: [],
            snippet_escape: node.snippet ? snippet_escs[node.id!] : null,
          });
          progs[node.id!] = prog;
          scopes[node.id!] = prog;

        // Function (Proc) specifics.
        } else if (_is_fun(node)) {
          // In Python, [p.id for p in params].
          let param_ids: number[] = [];
          for (let param of node.params) {
            param_ids.push(param.id!);
          }

          let proc: Proc = Object.assign(scope, {
            params: param_ids,
          });
          procs[node.id!] = proc;
          scopes[node.id!] = proc;
        }
      }
    }
  }

  // And an empty "main" proc for the top-level scope.
  let main: Proc = {
    id: null,
    body: tree,
    params: [],

    free: [],
    bound: [],
    persist: [],
    splice: [],
    snippet: [],

    parent: null,
    children: [],
    quote_parent: null,
    quote_children: [],
  };

  return [procs, main, progs, scopes];
}

/**
 * Find the nearest containing scope that is a quote. The search is inclusive,
 * so if the scope is already a quote, it is returned.
 */
function _nearest_quote(containers: number[], progs: Prog[],
    where: number): number | null {
  if (where === null) {
    return null;
  } else if (progs[where] !== undefined) {
    return where;
  } else {
    return _nearest_quote(containers, progs, containers[where]);
  }
}

/**
 * Like `_nearest_quote`, but looks *n* levels up instead of just 1.
 */
function _nearest_quote_n(containers: number[], progs: Prog[], where: number | null,
                          count: number) {
  for (let i = 0; i < count; ++i) {
    where = _nearest_quote(containers, progs, containers[where!]);
  }
  return where;
}

// Assign children of the skeletal scopes.
function assign_children(scopes: Scope[], main: Proc, progs: Prog[],
    containers: number[])
{
  // Attribute each scope as a child of its parent.
  for (let scope of scopes) {
    if (scope !== undefined) {
      // Nearest scope of either kind.
      let parent_scope = scope.parent === null ? main :
        scopes[scope.parent];
      parent_scope.children.push(scope.id!);

      // Nearest quote.
      let parent_quote = scope.quote_parent === null ? main :
        progs[scope.quote_parent];
      parent_quote.quote_children.push(scope.id!);
    }
  }
}

// Attribute variables definitions and uses to scopes' bound and free
// variables, respectively.
function attribute_uses(scopes: Scope[], progs: Prog[], containers: number[],
    defuse: DefUseTable, index: ast.SyntaxNode[])
{
  for (let use_id in defuse) {
    let def_id = defuse[use_id];

    // Get the defining scope, or ignore if it's an intrinsic.
    let def_scope_id = containers[def_id];
    if (def_scope_id === undefined) {
      continue;
    }

    // Also ignore externs.
    if (index[def_id].tag === "extern") {
      continue;
    }

    // Walk the scopes upward from the use location. We are *free* in every
    // scope until our defining scope.
    let cur_scope = containers[use_id];
    while (cur_scope !== def_scope_id && cur_scope !== null) {
      // First, try traversing from snippet escapes to their owners. If the
      // variable was defined in a different quote that's part of the same
      // "snippet aggregate" as this one, it is *not* a free variable here.
      let cur_prog = cur_scope;
      let found_via_snippet = false;
      while (1) {
        let prog = progs[cur_prog];
        if (prog === undefined || prog.snippet_escape === null) {
          break;
        }
        cur_prog = _nearest_quote(containers, progs, prog.snippet_escape)!;
        if (cur_prog === def_scope_id) {
          found_via_snippet = true;
          break;
        }
      }
      if (found_via_snippet) {
        break;
      }

      // Mark the variable as free here.
      let scope = scopes[cur_scope];
      scope.free = set_add(scope.free, def_id);

      // Move up by one scope.
      cur_scope = containers[cur_scope];
    }
  }
}

// Attribute variables definitions and uses to scopes' bound variable sets.
function attribute_defs(scopes: Scope[], main: Proc, containers: number[],
    index: ast.SyntaxNode[])
{
  for (let node of index) {
    if (node !== undefined) {
      if (_is_let(node)) {
        let def_scope_id = containers[node.id!];
        let def_scope = def_scope_id === null ? main : scopes[def_scope_id];
        def_scope.bound = set_add(def_scope.bound, node.id!);
      }
    }
  }
}

// Finally, attribute every escape to its containing quote and every function
// in between.
function attribute_escapes(scopes: Scope[], progs: Prog[],
    containers: number[], index: ast.SyntaxNode[])
{
  for (let node of index) {
    if (node !== undefined) {
      if (_is_escape(node)) {
        // Get the quote that "owns" this escape: this is the quote that is N
        // steps up the quote containment chain, where N is the "level" of the
        // escape.
        let quote_id = _nearest_quote_n(containers, progs, node.id!,
                                        node.count)!;

        let esc: Escape = {
          id: node.id!,
          body: node.expr,
          count: node.count,
          owner: quote_id,
          container: containers[node.id!],
        };

        // Attribute the unique "owner" of this escape.
        if (node.kind === "persist") {
          progs[quote_id].owned_persist.push(esc);
        } else if (node.kind === "splice") {
          progs[quote_id].owned_splice.push(esc);
        } else if (node.kind === "snippet") {
          progs[quote_id].owned_snippet.push(esc);
        } else {
          throw "error: unknown escape kind";
        }

        // Iterate through all the scopes from here to the relevant next
        // quote. This makes all the intervening functions inside the quote
        // aware that there's an escape in their body, which can work like a
        // free variable. In the case of multi-level escapes, this can also
        // affect quotes.
        let cur_scope = containers[node.id!];
        while (1) {
          if (node.kind === "persist") {
            scopes[cur_scope].persist.push(esc);
          } else if (node.kind === "splice") {
            scopes[cur_scope].splice.push(esc);
          } else if (node.kind === "snippet") {
            scopes[cur_scope].snippet.push(esc);
          } else {
            throw "error: unknown escape kind";
          }

          // Proceed to parent.
          if (cur_scope === quote_id) {
            break;
          }
          cur_scope = containers[cur_scope];
        }
      }
    }
  }
}

export function lift(tree: ast.SyntaxNode, defuse: DefUseTable, containers: number[],
  type_table: TypeTable):
  [Proc[], Proc, Prog[]]
{
  let index = index_tree(tree);
  let snippet_escs = assoc_snippets(tree, type_table);

  // Construct "empty" Proc and Prog nodes.
  let [procs, main, progs, scopes] =
    skeleton_scopes(tree, containers, index, snippet_escs);

  // Fill in children.
  assign_children(scopes, main, progs, containers);

  // Fill in free and bound variables.
  attribute_uses(scopes, progs, containers, defuse, index);
  attribute_defs(scopes, main, containers, index);

  // Fill in the escapes (`persist` and `splice`).
  attribute_escapes(scopes, progs, containers, index);

  return [procs, main, progs];
}
