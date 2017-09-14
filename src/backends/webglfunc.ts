/**
 * Code generation for WebGL runtime support. This module contains the
 * machinery to generate calls in the `glrt` runtime library from operators
 * and intrinsic functions in host-side code.
 */
import { FLOAT4X4, FLOAT3X3, FLOAT4, FLOAT3, FLOAT2, ARRAY, TVAR, INTRINSICS } from './gl';
import { Type, PrimitiveType, FLOAT, INT, VariableType, TypeVariable, InstanceType, QuantifiedType, VariadicFunType, OverloadedType, FunType, VOID } from '../type';
import { check_call } from "../type_check";

// The following two interfaces define the type of the function map below.
interface ParamsRetType {
  funcType: Type;
  ret: (args: string[]) => string;
}

interface FuncMap {
  [func: string]: ParamsRetType[];
}

/**
 * This funcMap contains rules that describe the corresponding JS code
 * of each braid built-in WebGL function. This map is structured like this:
 *
 * {
 *  "func1": [
 *    {
 *      funcType: the func1 type,
 *      ret: (args) => `the compiled javascript code`,
 *    }, {
 *      funcType: [...]
 *      ret: ...
 *    },
 *    ...
 *  ],
 *  "func2: [...],
 *  ...
 * }
 */
let funcMap: FuncMap = {
  "+": [
    {
      funcType: new FunType([FLOAT2], FLOAT2),
      ret: (args) => `(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3], FLOAT3X3),
      ret: (args) => `(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4], FLOAT4X4),
      ret: (args) => `(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.add(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.add(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.add(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.add(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.add(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `vec2.add(vec2.create(), ${args[0]}, vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `vec2.add(vec2.create(), vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `vec3.add(vec3.create(), ${args[0]}, vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `vec3.add(vec3.create(), vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `vec4.add(vec4.create(), ${args[0]}, vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `vec4.add(vec4.create(), vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `mat3.add(mat3.create(), ${args[0]}, mat3fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.add(mat3.create(), mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `mat4.add(mat4.create(), ${args[0]}, mat4fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.add(mat4.create(), mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "-": [
    {
      funcType: new FunType([FLOAT2], FLOAT2),
      ret: (args) => `vec2.negate(vec2.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `vec3.negate(vec3.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `vec4.negate(vec4.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, -1.0)`,
    }, {
      funcType: new FunType([FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, -1.0)`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.subtract(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.subtract(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `vec2.subtract(vec2.create(), vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `vec3.subtract(vec3.create(), vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `vec4.subtract(vec4.create(), vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `mat3.subtract(mat3.create(), ${args[0]}, mat3fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.subtract(mat3.create(), mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `mat4.subtract(mat4.create(), ${args[0]}, mat4fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.subtract(mat4.create(), mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "*": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.multiply(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.multiply(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.multiply(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.multiply(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.multiply(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `vec2.scale(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `vec2.scale(vec2.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `vec3.scale(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `vec3.scale(vec3.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `vec4.scale(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `vec4.scale(vec4.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3], FLOAT3),
      ret: (args) => `vec4.transformMat4(vec4.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4], FLOAT4),
      ret: (args) => `vec3.transformMat3(vec3.create(), ${args[1]}, ${args[0]})`,
    },
  ], "/": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.div(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.div(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.div(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3div(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4div(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `vec2.scale(vec2.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `vec2.scale(vec2.create(), vec2.inverse(vec2.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `vec3.scale(vec3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `vec3.scale(vec3.create(), vec3.inverse(vec3.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `vec4.scale(vec4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `vec4.scale(vec4.create(), vec4.inverse(vec4.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `mat3.multiplyScalar(mat3.create(), mat3div(mat3fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `mat4.multiplyScalar(mat4.create(), mat4div(mat4fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    },
  ], "vec4": [
    {
      funcType: new FunType([], FLOAT4),
      ret: (args) => `vec4.create()`,
    },
    {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT4),
      ret: (args) => `vec4fromvec3(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT, FLOAT], FLOAT4),
      ret: (args) => `vec4.fromValues(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT4),
      ret: (args) => `vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]})`,
    },
  ], "vec3": [
    {
      funcType: new FunType([], FLOAT3),
      ret: (args) => `vec3.create()`,
    },
    {
      funcType: new FunType([FLOAT4], FLOAT3),
      ret: (args) => `vec3fromvec4(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT3),
      ret: (args) => `vec3.fromValues(${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT3),
      ret: (args) => `vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]})`,
    }
  ], "vec2": [
    {
      funcType: new FunType([], FLOAT2),
      ret: (args) => `vec2.create()`,
    },
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT2),
      ret: (args) => `vec2.fromValues(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT2),
      ret: (args) => `vec2.fromValues(${args[0]}, ${args[0]})`,
    },
  ], "mat3": [
    {
      funcType: new FunType([], FLOAT3X3),
      ret: (args) => `mat3.create()`,
    },
  ], "mat4": [
    {
      funcType: new FunType([], FLOAT4X4),
      ret: (args) => `mat4.create()`,
    },
  ], "abs": [
    {
      funcType: new FunType([], FLOAT4X4),
      ret: (args) => `Math.abs(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT2], FLOAT2),
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    },
  ], "normalize": [
    {
      funcType: new FunType([FLOAT], FLOAT),
      ret: (args) => `normalizeScalar(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT2], FLOAT2),
      ret: (args) => `vec2.normalize(vec2.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `vec3.normalize(vec3.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `vec4.normalize(vec4.create(), ${args[0]})`,
    },
  ], "pow": [
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT),
      ret: (args) => `Math.pow(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    },
  ], "reflect": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, vec2.scale(vec2.create(), ${args[1]}, 2.0 * vec2.dot(${args[1]}, ${args[0]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, vec3.scale(vec3.create(), ${args[1]}, 2.0 * vec3.dot(${args[1]}, ${args[0]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, vec4.scale(vec4.create(), ${args[1]}, 2.0 * vec4.dot(${args[1]}, ${args[0]})))`,
    },
  ], "dot": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT),
      ret: (args) => `vec2.dot(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT),
      ret: (args) => `vec3.dot(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT),
      ret: (args) => `vec4.dot(${args[0]}, ${args[1]})`,
    },
  ], "min": [
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT),
      ret: (args) => `Math.min(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.min(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.min(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.min(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.min(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.min(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    },
  ], "max": [
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT),
      ret: (args) => `Math.max(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.max(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.max(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.max(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.max(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `${args[0]}.map((val, idx) => (Math.max(val, ${args[1]}[idx])))`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    },
  ], "clamp": [
    {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT),
      ret: (args) => `Math.min(Math.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT, FLOAT], FLOAT2),
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT, FLOAT], FLOAT3),
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT, FLOAT], FLOAT4),
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `vec2.min(vec2.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.min(vec3.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `vec4.min(vec4.max(${args[0]}, ${args[1]}), ${args[2]})`,
    },
  ], "exp2": [
    {
      funcType: new FunType([FLOAT], FLOAT),
      ret: (args) => `Math.pow(2.0, ${args[0]})`,
    },
  ], "cross": [
    {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `vec3.cross(vec3.create(), ${args[0]}, ${args[1]})`,
    },
  ], "mix": [
    {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT),
      ret: (args) => `${args[0]} * (1.0 - ${args[2]}) + ${args[1]} * ${args[2]}`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT),
      ret: (args) => `vec2.lerp(vec2.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `vec3.lerp(vec3.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
    },
  ], "array": [ // variadic function
    {
      funcType: new QuantifiedType(TVAR,
        new VariadicFunType(
          [new VariableType(TVAR)],
          new InstanceType(ARRAY, new VariableType(TVAR))
        )
      ),
      ret: (args) => `[${args.join(", ")}]`,
    },
  ], "get": [
    {
      funcType: new QuantifiedType(TVAR,
        new FunType(
          [new InstanceType(ARRAY, new VariableType(TVAR)), INT],
          new VariableType(TVAR)
        )
      ),
      ret: (args) => `${args[0]}[${args[1]}]`,
    },
  ], "set": [
    {
      funcType: new QuantifiedType(TVAR,
        new FunType(
          [
            new InstanceType(ARRAY, new VariableType(TVAR)),
            INT,
            new VariableType(TVAR)
          ], VOID
        )
      ),
      ret: (args) => `(${args[0]}[${args[1]}]) = (${args[2]})`,
    },
  ], "push": [
    {
      funcType: new QuantifiedType(TVAR,
        new FunType(
          [
            new InstanceType(ARRAY, new VariableType(TVAR)),
            new VariableType(TVAR)
          ],
          VOID
        )
      ),
      ret: (args) => `${args[0]}.push(${args[1]})`,
    },
  ],
};

/**
 * Generate the JavaScript code for a special WebGL call given the Braid
 * function (or operator) name and the types of its arguments.
 *
 * This searches the funcMap above to look for code-generation rules. To add
 * support for more intrinsics and operators, add them there.
 *
 * @param func The name of a function in Braid.
 * @param argTypes Types of arguments.
 * @param args JavaScript code for the arguments as a string list.
 * @return The compiled JavaScript function including arguments.
 */
export function get_func(func: string, argTypes: Type[],
                        args: string[]): string | null
{
  if (funcMap[func]) {
    for (let paramsRet of funcMap[func]) {
      let ret = check_call(paramsRet.funcType, argTypes);
      if (ret instanceof Type) {
        return paramsRet.ret(args);
      }
    }
    return null;
  }
  return null;
}
