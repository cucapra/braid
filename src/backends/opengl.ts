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
import {locsym, shadersym} from './webgl'

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

function compile_glsl(emitter: llvm_be.LLVMEmitter, shader_type: number, source: string): llvm.Value {
  let shader: llvm.Value = glCreateShader(emitter, llvm.ConstInt.create(shader_type, glenum()));
  
  let sources: llvm.ConstArray = llvm.ConstArray.create(glstring(), [llvm.ConstString.create(source, false)]);
  let lengths: llvm.ConstArray = llvm.ConstArray.create(glint(), [llvm.ConstInt.create(source.length, glint())]);
  glShaderSource(emitter, shader, llvm.ConstInt.create(1, glsizei()), sources, lengths);
  glCompileShader(emitter, shader);

  // TODO
  //if (error) {
    //do stuff
  //}

  return shader;
}

function get_shader(emitter: llvm_be.LLVMEmitter, vertex_source: string, fragment_source: string) {
  let vert = compile_glsl(emitter, GL_VERTEX_SHADER, vertex_source);
  let frag = compile_glsl(emitter, GL_FRAGMENT_SHADER, fragment_source);
  
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
      throw "not implemented yet"
    },

    visit_binary(tree: ast.BinaryNode, emitter: llvm_be.LLVMEmitter): llvm.Value {
      throw "not implemented yet"
    },
  });

function emit_glsl_prog(emitter: llvm_be.LLVMEmitter, prog: Prog, variant: Variant | null): llvm.Value {
  // Emit subprograms.
  for (let subid of prog.quote_children) {
    let subprog = emitter.ir.progs[subid];
    if (subprog.annotation !== SHADER_ANNOTATION) {
      throw "error: subprograms not allowed in shaders";
    }
    emit_glsl_prog(emitter, subprog, variant)
    let ptr = emitter.builder.buildAlloca(llvm.PointerType.create(llvm.IntType.int8(), 0), "");
    emitter.builder.buildStore(, ptr);
  }

  // Emit the shader program.
  let code = glsl.compile_prog(emitter, prog.id!);
  let name = progsym(prog.id!) + variant_suffix(variant);

  let ptr = emitter.builder.buildAlloca(llvm.PointerType.create(llvm.IntType.int8(), 0), name);
  emitter.builder.buildStore(llvm.ConstString.create(js.emit_string(code), false), ptr);

  // If it's a *vertex shader* quote (i.e., a top-level shader quote),
  // emit its setup code too.
  if (prog_kind(emitter.ir, prog.id!) === ProgKind.vertex) {
    out += emit_shader_setup(emitter, prog.id!, variant);
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
    named_values: [],
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





