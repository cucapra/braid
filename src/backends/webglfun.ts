import { FLOAT4X4, FLOAT3X3, FLOAT4, FLOAT3, FLOAT2 } from './gl';
import { Type, PrimitiveType, FLOAT, INT } from '../type';

// The following two interfaces define the type of the function map below
interface ParamsRetType {
  params: Type[];
  ret: (args: string[]) => string;
}

interface FuncMap {
  [func: string]: ParamsRetType[];
}

/**
 * This funcMapList contains rules that describe the corresponding js code of
 * each braid built-in webgl function. This map is structured in the following
 * way. 
 * {
 *  func1: [
 *    {
 *      params: [args1type, arg2type...],
 *      ret: (args) => `the compiled javascript code`,
 *    }, { 
 *      params: [...]
 *      ret: ...
 *    }, 
 *    ...
 *  ],
 *  func2: [...],
 *  ...
 * }
 */
let funcMap: FuncMap = {
  "+": [
    {
      params: [FLOAT2],
      ret: (args) => `(${args[0]})`,
    }, {
      params: [FLOAT3],
      ret: (args) => `(${args[0]})`,
    }, {
      params: [FLOAT4],
      ret: (args) => `(${args[0]})`,
    }, {
      params: [FLOAT3X3],
      ret: (args) => `(${args[0]})`,
    }, {
      params: [FLOAT4X4],
      ret: (args) => `(${args[0]})`,
    }, {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.add(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.add(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.add(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `mat3.add(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `mat4.add(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `vec2.add(vec2.create(), ${args[0]}, vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT2],
      ret: (args) => `vec2.add(vec2.create(), vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `vec3.add(vec3.create(), ${args[0]}, vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT3],
      ret: (args) => `vec3.add(vec3.create(), vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `vec4.add(vec4.create(), ${args[0]}, vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT4],
      ret: (args) => `vec4.add(vec4.create(), vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT],
      ret: (args) => `mat3.add(mat3.create(), ${args[0]}, mat3fromOneValue(${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT3X3],
      ret: (args) => `mat3.add(mat3.create(), mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT],
      ret: (args) => `mat4.add(mat4.create(), ${args[0]}, mat4fromOneValue(${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT4X4],
      ret: (args) => `mat4.add(mat4.create(), mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "-": [
    {
      params: [FLOAT2],
      ret: (args) => `vec2.negate(vec2.create(), ${args[0]})`,
    }, {
      params: [FLOAT3],
      ret: (args) => `vec3.negate(vec3.create(), ${args[0]})`,
    }, {
      params: [FLOAT4],
      ret: (args) => `vec4.negate(vec4.create(), ${args[0]})`,
    }, {
      params: [FLOAT3X3],
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, -1.0)`,
    }, {
      params: [FLOAT4X4],
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, -1.0)`,
    }, {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `mat3.subtract(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `mat4.subtract(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, vec2.fromValues(${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT2],
      ret: (args) => `vec2.subtract(vec2.create(), vec2.fromValues(${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, vec3.fromValues(${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT3],
      ret: (args) => `vec3.subtract(vec3.create(), vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, vec4.fromValues(${args[1]}, ${args[1]}, ${args[1]}, ${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT4],
      ret: (args) => `vec4.subtract(vec4.create(), vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT],
      ret: (args) => `mat3.subtract(mat3.create(), ${args[0]}, mat3fromOneValue(${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT3X3],
      ret: (args) => `mat3.subtract(mat3.create(), mat3fromOneValue(${args[0]}), ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT],
      ret: (args) => `mat4.subtract(mat4.create(), ${args[0]}, mat4fromOneValue(${args[1]}))`,
    }, {
      params: [FLOAT, FLOAT4X4],
      ret: (args) => `mat4.subtract(mat4.create(), mat4fromOneValue(${args[0]}), ${args[1]})`,
    },
  ], "*": [
    {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.multiply(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.multiply(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.multiply(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `mat3.multiply(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `mat4.multiply(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `vec2.scale(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT2],
      ret: (args) => `vec2.scale(vec2.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `vec3.scale(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT3],
      ret: (args) => `vec3.scale(vec3.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `vec4.scale(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT4],
      ret: (args) => `vec4.scale(vec4.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT3X3, FLOAT],
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT3X3],
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT4X4, FLOAT],
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT4X4],
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT3X3, FLOAT3],
      ret: (args) => `vec4.transformMat4(vec4.create(), ${args[1]}, ${args[0]})`,
    }, {
      params: [FLOAT4X4, FLOAT4],
      ret: (args) => `vec3.transformMat3(vec3.create(), ${args[1]}, ${args[0]})`,
    },
  ], "/": [
    {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.div(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.div(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.div(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `mat3div(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `mat4div(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `vec2.scale(vec2.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      params: [FLOAT, FLOAT2],
      ret: (args) => `vec2.scale(vec2.create(), vec2.inverse(vec2.create(), ${args[1]}), ${args[0]})`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `vec3.scale(vec3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      params: [FLOAT, FLOAT3],
      ret: (args) => `vec3.scale(vec3.create(), vec3.inverse(vec3.create(), ${args[1]}), ${args[0]})`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `vec4.scale(vec4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      params: [FLOAT, FLOAT4],
      ret: (args) => `vec4.scale(vec4.create(), vec4.inverse(vec4.create(), ${args[1]}), ${args[0]})`,
    }, {
      params: [FLOAT3X3, FLOAT],
      ret: (args) => `mat3.multiplyScalar(mat3.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      params: [FLOAT, FLOAT3X3],
      ret: (args) => `mat3.multiplyScalar(mat3.create(), mat3div(mat3fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    }, {
      params: [FLOAT4X4, FLOAT],
      ret: (args) => `mat4.multiplyScalar(mat4.create(), ${args[0]}, 1.0/${args[1]})`,
    }, {
      params: [FLOAT, FLOAT4X4],
      ret: (args) => `mat4.multiplyScalar(mat4.create(), mat4div(mat4fromOneValue(1.0), ${args[1]}), ${args[0]})`,
    },
  ], "vec4": [
    {
      params: [FLOAT3, FLOAT],
      ret: (args) => `vec4fromvec3(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT, FLOAT, FLOAT, FLOAT],
      ret: (args) => `vec4.fromValues(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]})`,
    }, {
      params: [FLOAT],
      ret: (args) => `vec4.fromValues(${args[0]}, ${args[0]}, ${args[0]}, ${args[0]})`,
    },
  ], "vec3": [
    {
      params: [FLOAT4],
      ret: (args) => `vec3fromvec4(${args[0]})`,
    }, {
      params: [FLOAT, FLOAT, FLOAT],
      ret: (args) => `vec3.fromValues(${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      params: [FLOAT],
      ret: (args) => `vec3.fromValues(${args[0]}, ${args[0]}, ${args[0]})`,
    }
  ], "vec2": [
    {
      params: [FLOAT, FLOAT],
      ret: (args) => `vec2.fromValues(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT],
      ret: (args) => `vec2.fromValues(${args[0]}, ${args[0]})`,
    },
  ], "abs": [
    {
      params: [FLOAT],
      ret: (args) => `Math.abs(${args[0]})`,
    }, {
      params: [FLOAT2],
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    }, {
      params: [FLOAT3],
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    }, {
      params: [FLOAT4],
      ret: (args) => `${args[0]}.map((ele) => (Math.abs(ele)))`,
    },
  ], "normalize": [
    {
      params: [FLOAT],
      ret: (args) => `normalizeScalar(${args[0]})`,
    }, {
      params: [FLOAT2],
      ret: (args) => `vec2.normalize(vec2.create(), ${args[0]})`,
    }, {
      params: [FLOAT3],
      ret: (args) => `vec3.normalize(vec3.create(), ${args[0]})`,
    }, {
      params: [FLOAT4],
      ret: (args) => `vec4.normalize(vec4.create(), ${args[0]})`,
    },
  ], "pow": [
    {
      params: [FLOAT, FLOAT],
      ret: (args) => `Math.pow(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.pow(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.pow(val, ${args[1]})))`,
    },
  ], "reflect": [
    {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.subtract(vec2.create(), ${args[0]}, vec2.scale(vec2.create(), ${args[1]}, 2.0 * vec2.dot(${args[1]}, ${args[0]})))`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.subtract(vec3.create(), ${args[0]}, vec3.scale(vec3.create(), ${args[1]}, 2.0 * vec3.dot(${args[1]}, ${args[0]})))`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.subtract(vec4.create(), ${args[0]}, vec4.scale(vec4.create(), ${args[1]}, 2.0 * vec4.dot(${args[1]}, ${args[0]})))`,
    },
  ], "dot": [
    {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.dot(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.dot(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.dot(${args[0]}, ${args[1]})`,
    },
  ], "min": [
    {
      params: [FLOAT, FLOAT],
      ret: (args) => `Math.min(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.min(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.min(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.min(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.min(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.min(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.min(val, ${args[1]})))`,
    },
  ], "max": [
    {
      params: [FLOAT, FLOAT],
      ret: (args) => `Math.max(${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT2, FLOAT2],
      ret: (args) => `vec2.max(vec2.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.max(vec3.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT4, FLOAT4],
      ret: (args) => `vec4.max(vec4.create(), ${args[0]}, ${args[1]})`,
    }, {
      params: [FLOAT3X3, FLOAT3X3],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.max(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT4X4, FLOAT4X4],
      ret: (args) => `${args[0]}.map((val, idx) => (Math.max(val, ${args[1]}[idx])))`,
    }, {
      params: [FLOAT2, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    }, {
      params: [FLOAT3, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    }, {
      params: [FLOAT4, FLOAT],
      ret: (args) => `${args[0]}.map((val) => (Math.max(val, ${args[1]})))`,
    },
  ], "clamp": [
    {
      params: [FLOAT, FLOAT, FLOAT],
      ret: (args) => `Math.min(Math.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      params: [FLOAT2, FLOAT, FLOAT],
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      params: [FLOAT3, FLOAT, FLOAT],
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      params: [FLOAT4, FLOAT, FLOAT],
      ret: (args) => `${args[0]}.map((ele) => (Math.min(Math.max(ele, ${args[1]}), ${args[2]})))`,
    }, {
      params: [FLOAT2, FLOAT2, FLOAT2],
      ret: (args) => `vec2.min(vec2.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      params: [FLOAT3, FLOAT3, FLOAT3],
      ret: (args) => `vec3.min(vec3.max(${args[0]}, ${args[1]}), ${args[2]})`,
    }, {
      params: [FLOAT4, FLOAT4, FLOAT4],
      ret: (args) => `vec4.min(vec4.max(${args[0]}, ${args[1]}), ${args[2]})`,
    },
  ], "exp2": [
    {
      params: [FLOAT],
      ret: (args) => `Math.pow(2.0, ${args[0]})`,
    },
  ], "cross": [
    {
      params: [FLOAT3, FLOAT3],
      ret: (args) => `vec3.cross(vec3.create(), ${args[0]}, ${args[1]})`,
    },
  ], "mix": [
    {
      params: [FLOAT, FLOAT, FLOAT],
      ret: (args) => `${args[0]} * (1.0 - ${args[2]}) + ${args[1]} * ${args[2]}`,
    }, {
      params: [FLOAT2, FLOAT2, FLOAT],
      ret: (args) => `vec2.lerp(vec2.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
    }, {
      params: [FLOAT3, FLOAT3, FLOAT],
      ret: (args) => `vec3.lerp(vec3.create(), ${args[0]}, ${args[1]}, ${args[2]})`,
    },
  ]
}

/**
 * This exported function could return the corresponeding javascript code
 * according to the given braid function name and types of arguments. It
 * searches the funcMap declared above to look for the rules.
 * If you would like to support more functions or edit the implementation
 * of existed funcitons, you can make changes on the funcMap above.
 * 
 * @param func the name of a function in braid
 * @param params types of arguments
 * @param args arguments as a string list
 * @return the compiled javascript function including arguments 
 */
export function getFunc(func: string, params: Type[], args: string[]): string | null {
  if (funcMap[func]) {
    for (let paramsRet of funcMap[func]) {
      let isEqual: boolean = true;
      for (let i = 0; i < Math.max(params.length, paramsRet.params.length); i++) {
        if (!((params[i] === paramsRet.params[i]) || (params[i] === INT && paramsRet.params[i] === FLOAT) || (params[i] === FLOAT && paramsRet.params[i] === INT))) {
          isEqual = false;
          break;
        }
      }

      if (isEqual) {
        return paramsRet.ret(args);
      }
    }
    return null;
  }
  return null;
}

