/**
 * The base infrastructure for compiler backends. There is an Emitter
 * structure that collects together the entry points and state of a backend,
 * and several utility functions that help invoke those entry points.
 */

import { SyntaxNode } from '../ast';
import { Proc, Prog, CompilerIR, Variant } from '../compile/ir';

/**
 * A structure specifying a code-generation backend and its state.
 *
 * An Emitter contains the current program being generated along with the
 * functions that produce code a for a certain backend. For the most part,
 * clients do not invoke the `emit_` functions on Emitter directly; they
 * instead use the wrapper utilities defined elsewhere in this module.
 */
export interface Emitter {
  /**
   * The program we're compiling.
   */
  ir: CompilerIR;

  /**
   * The core code-emission function for expressions.
   */
  emit_expr: (tree: SyntaxNode, emitter: Emitter) => string;

  /**
   * Compile a Proc (lifted function).
   */
  emit_proc: (emitter: Emitter, proc: Proc) => string;

  /**
   * Compile a Prog (lifted quote) without variants.
   */
  emit_prog: (emitter: Emitter, prog: Prog) => string;

  /**
   * Compile a Prog's variant.
   */
  emit_prog_variant: (emitter: Emitter, variant: Variant, prog: Prog) => string;

  /**
   * The current variant we're compiling (if any).
   */
  variant: Variant | null;
}

/**
 * Compile the main function.
 */
export function emit_main(emitter: Emitter) {
  return emitter.emit_proc(emitter, emitter.ir.main);
}

/**
 * Get the current specialized version of a program, according to the
 * emitter's current variant.
 */
export function specialized_prog(emitter: Emitter, progid: number) {
  let variant = emitter.variant;
  if (!variant) {
    return emitter.ir.progs[progid];
  }
  return variant.progs[progid] || emitter.ir.progs[progid];
}

/**
 * Get the current specialized version of a function.
 */
export function specialized_proc(emitter: Emitter, procid: number) {
  let variant = emitter.variant;
  if (!variant) {
    return emitter.ir.procs[procid];
  }
  return variant.procs[procid] || emitter.ir.procs[procid];
}

/**
 * Emit a `Prog`, either single- or multi-variant.
 */
function emit_prog(emitter: Emitter, prog: Prog) {
  if (prog.snippet_escape !== null) {
    // Do not emit snippets separately.
    return "";
  }

  // Check for variants. If there are none, just emit a single program.
  let variants = emitter.ir.presplice_variants[prog.id!];
  if (variants === null) {
    return emitter.emit_prog(emitter, prog);
  }

  // Multiple variants. Compile each.
  let out = "";
  for (let variant of variants) {
    let subemitter = Object.assign({}, emitter);
    subemitter.variant = variant;
    out += emitter.emit_prog_variant(
      subemitter, variant, specialized_prog(subemitter, variant.progid)
    );
  }
  return out;
}

/**
 * Emit either kind of scope.
 */
export function emit_scope(emitter: Emitter, scope: number) {
  // Try a Proc.
  let proc = specialized_proc(emitter, scope);
  if (proc) {
    return emitter.emit_proc(emitter, proc);
  }

  // Try a Prog.
  let prog = specialized_prog(emitter, scope);
  if (prog) {
    return emit_prog(emitter, prog);
  }

  throw "error: unknown scope id";
}

/**
 * Generate code for an expression.
 */
export function emit(emitter: Emitter, tree: SyntaxNode) {
  return emitter.emit_expr(tree, emitter);
}
