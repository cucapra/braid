import * as ast from '../ast';
import { ASTVisit, ast_visit, complete_visit } from '../visit';
import { INT, FLOAT, Type, OverloadedType, FunType } from '../type';
import { Proc, Prog, Variant, Scope, CompilerIR } from '../compile/ir'
import * as llvm from 'llvmc';
import { varsym, persistsym, procsym, is_fun_type, useful_pred } from './emitutil';

/**
 * Export the LLVM Module type, which is the result of LLVM compilation.
 */
export type Module = llvm.Module;

///////////////////////////////////////////////////////////////////
// Begin Emit Functions & Redundant Funcs
///////////////////////////////////////////////////////////////////

/**
 * Like `emitter.Emitter`, but for generating LLVM code instead of strings.
 */
export interface LLVMEmitter {
  /**
   * LLVM Module object
   */
  mod: llvm.Module;

  /**
   * The LLVM IRBuilder object used to generate code.
   */
  builder: llvm.Builder;

  /**
   * Map from id's to Alloca ptr's
   */
  named_values: llvm.Value[];

  /**
   * Program we are compiling
   */
  ir: CompilerIR;

  // These are copies of `emitter.Emitter`'s `emit_` functions, except for
  // generating LLVM IR constructs.
  emit_expr: (tree: ast.SyntaxNode, emitter: LLVMEmitter) => llvm.Value;
  emit_proc: (emitter: LLVMEmitter, proc: Proc) => llvm.Value;
  //emit_prog: (emitter: LLVMEmitter, prog: Prog) => llvm.Value;
  //emit_prog_variant: (emitter: LLVMEmitter, variant: Variant, prog: Prog) => llvm.Value;
  variant: Variant|null;
}

function emit_seq(emitter: LLVMEmitter, seq: ast.SeqNode, pred: (_: ast.ExpressionNode) => boolean = useful_pred): llvm.Value {
  if (pred(seq.lhs))
    emit(emitter, seq.lhs);
  return emit(emitter, seq.rhs);
}

function emit_let(emitter: LLVMEmitter, tree: ast.LetNode): llvm.Value {
  return assignment_helper(emitter, emit(emitter, tree.expr), tree.id!);
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
    return assignment_helper(emitter, emit(emitter, tree.expr), defid);
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
    let id = varsym(defid);

    // look up the pointer
    if (emitter.named_values[defid] === undefined)
      throw "Unknown variable name (lookup)";
    let ptr: llvm.Value = emitter.named_values[defid];

    // load value
    return emitter.builder.buildLoad(ptr, id);
  }
}

