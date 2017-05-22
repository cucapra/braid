import { CompilerIR, Prog, Variant } from '../compile/ir';
import * as llvm_be from './llvm';
import * as llvm from '../../node_modules/llvmc/src/wrapped';
import { ASTVisit, ast_visit, compose_visit } from '../visit';
import { progsym, paren, variant_suffix } from './emitutil';
import * as ast from '../ast';
import * as js from './js';
import * as glsl from './glsl';
import { Glue, emit_glue, vtx_expr, render_expr, ProgKind, prog_kind,
  FLOAT4X4, SHADER_ANNOTATION, TEXTURE } from './gl';
import {locsym, shadersym, get_prog_pair} from './webgl'

////////////////////////////////////////////
// Handling llvm string lengths
////////////////////////////////////////////

// TODO: Just use map for now...will probably need to change this eventually
let str_lens: {[id: string]: number} = {};

/**
 * Function for getting string length.
 * All length lookups will be from here, so will just need to change this 
 * method when find better way to handle string lengths
 */
function get_code_length(id: number) {
  return str_lens[id];
}

//////////////////////////////////////////
// useful openGL bindings
//////////////////////////////////////////

/**
 * Methods for getting various llvm versions of openGL types
 */
function glchar(): llvm.Type   {return llvm.IntType.int8();}
function glstring(): llvm.Type {return llvm.PointerType.create(glchar(), 0);}
function glint(): llvm.Type    {return llvm.IntType.int32();}
function gluint(): llvm.Type   {return llvm.IntType.int32();}
function glsizei(): llvm.Type  {return llvm.IntType.int32();}
function glenum(): llvm.Type   {return llvm.IntType.int32();}

/**
 * Various constants
 */
let GL_FRAGMENT_SHADER = 0x8B30;
let GL_VERTEX_SHADER = 0x8B31;
let GL_COMPILE_STATUS = 0x8B81;
let GL_LINK_STATUS = 0x8B82;

/**
 * GLuint glCreateShader(GLenum shaderType)
 */
function glCreateShader(emitter: llvm_be.LLVMEmitter, shader_type: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glCreateShader");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = gluint();
    let arg_types: llvm.Type[] = [glenum()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glCreateShader", func_type);
  }
  return emitter.builder.buildCall(func, [shader_type], "");
}

/**
 * void glShaderSource(GLuint shader, GLsizei count, const GLchar **string, const GLint *length)
 */
function glShaderSource(emitter: llvm_be.LLVMEmitter, shader: llvm.Value, count: llvm.Value, sources: llvm.Value, lengths: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glShaderSource");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [gluint(), glsizei(), llvm.PointerType.create(glstring(), 0), llvm.PointerType.create(glint(), 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glShaderSource", func_type);
  } 
  return emitter.builder.buildCall(func, [shader, count, sources, lengths], "");
}

/**
 * void glCompileShader(  GLuint shader)
 */
function glCompileShader(emitter: llvm_be.LLVMEmitter, shader_type: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glCompileShader");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [gluint()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glCompileShader", func_type);
  }
  return emitter.builder.buildCall(func, [shader_type], "");
}

/**
 * void glGetShaderiv(  GLuint shader, GLenum pname, GLint *params)
 */
function glGetShaderParameter(emitter: llvm_be.LLVMEmitter, shader: llvm.Value, pname: llvm.Value): llvm.Value {
  throw "not implemented yet";
}

/**
 * void glGetShaderInfoLog(  GLuint shader, GLsizei maxLength, GLsizei *length, GLchar *infoLog);
 */
function glGetShaderInfoLog(emitter: llvm_be.LLVMEmitter): llvm.Value {
  throw "not implemented yet";
}

/**
 * GLuint glCreateProgram(void)
 */
function glCreateProgram(emitter: llvm_be.LLVMEmitter): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glCreateProgram");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = gluint();
    let arg_types: llvm.Type[] = [];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glCreateProgram", func_type);
  }
  return emitter.builder.buildCall(func, [], "");
}

/**
 * void glAttachShader(GLuint program, GLuint shader)
 */
function glAttachShader(emitter: llvm_be.LLVMEmitter, program: llvm.Value, shader: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glAttachShader");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [gluint(), gluint()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glAttachShader", func_type);
  }
  return emitter.builder.buildCall(func, [program, shader], "");
}

/**
 * void glLinkProgram(GLuint program)
 */
function glLinkProgram(emitter: llvm_be.LLVMEmitter, program: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glLinkProgram");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [gluint()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glLinkProgram", func_type);
  }
  return emitter.builder.buildCall(func, [program], "");
}

/*
 *void glGetProgramiv(  GLuint program, GLenum pname, GLint *params);
*/
function glGetProgramParameter(emitter: llvm_be.LLVMEmitter): llvm.Value {
  throw "not implemented yet";
}

/**
 * void glGetProgramInfoLog(  GLuint program, GLsizei maxLength, GLsizei *length, GLchar *infoLog)
 */
