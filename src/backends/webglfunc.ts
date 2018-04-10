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
      ret: (args) => `rt.vec2.add(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.add(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.add(rt.vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.add(rt.mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.add(rt.mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.add(rt.vec2.create(), ${args[0]}, rt.vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.add(rt.vec2.create(), rt.vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.add(rt.vec3.create(), ${args[0]}, rt.vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.add(rt.vec3.create(), rt.vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.add(rt.vec4.create(), ${args[0]}, rt.vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.add(rt.vec4.create(), rt.vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `rt.mat3.add(rt.mat3.create(), ${args[0]}, rt.mat3fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.add(rt.mat3.create(), rt.mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `rt.mat4.add(rt.mat4.create(), ${args[0]}, rt.mat4fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.add(rt.mat4.create(), rt.mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "-": [
    {
      funcType: new FunType([FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.negate(rt.vec2.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.negate(rt.vec3.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.negate(rt.vec4.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.multiplyScalar(rt.mat3.create(), ${args[0]}, -1.0)`,
    }, {
      funcType: new FunType([FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.multiplyScalar(rt.mat4.create(), ${args[0]}, -1.0)`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.subtract(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.subtract(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.subtract(rt.vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.subtract(rt.mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.subtract(rt.mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.subtract(rt.vec2.create(), ${args[0]}, rt.vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.subtract(rt.vec2.create(), rt.vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.subtract(rt.vec3.create(), ${args[0]}, rt.vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.subtract(rt.vec3.create(), rt.vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.subtract(rt.vec4.create(), ${args[0]}, rt.vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.subtract(rt.vec4.create(), rt.vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `rt.mat3.subtract(rt.mat3.create(), ${args[0]}, rt.mat3fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.subtract(rt.mat3.create(), rt.mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `rt.mat4.subtract(rt.mat4.create(), ${args[0]}, rt.mat4fromOneValue(${args[1]}))`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.subtract(rt.mat4.create(), rt.mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "*": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.multiply(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.multiply(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.multiply(rt.vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.multiply(rt.mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.multiply(rt.mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.scale(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.scale(rt.vec2.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.scale(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.scale(rt.vec3.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.scale(rt.vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.scale(rt.vec4.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `rt.mat3.multiplyScalar(rt.mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.multiplyScalar(rt.mat3.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `rt.mat4.multiplyScalar(rt.mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.multiplyScalar(rt.mat4.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.transformMat3(rt.vec3.create(), ${args[1]}, ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.transformMat4(rt.vec4.create(), ${args[1]}, ${args[0]})`,
    },
  ], "/": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.div(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.div(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.div(rt.vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3div(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4div(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.scale(rt.vec2.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.scale(rt.vec2.create(), rt.vec2.inverse(rt.vec2.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.scale(rt.vec3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.scale(rt.vec3.create(), rt.vec3.inverse(rt.vec3.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.scale(rt.vec4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.scale(rt.vec4.create(), rt.vec4.inverse(rt.vec4.create(), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3X3, FLOAT], FLOAT3X3),
      ret: (args) => `rt.mat3.multiplyScalar(rt.mat3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT3X3], FLOAT3X3),
      ret: (args) => `rt.mat3.multiplyScalar(rt.mat3.create(), rt.mat3div(rt.mat3fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4X4, FLOAT], FLOAT4X4),
      ret: (args) => `rt.mat4.multiplyScalar(rt.mat4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT4X4], FLOAT4X4),
      ret: (args) => `rt.mat4.multiplyScalar(rt.mat4.create(), rt.mat4div(rt.mat4fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    },
  ], "vec4": [
    {
      funcType: new FunType([], FLOAT4),
      ret: (args) => `rt.vec4.create()`,
    },
    {
      funcType: new FunType([FLOAT3, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4fromvec3(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT, FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.fromValues(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT4),
      ret: (args) => `rt.vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]})`,
    },
  ], "vec3": [
    {
      funcType: new FunType([], FLOAT3),
      ret: (args) => `rt.vec3.create()`,
    },
    {
      funcType: new FunType([FLOAT4], FLOAT3),
      ret: (args) => `rt.vec3fromvec4(${args[0]})`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.fromValues(${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]})`,
    }
  ], "vec2": [
    {
      funcType: new FunType([], FLOAT2),
      ret: (args) => `rt.vec2.create()`,
    },
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.fromValues(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT], FLOAT2),
      ret: (args) => `rt.vec2.fromValues(${args[0]}, ${args[0]})`,
    },
  ], "mat3": [
    {
      funcType: new FunType([], FLOAT3X3),
      ret: (args) => `rt.mat3.create()`,
    },
  ], "mat4": [
    {
      funcType: new FunType([], FLOAT4X4),
      ret: (args) => `rt.mat4.create()`,
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
      ret: (args) => `rt.vec2.normalize(rt.vec2.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.normalize(rt.vec3.create(), ${args[0]})`,
    }, {
      funcType: new FunType([FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.normalize(rt.vec4.create(), ${args[0]})`,
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
      ret: (args) => `rt.vec2.subtract(rt.vec2.create(), ${args[0]}, rt.vec2.scale(rt.vec2.create(), ${args[1]}, 2.0 * rt.vec2.dot(${args[1]}, ${args[0]})))`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.subtract(rt.vec3.create(), ${args[0]}, rt.vec3.scale(rt.vec3.create(), ${args[1]}, 2.0 * rt.vec3.dot(${args[1]}, ${args[0]})))`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.subtract(rt.vec4.create(), ${args[0]}, rt.vec4.scale(rt.vec4.create(), ${args[1]}, 2.0 * rt.vec4.dot(${args[1]}, ${args[0]})))`,
    },
  ], "dot": [
    {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT),
      ret: (args) => `rt.vec2.dot(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT),
      ret: (args) => `rt.vec3.dot(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT),
      ret: (args) => `rt.vec4.dot(${args[0]}, ${args[1]})`,
    },
  ], "min": [
    {
      funcType: new FunType([FLOAT, FLOAT], FLOAT),
      ret: (args) => `Math.min(${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT2, FLOAT2], FLOAT2),
      ret: (args) => `rt.vec2.min(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.min(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.min(rt.vec4.create(), ${args[0]}, ${args[1]})`,
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
      ret: (args) => `rt.vec2.max(rt.vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.max(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.max(rt.vec4.create(), ${args[0]}, ${args[1]})`,
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
      ret: (args) => `rt.vec2.min(rt.vec2.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.min(rt.vec3.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT4, FLOAT4, FLOAT4], FLOAT4),
      ret: (args) => `rt.vec4.min(rt.vec4.max(${args[0]}, ${args[1]}), ${args[2]})`,
    },
  ], "exp2": [
    {
      funcType: new FunType([FLOAT], FLOAT),
      ret: (args) => `Math.pow(2.0, ${args[0]})`,
    },
  ], "cross": [
    {
      funcType: new FunType([FLOAT3, FLOAT3], FLOAT3),
      ret: (args) => `rt.vec3.cross(rt.vec3.create(), ${args[0]}, ${args[1]})`,
    },
  ], "mix": [
    {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT),
      ret: (args) => `${args[0]} * (1.0 - ${args[2]}) + ${args[1]} * ${args[2]}`,
    }, {
      funcType: new FunType([FLOAT, FLOAT, FLOAT], FLOAT),
      ret: (args) => `rt.vec2.lerp(rt.vec2.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      funcType: new FunType([FLOAT3, FLOAT3, FLOAT], FLOAT3),
      ret: (args) => `rt.vec3.lerp(rt.vec3.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
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
  ], "length": [
    {
      funcType: new QuantifiedType(TVAR,
        new FunType(
          [
            new InstanceType(ARRAY, new VariableType(TVAR)),
          ],
          INT
        )
      ),
      ret: (args) => `${args[0]}.length`,
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
      if (typeof(ret) !== "string") {
        return paramsRet.ret(args);
      } else if (args.length == 0) {
        paramsRet
      }
    }
    return null;
  }
  return null;
}
