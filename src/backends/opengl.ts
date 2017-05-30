import { CompilerIR, Prog, Variant } from '../compile/ir';
import * as llvm_be from './llvm';
import * as llvm from '../../node_modules/llvmc/src/wrapped';
import { ASTVisit, ast_visit, compose_visit } from '../visit';
import { progsym, paren, variant_suffix } from './emitutil';
import * as ast from '../ast';
import * as js from './js';
import * as glsl from './glsl';
import { Type, PrimitiveType } from '../type';
import { Glue, emit_glue, vtx_expr, render_expr, ProgKind, prog_kind,
  FLOAT4X4, SHADER_ANNOTATION, TEXTURE } from './gl';
import { assign } from '../util';
import {locsym, shadersym, get_prog_pair, GL_UNIFORM_FUNCTIONS} from './webgl'

////////////////////////////////////////////
// Handling llvm string lengths
////////////////////////////////////////////

// TODO: Just use map for now...will probably need to change this eventually
let str_lens: {[id: string]: number} = {};

/**
 * Function for getting string length.
 * TODO: All length lookups will be from here, so will just need to change this 
 * method when find better way to handle string lengths
 */
function get_code_length(id: number) {
  return str_lens[id];
}

//////////////////////////////////////////
// useful openGL bindings
//////////////////////////////////////////

/**
 * llvm versions of various openGL types
 */
let GLVOIDSTAR: llvm.Type =  llvm.PointerType.create(llvm.IntType.int8(), 0);
let GLCHAR: llvm.Type =      llvm.IntType.int8();
let GLSTRING: llvm.Type =    llvm.PointerType.create(GLCHAR, 0);
let GLBOOLEAN: llvm.Type =   llvm.IntType.int1(); 
let GLINT: llvm.Type =       llvm.IntType.int32();
let GLUINT: llvm.Type =      llvm.IntType.int32();
let GLSIZEI: llvm.Type =     llvm.IntType.int32();
let GLENUM: llvm.Type =      llvm.IntType.int32();
let GLFLOAT: llvm.Type =     llvm.FloatType.float();

/**
 * Various constants
 */
let GL_TEXTURE_2D =       0x0DE1;
let GL_FLOAT =            0x1406;
let GL_TEXTURE0 =         0x84C0;
let GL_ARRAY_BUFFER =     0x8892; //TODO: check this one
let GL_FRAGMENT_SHADER =  0x8B30;
let GL_VERTEX_SHADER =    0x8B31;
let GL_COMPILE_STATUS =   0x8B81;
let GL_LINK_STATUS =      0x8B82;

const GL_ATTRIBUTE_TYPES: { [_: string]: [number, number] } = {
  "Float2": [2, GL_FLOAT],
  "Float3": [3, GL_FLOAT],
};

/**
 * GLuint glCreateShader(GLenum shaderType)
 */
function glCreateShader(emitter: llvm_be.LLVMEmitter, shader_type: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glCreateShader");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = GLUINT;
    let arg_types: llvm.Type[] = [GLENUM];
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
    let arg_types: llvm.Type[] = [GLUINT, GLSIZEI, llvm.PointerType.create(GLSTRING, 0), llvm.PointerType.create(GLINT, 0)];
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
    let arg_types: llvm.Type[] = [GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glCompileShader", func_type);
  }
  return emitter.builder.buildCall(func, [shader_type], "");
}

/**
 * void glGetShaderiv(  GLuint shader, GLenum pname, GLint *params)
 */
function glGetShaderiv(emitter: llvm_be.LLVMEmitter, shader: llvm.Value, pname: llvm.Value, params: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetShaderiv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT, GLENUM, llvm.PointerType.create(GLINT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetShaderiv", func_type);
  }
  return emitter.builder.buildCall(func, [shader, pname, params], "");  
}

/**
 * void glGetShaderInfoLog(  GLuint shader, GLsizei maxLength, GLsizei *length, GLchar *infoLog);
 */
function glGetShaderInfoLog(emitter: llvm_be.LLVMEmitter, shader: llvm.Value, max_len: llvm.Value, length: llvm.Value, info_log: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetShaderInfoLog");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT, GLSIZEI, llvm.PointerType.create(GLSIZEI, 0), GLSTRING];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetShaderInfoLog", func_type);
  }
  return emitter.builder.buildCall(func, [shader, max_len, length, info_log], "");  
}

/**
 * GLuint glCreateProgram(void)
 */