function glGetProgramInfoLog(emitter: llvm_be.LLVMEmitter, program: llvm.Value, max_length: llvm.Value, length: llvm.Value, info_log: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetProgramInfoLog");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [gluint(), glsizei(), llvm.PointerType.create(glsizei(),0), glstring()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetProgramInfoLog", func_type);
  }
  return emitter.builder.buildCall(func, [program, max_length, length, info_log], "");
}

/**
 * GLint glGetAttribLocation(GLuint program, const GLchar *name);
 */
function glGetAttribLocation(emitter: llvm_be.LLVMEmitter, program: llvm.Value, name: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetAttribLocation");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = glint();
    let arg_types: llvm.Type[] = [gluint(), glstring()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetAttribLocation", func_type);
  }
  return emitter.builder.buildCall(func, [program, name], "");
}

/**
 * GLint glGetUniformLocation(GLuint program, const GLchar *name)
 */
function glGetUniformLocation(emitter: llvm_be.LLVMEmitter, program: llvm.Value, name: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetUniformLocation");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = glint();
    let arg_types: llvm.Type[] = [gluint(), glstring()];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetUniformLocation", func_type);
  }
  return emitter.builder.buildCall(func, [program, name], "");
} 
//////////////////////////////////////////

/**
 * Call printf
 */
function printf(emitter: llvm_be.LLVMEmitter, str: llvm.Value, args: llvm.Value[]): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("printf");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.IntType.int32();
    let arg_types: llvm.Type[] = [llvm.PointerType.create(llvm.IntType.int8(), 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types, true);
    func = emitter.mod.addFunction("printf", func_type);
  }
  let _args: llvm.Value[] = [];
  _args.push(str, ...args);
  return emitter.builder.buildCall(func, _args, "");
}

function compile_glsl(emitter: llvm_be.LLVMEmitter, shader_type: number, source: llvm.Value, len: number): llvm.Value {
  let shader: llvm.Value = glCreateShader(emitter, llvm.ConstInt.create(shader_type, glenum()));
  
  let sources: llvm.ConstArray = llvm.ConstArray.create(glstring(), [source]);
  let lengths: llvm.ConstArray = llvm.ConstArray.create(glint(), [llvm.ConstInt.create(len, glint())]);
  glShaderSource(emitter, shader, llvm.ConstInt.create(1, glsizei()), sources, lengths);
  glCompileShader(emitter, shader);

  // TODO
  //if (error) {
    //do stuff
  //}

  return shader;
}

function get_shader(emitter: llvm_be.LLVMEmitter, vertex_source: llvm.Value, vertex_len: number, fragment_source: llvm.Value, fragment_len: number): llvm.Value {
  let vert = compile_glsl(emitter, GL_VERTEX_SHADER, vertex_source, vertex_len);
  let frag = compile_glsl(emitter, GL_FRAGMENT_SHADER, fragment_source, fragment_len);
  
  let program = glCreateProgram(emitter);
  glAttachShader(emitter, program, vert);
  glAttachShader(emitter, program, frag);
  glLinkProgram(emitter, program);

  // TODO
  //if (error) {
    //do stuff  
  //}
  
  return program;
}

// Extend the JavaScript compiler with some WebGL specifics.
let compile_rules: ASTVisit<llvm_be.LLVMEmitter, llvm.Value> =
  compose_visit(llvm_be.compile_rules, {
    // Compile calls to our intrinsics for binding shaders.
    visit_call(tree: ast.CallNode, emitter: llvm_be.LLVMEmitter): llvm.Value {
      throw "not implemented yet";
    },

    visit_binary(tree: ast.BinaryNode, emitter: llvm_be.LLVMEmitter): llvm.Value {
      throw "not implemented yet";
    },
  });

// TODO: handle splices and things!!
function emit_shader_code_ref(emitter: llvm_be.LLVMEmitter, prog: Prog, variant: Variant|null): llvm.Value {
  let code_expr = progsym(prog.id!) + variant_suffix(variant);
  for (let esc of prog.owned_splice) {
    throw "not implemented yet";
  }
  return emitter.builder.buildLoad(emitter.named_values2[code_expr], ""); 
}

function emit_loc_var(emitter: llvm_be.LLVMEmitter, scopeid: number, attribute: boolean, varname: string, varid: number, variant: Variant | null): llvm.Value {
  let shader = shadersym(scopeid) + variant_suffix(variant);
  let prog_ptr = emitter.named_values2[shader];
  let program = emitter.builder.buildLoad(prog_ptr, "");
  
  let name = locsym(scopeid, varid) + variant_suffix(variant);
  let ptr = emitter.builder.buildAlloca(glint(), name);
  let value;
  if (attribute) {
    value = glGetAttribLocation(emitter, program, llvm.ConstString.create(name, true));
  } else {
    value = glGetUniformLocation(emitter, program, llvm.ConstString.create(name, true));
  }
  emitter.builder.buildStore(value, ptr);
  emitter.named_values2[name] = ptr;
  return ptr;
}