function emit_func(emitter: LLVMEmitter, tree: ast.FunNode): llvm.Value {
  // get function
  let func: llvm.Function = emitter.mod.getFunction(procsym(tree.id!));

  // get proc corresponding to provided FunNode
  let func_as_proc: Proc = emitter.ir.procs[tree.id!];

  // construct pointer to func
  let _func_type: [llvm.Type, llvm.Type[]] = get_func_type(emitter, func_as_proc.body.id!, func_as_proc.params);
  let func_type: llvm.FunctionType = llvm.FunctionType.create(_func_type[0], _func_type[1]);
  //let func_ptrptr: llvm.Value = emitter.builder.buildAlloca(llvm.PointerType.create(func_type, 0), "funcptrptr");
  //let func_ptr: llvm.Value = emitter.builder.buildLoad(func_ptrptr, "funcptr");


  // get values/types of free vars
  let free_ids: number[] = emitter.ir.procs[tree.id!].free;
  let free_vals: llvm.Value[] = [];
  let free_types: llvm.Type[] = [];
  for (let id of free_ids) {
    free_vals.push(emitter.builder.buildLoad(emitter.named_values[id], ""));
    free_types.push(llvm_type(emitter.ir.type_table[id][0]));
  }

  // build an environment structure that wraps around free vals
  let env_type: llvm.StructType = llvm.StructType.create(free_types, true);
  var env_struct: llvm.Value = llvm.Value.getUndef(env_type);

  for (let i = 0; i < free_ids.length; i++) {
    env_struct = emitter.builder.buildInsertValue(env_struct, free_vals[i], i, "");
  }
  let env_struct_ptr: llvm.Value = emitter.builder.buildAlloca(env_type, "envptr");
  emitter.builder.buildStore(env_struct, env_struct_ptr);

  let hidden_env_type: llvm.Type = llvm.PointerType.create(llvm.IntType.int8(), 0);
  let env_ptr: llvm.Value = emitter.builder.buildBitCast(env_struct_ptr, hidden_env_type, "envptr_hidden");

  // The function captures its closed-over references and any persists
  // used inside.
  for (let p of emitter.ir.procs[tree.id!].persist) {
    throw "persists not implemented yet"
  }

  let func_ptr_type: llvm.Type = llvm.PointerType.create(func_type, 0);
  let closure_type: llvm.Type = llvm.StructType.create([func_ptr_type, hidden_env_type] , true);
  var closure: llvm.Value = llvm.Value.getUndef(closure_type);
  closure = emitter.builder.buildInsertValue(closure, func, 0, "");
  closure = emitter.builder.buildInsertValue(closure, env_ptr, 1, "");

  // return struct that wraps the function and its environment
  return closure;
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

function emit_fun(emitter: LLVMEmitter, name: string, arg_ids: number[], free_ids: number[], local_ids: number[], body: ast.ExpressionNode): llvm.Value {
  // create function
  let _func_type: [llvm.Type, llvm.Type[]] = get_func_type(emitter, body.id!, arg_ids);
  let func_type: llvm.FunctionType = llvm.FunctionType.create(_func_type[0], _func_type[1]);
  let func: llvm.Function = emitter.mod.addFunction(name, func_type);

  // create builder & entry block for func
  let bb: llvm.BasicBlock = func.appendBasicBlock("entry");
  let new_builder: llvm.Builder = llvm.Builder.create();
  new_builder.positionAtEnd(bb);

  // save old builder & reset
  let old_builder: llvm.Builder = emitter.builder;
  emitter.builder = new_builder;

  // save old namedValues map & reset
  let old_named_values: llvm.Value[] = emitter.named_values
  emitter.named_values = [];

  // make allocas for args
  for (let i = 0; i < arg_ids.length; i++) {
    // get arg id & type
    let id: number = arg_ids[i]
    let type:llvm.Type = _func_type[1][i];

    // create alloca
    let ptr: llvm.Value = emitter.builder.buildAlloca(type, varsym(id));
    emitter.builder.buildStore(func.getParam(i), ptr);
    emitter.named_values[id] = ptr;
  }

  // get evironment struct type
  let free_types: llvm.Type[] = [];
  for (let id of free_ids) {
    let type: llvm.Type = llvm_type(emitter.ir.type_table[id][0]);
    free_types.push(type);
  }

  let env_ptr_type: llvm.Type = llvm.PointerType.create(llvm.StructType.create(free_types, true), 0);

  // get ptr to environment struct
  let env_ptr_uncasted: llvm.Value = func.getParam(arg_ids.length);
  let env_ptr: llvm.Value = emitter.builder.buildBitCast(env_ptr_uncasted, env_ptr_type, "");

  for (let i = 0; i < free_ids.length; i++) {
    // get id and type
    let id: number = free_ids[i];
    let type: llvm.Type = free_types[i];

    // build alloca
    let ptr: llvm.Value = emitter.builder.buildAlloca(type, varsym(id));

    // get the element in the struct that we want
    let struct_elem_ptr: llvm.Value = emitter.builder.buildStructGEP(env_ptr, i, "");
    let elem: llvm.Value = emitter.builder.buildLoad(struct_elem_ptr, "");

    // store the element in the alloca
    emitter.builder.buildStore(elem, ptr);
    emitter.named_values[id] = ptr;
  }

  // make allocas for local vars
  for (let id of local_ids) {
    // get type
    let type: llvm.Type = llvm_type(emitter.ir.type_table[id][0]);

    // create alloca
    let ptr: llvm.Value = emitter.builder.buildAlloca(type, varsym(id));
    emitter.named_values[id] = ptr;
  }

  // generate body
  let body_val: llvm.Value = emit(emitter, body);
  emitter.builder.ret(body_val);

  // reset saved things
  emitter.builder.free();
  emitter.builder = old_builder;
  emitter.named_values = old_named_values;

  return func;
}

/**
 * Get the current specialized version of a function.
 */
export function specialized_proc(emitter: LLVMEmitter, procid: number) {
  let variant = emitter.variant;
  if (!variant) {
    return emitter.ir.procs[procid];
  }
  return variant.procs[procid] || emitter.ir.procs[procid];
}

/*
 * Emit either kind of scope
 */
function emit_scope(emitter: LLVMEmitter, scope: number) {
  // Try a Proc.
  let proc = specialized_proc(emitter, scope);
  if (proc) {
    return emitter.emit_proc(emitter, proc);
  }

  // TODO prog
  throw "cannot handle progs yet";

  //throw "error: unknown scope id";
}

// Compile all the Procs and progs who are children of a given scope.
function _emit_subscopes(emitter: LLVMEmitter, scope: Scope): void {
  for (let id of scope.children) {
    emit_scope(emitter, id);
  }
}

// Get all the names of bound variables in a scope.
// In Python: [varsym(id) for id in scope.bound]
function _bound_vars(scope: Scope): number[] {
  let names: number[] = [];
  for (let bv of scope.bound) {
    names.push(bv);
  }
  return names;
}

function _emit_scope_func(emitter: LLVMEmitter, name: string, arg_ids: number[], free_ids: number[], scope: Scope): llvm.Value {
  _emit_subscopes(emitter, scope);

  let local_ids = _bound_vars(scope);
  let func = emit_fun(emitter, name, arg_ids, free_ids, local_ids, scope.body);
  return func;
}

function emit_proc(emitter: LLVMEmitter, proc: Proc): llvm.Value {
  // The arguments consist of the actual parameters, the closure environment
  // (free variables), and the persists used inside the function.
  let arg_ids: number[] = [];
  let free_ids: number[] = [];
  for (let param of proc.params) {
    arg_ids.push(param);
  }
  for (let fv of proc.free) {
    free_ids.push(fv);
  }
  for (let p of proc.persist) {
    throw "Persist not implemented yet";
  }

  // Get the name of the function, or null for the main function.
  let name: string;
  if (proc.id === null) {
    name = 'main';
  } else {
    name = procsym(proc.id);
  }

  return _emit_scope_func(emitter, name, arg_ids, free_ids, proc);
}

function emit_prog() {

}

function emit_prog_variant() {

}

///////////////////////////////////////////////////////////////////
// End Emit Functions & Redundant Funcs
///////////////////////////////////////////////////////////////////

/**
 * Get the LLVM type represented by a Braid type.
 */
function llvm_type(type: Type): llvm.Type {

  if (type === INT) {
    return llvm.IntType.int32();
  } else if (type === FLOAT) {
    return llvm.FloatType.double();
  } else if (type instanceof FunType) {
    // get types of args and return value
    let arg_types: llvm.Type[] = [];
    for (let arg of type.params) {
      arg_types.push(llvm_type(arg));
    }
    arg_types.push(llvm.PointerType.create(llvm.IntType.int8(), 0));
    let ret_type: llvm.Type = llvm_type(type.ret);

    // construct appropriate func type & wrap in ptr
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    let func_type_ptr: llvm.PointerType = llvm.PointerType.create(func_type, 0);

    // create struct environment: {function, closure environment}
    let struct_type: llvm.StructType = llvm.StructType.create([func_type_ptr, llvm.PointerType.create(llvm.IntType.int8(), 0)], true);
    return struct_type;
  } else {
    throw "Unsupported type in LLVM backend: " + type;
  }
}

/**
 * Get return type and arg types of function. Returns [return type, array of arg types]
 */
function get_func_type(emitter: LLVMEmitter, ret_id: number, arg_ids: number[]): [llvm.Type, llvm.Type[]] {
  let ret_type: llvm.Type = llvm_type(emitter.ir.type_table[ret_id][0]);
  let arg_types: llvm.Type[] = [];
  for (let id of arg_ids) {
    arg_types.push(llvm_type(emitter.ir.type_table[id][0]));
  }
  arg_types.push(llvm.PointerType.create(llvm.IntType.int8(), 0)); // closure environment struct ptr
  return [ret_type, arg_types];
}

/**
 * Store a val in the ptr location to which emitter maps the provided id
 */
function assignment_helper(emitter: LLVMEmitter, val: llvm.Value, id: number): llvm.Value {
  // get pointer to stack location
  if (emitter.named_values[id] === undefined)
    throw "Unknown variable name (assign helper)";
  let ptr: llvm.Value = emitter.named_values[id];

  // store new value and return this value
  emitter.builder.buildStore(val, ptr);
  return val;
}

/**
 * Core recursive compile rules
 */
export let compile_rules: ASTVisit<LLVMEmitter, llvm.Value> = {

  visit_alloc(tree: ast.AllocNode, emitter: LLVMEmitter): llvm.Value {
    // TODO
    return llvm.ConstInt.create(0, llvm.IntType.int32());
  },

  visit_tupleind(tree: ast.TupleIndexNode, emitter: LLVMEmitter): llvm.Value {
    // TODO
    return llvm.ConstInt.create(0, llvm.IntType.int32());
  },

  visit_tuple(tree: ast.TupleNode, emitter: LLVMEmitter): llvm.Value {
    // TODO
    return llvm.ConstInt.create(0, llvm.IntType.int32());
  },

  visit_root(tree: ast.RootNode, emitter: LLVMEmitter): llvm.Value {
    // TODO
    return llvm.ConstInt.create(0, llvm.IntType.int32());
  },

  visit_typealias(tree: ast.TypeAliasNode, emitter: LLVMEmitter): llvm.Value {
    // TODO
    return llvm.ConstInt.create(0, llvm.IntType.int32());
  },

  visit_literal(tree: ast.LiteralNode, emitter: LLVMEmitter): llvm.Value {
    if (tree.type === "int")
      return llvm.ConstInt.create(<number>tree.value, llvm.IntType.int32());
    else if (tree.type === "float")
      return llvm.ConstFloat.create(<number>tree.value, llvm.FloatType.double());
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
        lVal = emitter.builder.buildSIToFP(lVal, llvm.FloatType.double(), "lCast");
      if (rType !== FLOAT)
        rVal = emitter.builder.buildSIToFP(rVal, llvm.FloatType.double(), "lCast");

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
    throw "visit quote not implemented";
  },

  visit_escape(tree: ast.EscapeNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit escape not implemented";
  },

  visit_run(tree: ast.RunNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit run not implemented";
  },

  visit_fun(tree: ast.FunNode, emitter: LLVMEmitter): llvm.Value {
    return emit_func(emitter, tree);
  },

  visit_call(tree: ast.CallNode, emitter: LLVMEmitter): llvm.Value {

    // Get pointer to function struct
    let func_struct: llvm.Value = emit(emitter, tree.fun);
    if (!func_struct)
      throw "Unknown function";
    let func_type: llvm.Type = llvm_type(emitter.ir.type_table[tree.fun.id!][0]);
    let _func_struct_ptr: llvm.Value = emitter.builder.buildAlloca(func_type, "");
    let func_struct_ptr: llvm.Value = emitter.builder.buildStore(func_struct, _func_struct_ptr);

    // get ptr to function inside function struct
    let func: llvm.Value = emitter.builder.buildLoad(emitter.builder.buildStructGEP(_func_struct_ptr, 0, ""), "");

    // get pointer to environment inside function struct
    let env: llvm.Value = emitter.builder.buildLoad(emitter.builder.buildStructGEP(_func_struct_ptr, 1, ""), "");

    // Turn args into llvm Values
    let llvm_args: llvm.Value[] = [];
    for (let arg of tree.args)
      llvm_args.push(emit(emitter, arg));
    llvm_args.push(env);

    // build function call
    return emitter.builder.buildCall(func, llvm_args, "calltmp");
  },

  visit_extern(tree: ast.ExternNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit extern not implemented";
  },

  visit_persist(tree: ast.PersistNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit persist not implemented";
  },

  visit_if(tree: ast.IfNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit if not implemented";
  },

  visit_while(tree: ast.WhileNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit while not implemented";
  },

  visit_macrocall(tree: ast.MacroCallNode, emitter: LLVMEmitter): llvm.Value {
    throw "visit macrocall not implemented";
  }
};

/**
 * Compile the IR to an LLVM module.
 */
export function codegen(ir: CompilerIR): llvm.Module {
  llvm.initX86Target();
  // Set up the emitter, which includes the LLVM IR builder.
  let builder = llvm.Builder.create();
  // Create a module. This is where all the generated code will go.
  let mod: llvm.Module = llvm.Module.create("braidprogram");

  let target_triple: string = llvm.TargetMachine.getDefaultTargetTriple();
  let target = llvm.Target.getFromTriple(target_triple);
  let target_machine = llvm.TargetMachine.create(target, target_triple);
  let data_layout = target_machine.createDataLayout().toString();

  mod.setDataLayout(data_layout);
  mod.setTarget(target_triple);

  let emitter: LLVMEmitter = {
    ir: ir,
    mod: mod,
    builder: builder,
    named_values: [],
    emit_expr: (tree: ast.SyntaxNode, emitter: LLVMEmitter) => ast_visit(compile_rules, tree, emitter),
    emit_proc: emit_proc,
    //emit_prog: emit_prog,
    //emit_prog_variant: emit_prog_variant,
    variant: null,
  };

  // Generate the main function into the module.
  emit_main(emitter);

  // Now that we're done generating code, we can free the IR builder.
  emitter.builder.free();

  return emitter.mod;
}

/**
 * Emit the main function (and all the functions it depends on, eventually)
 * into the specified LLVM module.
 */
function emit_main(emitter: LLVMEmitter): llvm.Value {
  return emit_proc(emitter, emitter.ir.main);
}