function glCreateProgram(emitter: llvm_be.LLVMEmitter): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glCreateProgram");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = GLUINT;
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
    let arg_types: llvm.Type[] = [GLUINT, GLUINT];
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
    let arg_types: llvm.Type[] = [GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glLinkProgram", func_type);
  }
  return emitter.builder.buildCall(func, [program], "");
}

/*
 * void glGetProgramiv(  GLuint program, GLenum pname, GLint *params);
 */
function glGetProgramiv(emitter: llvm_be.LLVMEmitter, program: llvm.Value, pname: llvm.Value, params: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetProgramiv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT, GLENUM, llvm.PointerType.create(GLINT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetProgramiv", func_type);
  }
  return emitter.builder.buildCall(func, [program, pname, params], "");
}

/**
 * void glGetProgramInfoLog(  GLuint program, GLsizei maxLength, GLsizei *length, GLchar *infoLog)
 */
function glGetProgramInfoLog(emitter: llvm_be.LLVMEmitter, program: llvm.Value, max_length: llvm.Value, length: llvm.Value, info_log: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glGetProgramInfoLog");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT, GLSIZEI, llvm.PointerType.create(GLSIZEI,0), GLSTRING];
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
    let ret_type: llvm.Type = GLINT;
    let arg_types: llvm.Type[] = [GLUINT, GLSTRING];
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
    let ret_type: llvm.Type = GLINT;
    let arg_types: llvm.Type[] = [GLUINT, GLSTRING];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glGetUniformLocation", func_type);
  }
  return emitter.builder.buildCall(func, [program, name], "");
} 

/**
 * void glUseProgram(GLuint program)
 */
function glUseProgram(emitter: llvm_be.LLVMEmitter, program: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUseProgram");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUseProgram", func_type);
  }
  return emitter.builder.buildCall(func, [program], "");
}

/**
 * void glActiveTexture(GLenum texture);
 */
function glActiveTexture(emitter: llvm_be.LLVMEmitter, texture: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glActiveTexture");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLENUM];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glActiveTexture", func_type);
  }
  return emitter.builder.buildCall(func, [texture], "");
}

/**
 * void glBindTexture(GLenum target, GLuint texture);
 */
function glBindTexture(emitter: llvm_be.LLVMEmitter, target: llvm.Value, texture: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glBindTexture");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLENUM, GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glBindTexture", func_type);
  }
  return emitter.builder.buildCall(func, [target, texture], "");
}

/**
 * void glUniform1i(GLint location, GLint v0);
 */
function glUniform1i(emitter: llvm_be.LLVMEmitter, location: llvm.Value, v0: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform1i");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform1i", func_type);
  }
  return emitter.builder.buildCall(func, [location, v0], "");
}

/**
 * void glUniform3iv(GLint location, GLsizei count, const GLint *value);
 */
function glUniform3iv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform3iv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, llvm.PointerType.create(GLINT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform3iv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, value], "");
}

/**
 * void glUniform4iv(GLint location, GLsizei count, const GLint *value);
 */
function glUniform4iv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform4iv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, llvm.PointerType.create(GLINT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform4iv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, value], "");
}

/**
 * void glUniform1f(GLint location, GLfloat v0): llvm.Value;
 */
function glUniform1f(emitter: llvm_be.LLVMEmitter, location: llvm.Value, v0: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform1f");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLFLOAT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform1f", func_type);
  }
  return emitter.builder.buildCall(func, [location, v0], "");
}

/**
 * void glUniform3fv(  GLint location, GLsizei count, const GLfloat *value);
 */
function glUniform3fv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform3fv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, llvm.PointerType.create(GLFLOAT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform3fv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, value], "");
}

/**
 * void glUniform4fv(GLint location, GLsizei count, const GLfloat *value);
 */
function glUniform4fv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform4fv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, llvm.PointerType.create(GLFLOAT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform4fv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, value], "");
}

/**
 * void glUniformMatrix3fv(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);
 */
function glUniformMatrix3fv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, transpose: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniform4fv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, GLBOOLEAN, llvm.PointerType.create(GLFLOAT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniform4fv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, transpose, value], "");
}

/**
 * void glUniformMatrix4fv(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);
 */
function glUniformMatrix4fv(emitter: llvm_be.LLVMEmitter, location: llvm.Value, count: llvm.Value, transpose: llvm.Value, value: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glUniformMatrix4fv");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLINT, GLSIZEI, GLBOOLEAN, llvm.PointerType.create(GLFLOAT, 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glUniformMatrix4fv", func_type);
  }
  return emitter.builder.buildCall(func, [location, count, transpose, value], "");
}

