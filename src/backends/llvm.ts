import * as ast from '../ast';
import { ASTVisit, ast_visit, complete_visit } from '../visit';
import { INT, FLOAT, Type, OverloadedType, FunType } from '../type';
import { Proc, Prog, Variant, CompilerIR } from '../compile/ir'
import * as llvm from '../../node_modules/llvmc/src/wrapped';
import { varsym, is_fun_type, useful_pred } from './emitutil';

///////////////////////////////////////////////////////////////////
// Begin Emit Functions & Redundant Funcs
///////////////////////////////////////////////////////////////////

/**
 * Like `emitter.Emitter`, but for generating LLVM code instead of strings.
 */
interface LLVMEmitter {
  /**
   * The LLVM IRBuilder object used to generate code.
   */
  builder: llvm.Builder;

  /**
   * Map from id's to Alloca ptr's
   */
  namedValues: {[id:string] : llvm.Value};

  /**
   * Program we are compiling
   */
  ir: CompilerIR;

  // These are copies of `emitter.Emitter`'s `emit_` functions, except for
  // generating LLVM IR constructs.
  emit_expr: (tree: ast.SyntaxNode, emitter: LLVMEmitter) => llvm.Value;
  //emit_proc: (emitter: LLVMEmitter, proc: Proc) => llvm.Value;
  //emit_prog: (emitter: LLVMEmitter, prog: Prog) => llvm.Value;
  //emit_prog_variant: (emitter: LLVMEmitter, variant: Variant, prog: Prog) => llvm.Value;
  //variant: Variant|null;
}

function emit_seq(emitter: LLVMEmitter, seq: ast.SeqNode, pred: (_: ast.ExpressionNode) => boolean = useful_pred): llvm.Value {
  if (pred(seq.lhs))
    emit(emitter, seq.lhs);
  return emit(emitter, seq.rhs);
}

function emit_let(emitter: LLVMEmitter, tree: ast.LetNode): llvm.Value {
  // Get variable name and value
  let jsvar: string = varsym(tree.id!);
  let val: llvm.Value = emit(emitter, tree.expr);
  
  // Get variable type
  let [type, _] = emitter.ir.type_table[tree.expr.id!];
  let llvmType: llvm.Type;
  if (type === INT)
    llvmType = llvm.Type.int32();
  else if (type === FLOAT)
    llvmType = llvm.Type.double();
  else
    throw "unknown type";

  // Create alloca for variable and store ptr in namedValues
  let ptr: llvm.Value = create_entry_block_alloca(emitter.builder.getInsertBlock().getParent(), llvmType, jsvar);
  emitter.namedValues[jsvar] = ptr;

  // Store and return value
  emitter.builder.buildStore(val, ptr);
  return val;
}

function emit_assign(emitter: LLVMEmitter, tree: ast.AssignNode, get_varsym=varsym): llvm.Value {
  let defid = emitter.ir.defuse[tree.id!];
  let extern = emitter.ir.externs[defid];

  if (extern !== undefined) {
    // Extern assignment.
    // TODO
    throw "not implemented yet";
  } else {
    // Ordinary variable assignment.
    let jsvar: string = get_varsym(defid);
    let val: llvm.Value = emit(emitter, tree.expr)
    
    // get pointer to stack location
    if (!emitter.namedValues.hasOwnProperty(jsvar))
      throw "Unknown variable name";
    let ptr: llvm.Value = emitter.namedValues[jsvar];

    // store new value and return this value
    emitter.builder.buildStore(val, ptr);
    return val;
  }
}

function emit_lookup(emitter: LLVMEmitter, emit_extern: (name: string, type: Type) => llvm.Value, tree: ast.LookupNode, get_varsym=varsym): llvm.Value {
  let defid = emitter.ir.defuse[tree.id!];
  let name = emitter.ir.externs[defid];

  if (name !== undefined) {
    // extern
    let [type, _] = emitter.ir.type_table[tree.id!];
    return emit_extern(name, type);
  } else {
    // An ordinary variable lookup
    let id = get_varsym(defid);

    // look up the pointer
    if (!emitter.namedValues.hasOwnProperty(id))
      throw "Unknown variable name";
    let ptr: llvm.Value = emitter.namedValues[id];

    // load value
    return emitter.builder.buildLoad(ptr, id);
  }
}

function emit_extern(name: string, type: Type): llvm.Value {
  if (is_fun_type(type)) {
    // The extern is a function. Wrap it in the clothing of our closure
    // format (with no environment).
    // TODO
    throw "not implemented"
  } else {
    // An ordinary value. Just look it up by name.
    // TODO
    throw "not implemented"
  }
}

// mostly a copy of emitter function
function emit(emitter: LLVMEmitter, tree: ast.SyntaxNode): llvm.Value {
  return emitter.emit_expr(tree, emitter);
}

///////////////////////////////////////////////////////////////////
// End Emit Functions & Redundant Funcs
///////////////////////////////////////////////////////////////////

/**
 * Create an alloca with the provided name in the entry block of the provided function
 */
function create_entry_block_alloca(func: llvm.Function, type: llvm.Type, name: string): llvm.Value {
  // create builder and position after func's first instruction
  let builder: llvm.Builder = llvm.Builder.create();
  let bb: llvm.BasicBlock = func.getEntryBlock();
  let instr: llvm.Value = bb.getFirstInstr();
  builder.positionAfter(bb, instr);

  // create alloca
  return builder.buildAlloca(type, name);
}

