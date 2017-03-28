import * as ast from '../ast';
import { Emitter, emit } from './emitter';
import { varsym } from './emitutil';
import { ASTVisit, ast_visit, complete_visit } from '../visit';
import { INT, FLOAT } from '../type';
import * as llvm from '../../node_modules/llvmc/src/wrapped';

interface LLVMEmitter extends Emitter {
	builder: llvm.Builder;
	namedValues: {[id:string] : llvm.Value};
}

///////////////////////////////////////////////////////////////////
// Begin Emit Functions
///////////////////////////////////////////////////////////////////

function emit_assign(emitter: Emitter, tree: ast.AssignNode, get_varsym=varsym): string {
	let defid = emitter.ir.defuse[tree.id!];
	let extern = emitter.ir.externs[defid];
	if (extern !== undefined) {
		// Extern assignment.
		return extern + " = " + paren(emit(emitter, tree.expr));
	} else {
		// Ordinary variable assignment.
		let jsvar = get_varsym(defid);
		return jsvar + " = " + paren(emit(emitter, tree.expr));
	}
}

///////////////////////////////////////////////////////////////////
// End Emit Functions
///////////////////////////////////////////////////////////////////

let compile_rules: ASTVisit<LLVMEmitter, llvm.Value> = {
	visit_literal(tree: ast.LiteralNode, emitter: LLVMEmitter): llvm.Value {
		if (tree.type === "int")
			return llvm.ConstInt.create(<number>tree.value, llvm.Type.int32());
		else if (tree.type === "float") 
			return llvm.ConstFloat.create(<number>tree.value, llvm.Type.double());
		else if (tree.type === "string") 
			return llvm.ConstString.create(<string>tree.value, true); // TODO: Null terminate? In Context?
		else 
			throw "Unrecognized Type";
	},

	visit_seq(tree: ast.SeqNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_let(tree: ast.LetNode, emitter: LLVMEmitter): llvm.Value {
		let jsvar = varsym(tree.id!);
		let val: llvm.Value; // = emit(emitter, tree.expr)
		throw "not implemented";
	},

	visit_assign(tree: ast.AssignNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_lookup(tree: ast.LookupNode, emitter: LLVMEmitter): llvm.Value {
		throw "not implemented";
	},

	visit_unary(tree: ast.UnaryNode, emitter: LLVMEmitter): llvm.Value {
		let val: llvm.Value; // = emit(emitter, tree.expr)
		let [type, _] = emitter.ir.type_table[tree.expr.id!];

		if (type === INT) {

		} else if (type === FLOAT) {

		} else {
			throw "Incompatible Operand"
		}
	},

	visit_binary(tree: ast.BinaryNode, emitter: LLVMEmitter): llvm.Value {
		let v1: llvm.Value; // = emit(emitter, tree.lhs);
		let v2: llvm.Value; // = emit(emitter, tree.rhs);
		
		let [lType, _1] = emitter.ir.type_table[tree.lhs.id!];
		let [rType, _2] = emitter.ir.type_table[tree.rhs.id!];

		if (lType === INT && rType === INT) {
			switch (tree.op) {
				case "+": {
					return emitter.builder.add(v1, v2, "addtmp");
				}
				case "*": {
					return emitter.builder.mul(v1, v2, "multmp");
				}
				default: {
					throw "Unknown bin op";
				}
			}
		} else if (lType === FLOAT && rType === FLOAT) {
			switch (tree.op) {
				case "+": {
					return emitter.builder.addf(v1, v2, "addtmp");
				}
				case "*": {
					return emitter.builder.mulf(v1, v2, "multmp");
				}
				default: {
					throw "Unknown bin op";
				}
			}
		} else if (lType === FLOAT && rType === INT) {
			// TODO
			throw "Not implemented yet"
		}
		else if (lType === INT && rType === FLOAT) {
			// TODO
			throw "Not implemented yet"
		} else {
			throw "Incompatible Operands";
		}
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