/**
 * void glBindBuffer(GLenum target, GLuint buffer);
 */
function glBindBuffer(emitter: llvm_be.LLVMEmitter, target: llvm.Value, buffer: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glBindBuffer");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLENUM, GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glBindBuffer", func_type);
  }
  return emitter.builder.buildCall(func, [target, buffer], "");
}

/**
 * void glVertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const GLvoid * pointer);
 */
function glVertexAttribPointer(emitter: llvm_be.LLVMEmitter, index: llvm.Value, size: llvm.Value, type: llvm.Value, 
  normalized: llvm.Value, stride: llvm.Value, pointer: llvm.Value): llvm.Value {
  
  let func: llvm.Function = emitter.mod.getFunction("glVertexAttribPointer");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT, GLINT, GLENUM, GLBOOLEAN, GLSIZEI, GLVOIDSTAR];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glVertexAttribPointer", func_type);
  }
  return emitter.builder.buildCall(func, [index, size, type, normalized, stride, pointer], "");
}

/**
 * void glEnableVertexAttribArray(GLuint index);
 */
function glEnableVertexAttribArray(emitter: llvm_be.LLVMEmitter, index: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("glEnableVertexAttribArray");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.VoidType.create();
    let arg_types: llvm.Type[] = [GLUINT];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("glEnableVertexAttribArray", func_type);
  }
  return emitter.builder.buildCall(func, [index], "");
}
//////////////////////////////////////////

/**
 * Matrix multiplication
 */
function mat4mult(emitter: llvm_be.LLVMEmitter, left: llvm.Value, right: llvm.Value): llvm.Value {
  let func: llvm.Function = emitter.mod.getFunction("mat4mult");
  if (func.ref.isNull()) {
    let ret_type: llvm.Type = llvm.PointerType.create(llvm.IntType.int8(), 0);
    let arg_types: llvm.Type[] = [llvm.PointerType.create(llvm.IntType.int8(), 0), llvm.PointerType.create(llvm.IntType.int8(), 0)];
    let func_type: llvm.FunctionType = llvm.FunctionType.create(ret_type, arg_types);
    func = emitter.mod.addFunction("mat4mult", func_type);
  }
  return emitter.builder.buildCall(func, [left, right], "");
}

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

// TODO: create a compile_glsl function in LLVM IR instead of just inlining each call
function compile_glsl(emitter: llvm_be.LLVMEmitter, shader_type: number, source: llvm.Value, len: number): llvm.Value {
  let shader: llvm.Value = glCreateShader(emitter, llvm.ConstInt.create(shader_type, GLENUM));
  
  let sources: llvm.ConstArray = llvm.ConstArray.create(GLSTRING, [source]);
  let lengths: llvm.ConstArray = llvm.ConstArray.create(GLINT, [llvm.ConstInt.create(len, GLINT)]);
  glShaderSource(emitter, shader, llvm.ConstInt.create(1, GLSIZEI), sources, lengths);
  glCompileShader(emitter, shader);

  // TODO: Error handling
  //if (error) {
    //do stuff
  //}

  return shader;
}

// TODO: create a get_shader function in LLVM IR instead of just inlining each call
function get_shader(emitter: llvm_be.LLVMEmitter, vertex_source: llvm.Value, vertex_len: number, fragment_source: llvm.Value, fragment_len: number): llvm.Value {
  let vert: llvm.Value = compile_glsl(emitter, GL_VERTEX_SHADER, vertex_source, vertex_len);
  let frag: llvm.Value = compile_glsl(emitter, GL_FRAGMENT_SHADER, fragment_source, fragment_len);
  
  let program: llvm.Value = glCreateProgram(emitter);
  glAttachShader(emitter, program, vert);
  glAttachShader(emitter, program, frag);
  glLinkProgram(emitter, program);

  // TODO: Error handling
  //if (error) {
    //do stuff  
  //}
  
  return program;
}

