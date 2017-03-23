import * as ast from '../ast';
import { Emitter, emit } from './emitter';
import { ASTVisit, ast_visit, complete_visit } from '../visit';

interface LLVMEmitter extends Emitter {
  builder: llvm.Builder;
}

let compile_rules: ASTVisit<LLVMEmitter, llvm.Value> = {
  visit_literal(tree: ast.LiteralNode, emitter: LLVMEmitter): llvm.Value {
    emitter.builder.buildLiteral();
  },
};

export function compile(tree: ast.SyntaxNode, emitter: LLVMEmitter): string {
  return ast_visit(compile_rules, tree, emitter);
}

// Compile the IR to a complete JavaScript program.
export function codegen(ir: CompilerIR): string {
  let emitter: LLVMEmitter = {
    ir: ir,
    compile: compile,
    emit_proc: emit_proc,
    emit_prog: emit_prog,
    emit_prog_variant: emit_prog_variant,
    variant: null,
    builder: null,
  };

  // Emit and invoke the main (anonymous) function.
  return emit_main_wrapper(emit_main(emitter));
}
