import { SyntaxNode } from '../ast';
import { hd, tl, cons, set_add, set_diff, set_union } from '../util';
import { Prog, Proc, Scope, Variant, is_prog } from './ir';
import { ast_translate_rules, ast_visit } from '../visit';

/**
 * Given a list of N sets of values, generate the cross product of these sets.
 * That is, each array in the returned set will have length N, where the ith
 * element in the array will be one of the items of the ith input set.
 */
function cross_product<T> (sets: T[][]): T[][] {
  // Base cases.
  if (sets.length === 0) {
    return [];
  } else if (sets.length === 1) {
    let out: T[][] = [];
    for (let v of hd(sets)) {
      out.push([v]);
    }
    return out;
  }

  // Recursive case.
  let tail_product = cross_product(tl(sets));
  let out: T[][] = [];
  for (let v of hd(sets)) {
    for (let arr of tail_product) {
      out.push(cons(v, arr));
    }
  }
  return out;
}

/**
 * Replace specified subtrees (selected by ID) in an AST with new subtrees.
 */
function substitute(tree: SyntaxNode, subs: SyntaxNode[]): SyntaxNode {
  let rules = ast_translate_rules(fself);
  function fself(tree: SyntaxNode): SyntaxNode {
    if (subs[tree.id!]) {
      return subs[tree.id!];
    }
    return ast_visit(rules, tree, null);
  }
  return fself(tree);
}

/**
 * Create a single variant program with the given escape-to-quote map.
 */
function scope_variant<T extends Scope>(orig: T, config: number[],
                                        progs: Prog[]): T {
  // Copy the original program.
  let var_scope: T = Object.assign({}, orig);

  // Get a map from old (escape) IDs to new (quote body) trees. Also,
  // accumulate each selected quote's splices, persists, free variables, and
  // bound variables.
  let substitutions: SyntaxNode[] = [];
  let i = 0;
  for (let esc of orig.snippet) {
    let snippet = progs[config[i]];
    ++i;

    // Save the code substitution.
    substitutions[esc.id] = snippet.body;

    // Accumulate the metadata from the spliced code.
    var_scope.persist = set_union(orig.persist, snippet.persist);
    var_scope.splice = set_union(orig.splice, snippet.splice);
    var_scope.free = set_union(orig.free, snippet.free);
    var_scope.bound = set_union(orig.bound, snippet.bound);

    // For Progs, also transfer the *owned* lists.
    if (is_prog(orig)) {
      // I'm not sure why TypeScript gets confused here---it seems like the
      // `if` above should be enough to specialize, but apparently that
      // doesn't work on type parameters? For now, this is quite ugly.
      (var_scope as any).owned_persist =
        set_union((orig as any).owned_persist, snippet.owned_persist);
      (var_scope as any).owned_splice =
        set_union((orig as any).owned_splice, snippet.owned_splice);
    }

    // Any parameters and bound variables in the original scope are not free
    // here.
    let bound = orig.bound;
    if (!is_prog(orig)) {
      bound = set_union(bound, (var_scope as any).params);
    }
    var_scope.free = set_diff(var_scope.free, bound);

    // Adjust ownership. If an escape was previously owned by the snippet,
    // it is now owned by its splice destination.
    for (let subescs of [var_scope.persist, var_scope.splice]) {
      for (let subesc of subescs) {
        if (subesc.owner === snippet.id) {
          subesc.owner = orig.id!;
        }
        if (subesc.container === snippet.id) {
          subesc.container = orig.id!;
        }
      }
    }
  }

  // Generate the program body using these substitutions.
  var_scope.body = substitute(orig.body, substitutions);

  return var_scope;
}

/**
 * Compute all the possible Variants for a given program. If the program has
 * no snippet splices, the result is `null` (rather than a single variant) to
 * indicate that backends should not do variant selection.
 */
function get_variants(progs: Prog[], procs: Proc[], prog: Prog): Variant[] | null {
  // Get the space of possible options for each snippet escape.
  let options: number[][] = [];
  let i = 0;
  for (let esc of prog.owned_snippet) {
    let esc_options: number[] = [];
    options[i] = esc_options;
    ++i;

    // Find all the snippet quotes corresponding to this snippet escape.
    for (let other_prog of progs) {
      if (other_prog !== undefined) {
        if (other_prog.snippet_escape === esc.id) {
          esc_options.push(other_prog.id!);
        }
      }
    }
  }

  // No snippet escapes? Then the variant list is null.
  if (options.length === 0) {
    return null;
  }

  // The configurations are lists of resolutions (i.e., quote IDs) for each
  // snippet escape in a program. Next, we use these mappings to create a new
  // syntax tree that makes these replacements, substituting old escape nodes
  // for new subtrees from their selected quotes.
  let out: Variant[] = [];
  for (let config of cross_product(options)) {
    // Create a new Variant object.
    let variant: Variant = {
      progid: prog.id!,
      config,
      progs: [],
      procs: [],
    };

    // For every snippet escape resolved in this variant, we'll need to
    // specialize its directly-containing quote.
    let specialized_progs: number[] = [];
    let specialized_procs: number[] = [];
    for (let esc of prog.owned_snippet) {
      if (progs[esc.container]) {
        specialized_progs = set_add(specialized_progs, esc.container);
      } else {
        specialized_procs = set_add(specialized_procs, esc.container);
      }
    }
    for (let id of specialized_progs) {
      variant.progs[id] = scope_variant(progs[id], config, progs);
    }
    for (let id of specialized_procs) {
      variant.procs[id] = scope_variant(procs[id], config, progs);
    }

    // Newly free variables "trickle" up to the parent scope. This is an
    // incomplete point solution; pre-splicing should probably use a cleaner
    // strategy to re-attribute variables.
    let trickle_free = function(id: any, newly_free: number[]) {
      let parent_id = (variant.progs[id] || variant.procs[id]).parent;
      if (parent_id !== null) {
        // Get or create the parent variant.
        let parent: Scope = variant.progs[parent_id] ||
          variant.procs[parent_id];
        if (!parent) {
          if (procs[parent_id]) {
            let old_parent = procs[parent_id];
            variant.procs[parent_id] = parent = Object.assign({}, old_parent);
          } else {
            let old_parent = progs[parent_id];
            variant.progs[parent_id] = parent = Object.assign({}, old_parent);
          }
        }

        // Add free variables to the parent.
        let bound = parent.bound;
        if (!is_prog(parent)) {
          bound = set_union(bound, (parent as Proc).params);
        }
        let parent_newly_free = set_diff(newly_free, bound);
        if (parent_newly_free.length) {
          parent.free = set_union(parent.free, parent_newly_free);

          // Recurse.
          trickle_free(parent.id, parent_newly_free);
        }
      }
    };
    for (let id in variant.progs) {
      let old_prog = progs[id];
      let new_prog = variant.progs[id];
      let newly_free = set_diff(new_prog.free, old_prog.free);
      if (newly_free.length) {
        trickle_free(id, newly_free);
      }
    }

    out.push(variant);
  }
  return out;
}

/**
 * Get the sets of variants for all programs.
 */
export function presplice(progs: Prog[], procs: Proc[]): (Variant[] | null)[] {
  let variants: (Variant[] | null)[] = [];
  for (let prog of progs) {
    if (prog !== undefined) {
      variants[prog.id!] = get_variants(progs, procs, prog);
    }
  }
  return variants;
}