function emit_param_binding(emitter: llvm_be.LLVMEmitter, scopeid: number, type: Type, varid: number, value: llvm.Value, attribute: boolean, 
    texture_index: number | undefined, variant: Variant | null): llvm.Value {

  if (!attribute) {
    if (type === TEXTURE) {
      // Bind a texture sampler.
      if (texture_index === undefined) {
        throw "missing texture index";
      }
      glActiveTexture(emitter, llvm.ConstInt.create(GL_TEXTURE0 + texture_index, GLENUM));
      glBindTexture(emitter, llvm.ConstInt.create(GL_TEXTURE_2D, GLENUM), value);
      
      let locname: string = locsym(scopeid, varid) + variant_suffix(variant);
      let locptr: llvm.Value = emitter.named_values2[locname];
      let loc: llvm.Value = emitter.builder.buildLoad(locptr, "");
      
      return glUniform1i(emitter, loc, llvm.ConstInt.create(texture_index, GLINT));
    } else if (type instanceof PrimitiveType) {
      // Ordinary uniform.
      let fname: string = GL_UNIFORM_FUNCTIONS[type.name];
      if (fname === undefined) {
        throw "error: unsupported uniform type " + type.name;
      }

      // Construct the call to gl.uniformX.
      let locname: string = locsym(scopeid, varid) + variant_suffix(variant);
      let locptr: llvm.Value = emitter.named_values2[locname];
      let loc: llvm.Value = emitter.builder.buildLoad(locptr, "");

      switch (fname) {
        case "uniform3iv":
          return glUniform3iv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), value);
        case "uniform4iv":
          return glUniform4iv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), value);
        case "uniform1f":
          return glUniform1f(emitter, loc, value);
        case "uniform3fv":
          return glUniform3fv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), value);
        case "uniform4fv":
          return glUniform4fv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), value);
        case "uniformMatrix3fv":
          return glUniformMatrix3fv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), llvm.ConstInt.create(0, GLBOOLEAN), value);
        case "uniformMatrix4fv":
          return glUniformMatrix4fv(emitter, loc, llvm.ConstInt.create(1, GLSIZEI), llvm.ConstInt.create(0, GLBOOLEAN), value)
        default:
          throw "Unsupported function name";
      }
    } else {
      throw "error: uniforms must be primitive types";
    }
  // Array types are bound as attributes.
  } else {
    if (type instanceof PrimitiveType) { // The value is a buffer object.
      // Location handle.
      let loc_expr: string = locsym(scopeid, varid) + variant_suffix(variant);
      let loc_ptr: llvm.Value = emitter.named_values2[loc_expr];
      let loc: llvm.Value = emitter.builder.buildLoad(loc_ptr, "");

      // Choose the `vertexAttribPointer` arguments based on the type.
      let pair = GL_ATTRIBUTE_TYPES[type.name];
      if (!pair) {
        throw `error: unknown attribute type ${type.name}`;
      }
      let [dims, eltype] = pair;

      glBindBuffer(emitter, llvm.ConstInt.create(GL_ARRAY_BUFFER, GLENUM), value);
      glVertexAttribPointer(emitter, loc, llvm.ConstInt.create(dims, GLINT), llvm.ConstInt.create(eltype, GLENUM), 
        llvm.ConstInt.create(0, GLBOOLEAN), llvm.ConstInt.create(0, GLSIZEI), llvm.Value.constNull(GLVOIDSTAR)); 
      return glEnableVertexAttribArray(emitter, loc);
    } else {
      throw "error: attributes must be primitive types";
    }
  }
}

function emit_shader_binding_variant(emitter: llvm_be.LLVMEmitter, progid: number, variant: Variant | null): llvm.Value {
  let [vertex_prog, fragment_prog] = get_prog_pair(emitter.ir, progid);

  // Bind the shader program.
  let shader_name: string = shadersym(vertex_prog.id!) + variant_suffix(variant);
  let ptr: llvm.Value = emitter.named_values2[shader_name];
  let shader: llvm.Value = emitter.builder.buildLoad(ptr, "");
  glUseProgram(emitter, shader);

  // Emit and bind the uniforms and attributes.
  let subemitter = assign({}, emitter);
  if (!subemitter.variant) {
    subemitter.variant = variant;
  }
  let glue = emit_glue(subemitter, progid);
  let ret: llvm.Value;
  for (let g of glue) {
    let value: llvm.Value;
    if (g.value_name) {
      // value = g.value_name;
      let ptr: llvm.Value = emitter.named_values2[g.value_name];
      value = emitter.builder.buildLoad(ptr, "");
    } else {
      value = llvm_be.emit(subemitter, g.value_expr!);
    }
    ret = emit_param_binding(emitter, vertex_prog.id!, g.type, g.id, value, g.attribute, g.texture_index, variant);
  }
  return ret;
}