// Emit the setup declarations for a shader program. Takes the ID of a vertex
// (top-level) shader program.
function emit_shader_setup(emitter: llvm_be.LLVMEmitter, progid: number, variant: Variant | null): llvm.Value {
  let [vertex_prog, fragment_prog] = get_prog_pair(emitter.ir, progid);

  // Compile and link the shader program.
  let vtx_code = emit_shader_code_ref(emitter, vertex_prog, variant);
  let frag_code = emit_shader_code_ref(emitter, fragment_prog, variant);
  let name = shadersym(vertex_prog.id!) + variant_suffix(variant);
  
  let program = get_shader(emitter, vtx_code, get_code_length(vertex_prog.id!), frag_code, get_code_length(fragment_prog.id!)); 
  let ptr = emitter.builder.buildAlloca(gluint(), name);
  emitter.builder.buildStore(program, ptr);

  emitter.named_values2[name] = ptr; 

  // Get the variable locations, for both explicit persists and for free
  // variables.
  let glue = emit_glue(emitter, vertex_prog.id!);
  let val;
  for (let g of glue) {
    val = emit_loc_var(emitter, vertex_prog.id!, g.attribute, g.name, g.id, variant);
  }
  return val;
}

function emit_glsl_prog(emitter: llvm_be.LLVMEmitter, prog: Prog, variant: Variant | null): llvm.Value {
  // Emit subprograms.
  for (let subid of prog.quote_children) {
    let subprog = emitter.ir.progs[subid];
    if (subprog.annotation !== SHADER_ANNOTATION) {
      throw "error: subprograms not allowed in shaders";
    }
    emit_glsl_prog(emitter, subprog, variant)
  }

  // Emit the shader program.
  let code = glsl.compile_prog(emitter, prog.id!);
  let name = progsym(prog.id!) + variant_suffix(variant);

  let ptr = emitter.builder.buildAlloca(llvm.PointerType.create(llvm.IntType.int8(), 0), name);
  emitter.builder.buildStore(llvm.ConstString.create(js.emit_string(code), false), ptr);
  
  emitter.named_values2[name] = ptr;
  str_lens[name] = code.length; // TODO: str_lens

  // If it's a *vertex shader* quote (i.e., a top-level shader quote),
  // emit its setup code too.
  if (prog_kind(emitter.ir, prog.id!) === ProgKind.vertex) {
    return emit_shader_setup(emitter, prog.id!, variant);
  }

  return ptr;
}

// Compile the IR to a JavaScript program that uses WebGL and GLSL.
export function codegen(ir: CompilerIR): llvm.Module {
  llvm.initX86Target();
  // Set up the emitter, which includes the LLVM IR builder.
  let builder = llvm.Builder.create();
  // Create a module. This is where all the generated code will go.
  let mod: llvm.Module = llvm.Module.create("braidprogram");
  // Set the target triple and data layout  
  let target_triple: string = llvm.TargetMachine.getDefaultTargetTriple(); 
  let target = llvm.Target.getFromTriple(target_triple);
  let target_machine = llvm.TargetMachine.create(target, target_triple);
  let data_layout = target_machine.getTargetMachineData().toString();

  mod.setTarget(target_triple);
  mod.setDataLayout(data_layout);
  
  let emitter: llvm_be.LLVMEmitter = {
    mod: mod,
    builder: builder,
    named_values: [], // TODO: rectify named_values and named_values2
    named_values2: {},
    ir: ir,
    emit_expr: (tree: ast.SyntaxNode, emitter: llvm_be.LLVMEmitter) =>
      ast_visit(compile_rules, tree, emitter),
    
    emit_proc: llvm_be.emit_proc,

    emit_prog(emitter: llvm_be.LLVMEmitter, prog: Prog): llvm.Value {
      // Choose between emitting JavaScript and GLSL.
      if (prog.annotation === SHADER_ANNOTATION) {
        return emit_glsl_prog(emitter, prog, null);
      } else {
        return llvm_be.emit_prog(emitter, prog);
      }
    },

    // emit_prog_variant(emitter: llvm_be.LLVMEmitter, variant: Variant, prog: Prog) {
    //   if (prog.annotation === SHADER_ANNOTATION) {
    //     return emit_glsl_prog(emitter, prog, variant);
    //   } else {
    //     return js.emit_prog_variant(emitter, variant, prog);
    //   }
    // },

    variant: null,
  };

  // Generate the main function into the module.
  llvm_be.emit_main(emitter);

  // TODO: We currently just log the IR and then free the module. Eventually,
  // we'd like to return the module to the caller so it can do whatever it
  // wants with the result---at the moment, we return a dangling pointer!
  console.log(emitter.mod.toString());
  emitter.mod.free();

  // Now that we're done generating code, we can free the IR builder.
  emitter.builder.free();

  return emitter.mod;
}