/**
 * Core recursive compile rules
 */
let compile_rules: ASTVisit<LLVMEmitter, llvm.Value> = {
  visit_literal(tree: ast.LiteralNode, emitter: LLVMEmitter): llvm.Value {
    if (tree.type === "int")
      return llvm.ConstInt.create(<number>tree.value, llvm.Type.int32());
    else if (tree.type === "float")
      return llvm.ConstFloat.create(<number>tree.value, llvm.Type.double());
    else if (tree.type === "string")
      return llvm.ConstString.create(<string>tree.value, false);
    else
      throw "Unrecognized Type";
  },

  visit_seq(tree: ast.SeqNode, emitter: LLVMEmitter): llvm.Value {
    return emit_seq(emitter, tree);
  },

  visit_let(tree: ast.LetNode, emitter: LLVMEmitter): llvm.Value {
    return emit_let(emitter, tree);
  },

  visit_assign(tree: ast.AssignNode, emitter: LLVMEmitter): llvm.Value {
    return emit_assign(emitter, tree);
  },

  visit_lookup(tree: ast.LookupNode, emitter: LLVMEmitter): llvm.Value {
    return emit_lookup(emitter, emit_extern, tree);
  },

  visit_unary(tree: ast.UnaryNode, emitter: LLVMEmitter): llvm.Value {
    let val: llvm.Value = emit(emitter, tree.expr)
    let [type, _] = emitter.ir.type_table[tree.expr.id!];

    if (type === INT) {
      if (tree.op === "-")
        return emitter.builder.neg(val, "negtmp");
      else
        throw "Unknown unary op"
    } else if (type === FLOAT) {
      if (tree.op === "-")
        return emitter.builder.negf(val, "negtmp");
      else
        throw "Unknown unary op"
    } else {
      throw "Incompatible Operand"
    }
  },

  visit_binary(tree: ast.BinaryNode, emitter: LLVMEmitter): llvm.Value {
    let lVal: llvm.Value = emit(emitter, tree.lhs);
    let rVal: llvm.Value = emit(emitter, tree.rhs);

    let [lType, _1] = emitter.ir.type_table[tree.lhs.id!];
    let [rType, _2] = emitter.ir.type_table[tree.rhs.id!];

    if (lType === INT && rType === INT) {
      // both operands are ints, so do integer operation
      switch (tree.op) {
        case "+": {
          return emitter.builder.add(lVal, rVal, "addtmp");
        }
        case "*": {
          return emitter.builder.mul(lVal, rVal, "multmp");
        }
        default: {
          throw "Unknown bin op";
        }
      }
    } else if ((lType !== FLOAT && lType !== INT) || (rType !== FLOAT && rType !== INT)) {
      // at least one operand is neither an int nor a float, so throw error
      throw "Incompatible Operands";
    } else {
      // at least one operand is a float, and the other is either a float or an int
      // perform casts if needed, and us float operation
      if (lType !== FLOAT)
        lVal = emitter.builder.buildSIToFP(lVal, llvm.Type.double(), "lCast");
      if (rType !== FLOAT)
        rVal = emitter.builder.buildSIToFP(rVal, llvm.Type.double(), "lCast");
      
      switch (tree.op) {
        case "+": {
          return emitter.builder.addf(lVal, rVal, "addtmp");
        }
        case "*": {
          return emitter.builder.mulf(lVal, rVal, "multmp");
        }
        default: {
          throw "Unknown bin op";
        }
      }
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

function emit_proc() {

}

function emit_prog() {

}

function emit_prog_variant() {

}

// Compile the IR to a complete JavaScript program.
export function codegen(ir: CompilerIR): llvm.Value {
  let emitter: LLVMEmitter = {
    ir: ir,
    builder: llvm.Builder.create(),
    namedValues: {},
    emit_expr: (tree: ast.SyntaxNode, emitter: LLVMEmitter) => ast_visit(compile_rules, tree, emitter),
    //emit_proc: emit_proc,
    //emit_prog: emit_prog,
    //emit_prog_variant: emit_prog_variant,
    //variant: null,
  };

  // Emit and invoke the main (anonymous) function.
  return emit_main(emitter);
}

function emit_main(emitter: LLVMEmitter): llvm.Value { 
  // get return type
  let [type, _] = emitter.ir.type_table[emitter.ir.main.body.id!]
  let llvmType: llvm.Type;
  if (type === INT)
    llvmType = llvm.Type.int32();
  else if (type === FLOAT)
    llvmType = llvm.Type.double();
  else
    throw "Unknown type";

  // construct module
  let mod: llvm.Module = llvm.Module.create("some_module");

  // construct wrapper func
  let funcType: llvm.FunctionType = llvm.FunctionType.create(llvmType, []);
  let main: llvm.Function = mod.addFunction("main", funcType);
  let entry: llvm.BasicBlock = main.appendBasicBlock("entry");
  emitter.builder.positionAtEnd(entry);

  // emit body
  let body: llvm.Value = emit(emitter, emitter.ir.main.body);
  emitter.builder.ret(body);

  console.log(mod.toString());

  emitter.builder.free();
  mod.free();
  return main;
}