function emit_shader_binding(emitter: llvm_be.LLVMEmitter, progid: number): llvm.Value {
  // Check whether this shader has variants.
  let variants = emitter.ir.presplice_variants[progid];
  if (variants === null) {
    // No variants.
    return emit_shader_binding_variant(emitter, progid, null);
  } else {
    // TODO
    throw "not implemented yet";
    // Variants exist. Emit the selector.
    //return js.emit_variant_selector(
    //  emitter, emitter.ir.progs[progid], variants,
    //  (variant) => {
    //    return emit_shader_binding_variant(emitter, progid, variant);
    //  }
    //);
  }
}

let compile_rules: ASTVisit<llvm_be.LLVMEmitter, llvm.Value> =
  compose_visit(llvm_be.compile_rules, {
    // Compile calls to our intrinsics for binding shaders.
    visit_call(tree: ast.CallNode, emitter: llvm_be.LLVMEmitter): llvm.Value {
      // Check for the intrinsic that indicates a shader invocation.
      if (vtx_expr(tree)) {
        // For the moment, we require a literal quote so we can statically
        // emit the bindings.
        if (tree.args[0].tag === "quote") {
          let quote = tree.args[0] as ast.QuoteNode;
          return emit_shader_binding(emitter, quote.id!);
        } else {
          throw "dynamic `vtx` calls unimplemented";
        }

      // And our intrinsic for indicating the rendering stage.
      } else if (render_expr(tree)) {
        // Pass through the code argument.
        return llvm_be.emit(emitter, tree.args[0]);
      }

      // An ordinary function call.
      return ast_visit(llvm_be.compile_rules, tree, emitter);
    },

    visit_binary(tree: ast.BinaryNode, emitter: llvm_be.LLVMEmitter): llvm.Value {
      // If this is a matrix/matrix multiply, emit a function call.
      if (tree.op === "*") {
        let [typ,] = emitter.ir.type_table[tree.id!];
        if (typ === FLOAT4X4) {
          let lhs: llvm.Value = llvm_be.emit(emitter, tree.lhs);
          let rhs: llvm.Value = llvm_be.emit(emitter, tree.rhs);
          return mat4mult(emitter, lhs, rhs);
        }
      }

      // Otherwise, use the ordinary LLVM backend.
      return ast_visit(llvm_be.compile_rules, tree, emitter);
    },
  });

function emit_shader_code_ref(emitter: llvm_be.LLVMEmitter, prog: Prog, variant: Variant|null): llvm.Value {
  let code_expr: string = progsym(prog.id!) + variant_suffix(variant);
  for (let esc of prog.owned_splice) {
    // TODO: handle splices and things!!
    throw "not implemented yet";
  }
  return emitter.builder.buildLoad(emitter.named_values2[code_expr], ""); 
}

function emit_loc_var(emitter: llvm_be.LLVMEmitter, scopeid: number, attribute: boolean, varname: string, varid: number, variant: Variant | null): llvm.Value {
  let shader: string = shadersym(scopeid) + variant_suffix(variant);
  let prog_ptr: llvm.Value = emitter.named_values2[shader];
  let program: llvm.Value = emitter.builder.buildLoad(prog_ptr, "");
  
  let name: string = locsym(scopeid, varid) + variant_suffix(variant);
  let ptr: llvm.Value = emitter.builder.buildAlloca(GLINT, name);
  let value: llvm.Value;
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
  let vtx_code: llvm.Value = emit_shader_code_ref(emitter, vertex_prog, variant);
  let frag_code: llvm.Value = emit_shader_code_ref(emitter, fragment_prog, variant);
  let name: string = shadersym(vertex_prog.id!) + variant_suffix(variant);
  
  let program: llvm.Value = get_shader(emitter, vtx_code, get_code_length(vertex_prog.id!), frag_code, get_code_length(fragment_prog.id!)); 
  let ptr: llvm.Value = emitter.builder.buildAlloca(GLUINT, name);
  emitter.builder.buildStore(program, ptr);

  emitter.named_values2[name] = ptr; 

  // Get the variable locations, for both explicit persists and for free
  // variables.
  let glue = emit_glue(emitter, vertex_prog.id!);
  let val: llvm.Value;
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
  let code: string = glsl.compile_prog(emitter, prog.id!);
  let name: string = progsym(prog.id!) + variant_suffix(variant);

  let ptr: llvm.Value = emitter.builder.buildAlloca(llvm.PointerType.create(llvm.IntType.int8(), 0), name);
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

// Compile to an LLVM program that uses OpenGL and GLSL.
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
      // Choose between emitting LLVM and GLSL.
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
