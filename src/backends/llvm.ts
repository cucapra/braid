import * as ast from '../ast';
import { Emitter, emit } from './emitter';
import { varsym } from './emitutil';
import { ASTVisit, ast_visit, complete_visit } from '../visit';
import * as llvm from '../../node_modules/llvmc/src/wrapped';

interface LLVMEmitter extends Emitter {
	builder: llvm.Builder;
	namedValues: {[id:string] : llvm.AllocaInst};
}

let compile_rules: ASTVisit<LLVMEmitter, llvm.Value> = {
	visit_literal(tree: ast.LiteralNode, emitter: LLVMEmitter): llvm.Value {
		if (tree.type === "int")
			return llvm.ConstInt.create(<number>tree.value, llvm.Type.int32());
		else if (tree.type === "float") 
			return llvm.ConstFloat.create(<number>tree.value, llvm.Type.double());
		else if (tree.type === "string") 
			return llvm.ConstString.create(<string>tree.value, true); // Null terminate? In Context?
		else 
			throw "Unrecognized Type";
	},

	visit_seq(tree: ast.SeqNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_let(tree: ast.LetNode, emitter: LLVMEmitter): llvm.Value {
		let jsvar = varsym(tree.id!);
		throw "not implemented";
	},

	visit_assign(tree: ast.AssignNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_lookup(tree: ast.LookupNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_unary(tree: ast.UnaryNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_binary(tree: ast.BinaryNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_quote(tree: ast.QuoteNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_escape(tree: ast.EscapeNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_run(tree: ast.RunNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_fun(tree: ast.FunNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_call(tree: ast.CallNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_extern(tree: ast.ExternNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_persist(tree: ast.PersistNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_if(tree: ast.IfNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_while(tree: ast.WhileNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_macrocall(tree: ast.MacroCallNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	}
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
