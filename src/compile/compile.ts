import { ASTFold, ast_fold_rules, compose_visit, ast_visit } from '../visit';
import { fix } from '../util';
import * as ast from '../ast';
import { CompilerIR, Variant } from './ir';
import { TypeTable } from '../type_elaborate';
import { TypeMap } from '../type';
import { find_def_use } from './defuse';
import { find_scopes } from './scope';
import { lift } from './lift';
import { presplice } from './presplice';

// Find all the `extern`s in a program.
type FindExterns = ASTFold<string[]>;
function gen_find_externs(fself: FindExterns): FindExterns {
  let fold_rules = ast_fold_rules(fself);
  let rules = compose_visit(fold_rules, {
    visit_extern(tree: ast.ExternNode, externs: string[]): string[] {
      let e = externs.slice(0);
      e[tree.id!] = tree.expansion || tree.name;
      return e;
    }
  });
  return function (tree: ast.SyntaxNode, externs: string[]): string[] {
    return ast_visit(rules, tree, externs);
  };
}
let find_externs = fix(gen_find_externs);

/**
 * Semantically analyze the program to produce our mid-level IR from an
 * elaborated, desugared AST.
 *
 * @param tree          The program to compile.
 * @param type_table    The result of type elaboration.
 * @param intrinsics    Optionally, a map of built-ins to be considered
 *                      "pre-defined" for the compiler.
 * @param presplice_opt Whether to use the pre-splicing optimization for snippet
 *                      escapes.
 */
export function semantically_analyze(tree: ast.SyntaxNode,
  type_table: TypeTable,
  intrinsics: TypeMap = {},
  presplice_opt: boolean = true): CompilerIR
{
  // Give IDs to the intrinsics and add them to the type table.
  let intrinsics_map: { [key: string]: number } = {};
  for (let name in intrinsics) {
    let id = type_table.length;
    type_table[id] = [intrinsics[name], null as any];  // TODO
    intrinsics_map[name] = id;
  }

  // Use the current intrinsics to build the def/use table.
  // TODO It would be nicer if the def/use pass could just ignore the externs
  // since we find them separately, below.
  let defuse = find_def_use(tree, intrinsics_map);

  // Find the "real" externs in the program, and add the intrinsics to the
  // map.
  let externs = find_externs(tree, []);
  for (let name in intrinsics_map) {
    let id = intrinsics_map[name];
    externs[id] = name;
  }

  // Lambda- and quote-lifting.
  let containers = find_scopes(tree);
  let [procs, main, progs] = lift(tree, defuse, containers, type_table);

  // The "presplicing" optimization.
  let variants: (Variant[] | null)[];
  if (presplice_opt) {
    // Get the prespliced variants.
    variants = presplice(progs, procs);
  } else {
    variants = [];
    for (let prog of progs) {
      if (prog !== undefined) {
        // Every program has no variants.
        variants[prog.id!] = null;

        // Transform snippets into ordinary quotes.
        prog.snippet_escape = null;

        // Transform snippet *escapes* into ordinary splice escapes.
        prog.splice = prog.splice.concat(prog.snippet);
        prog.snippet = [];
        prog.owned_splice = prog.owned_splice.concat(prog.owned_snippet);
        prog.owned_snippet = [];
      }
    }

    // Do the same escape transformation for functions (procs).
    for (let proc of procs) {
      if (proc) {
        proc.splice = proc.splice.concat(proc.snippet);
        proc.snippet = [];
      }
    }
  }

  return {
    defuse,
    procs,
    progs,
    main,
    type_table,
    externs,
    containers,
    presplice_variants: variants,
  };
}
