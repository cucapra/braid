import { FLOAT4X4, FLOAT3X3, FLOAT4, FLOAT3, FLOAT2 } from './gl';
import { Type, PrimitiveType, FLOAT, INT } from '../type';

interface ParamsRetType {
  params: Type[];
  ret: (args: string[]) => string;
}

interface FuncMapType {
  func: string;
  paramsList: ParamsRetType[];
}

let funcMapList: FuncMapType[] = [
  {
    func: "+", paramsList: [
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
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "-", paramsList: [
      {
        params: [FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "*", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "/", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "vec4", paramsList: [
      {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "vec3", paramsList: [
      {
        params: [FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT],
        ret: (args) => `TODO:`,
      }
    ]
  }, {
    func: "vec2", paramsList: [
      {
        params: [FLOAT, FLOAT],
        ret: (args) => "vec2.fromValues",
      }, {
        params: [FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "abs", paramsList: [
      {
        params:[FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "normalize", paramsList: [
      {
        params:[FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "pow", paramsList: [
      {
        params: [FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "reflect", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "dot", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "min", paramsList: [
      {
        params: [FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "max", paramsList: [
      {
        params: [FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "clamp", paramsList: [
      {
        params: [FLOAT, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2, FLOAT2],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT4, FLOAT4, FLOAT4],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "exp2", paramsList: [
      {
        params: [FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "cross", paramsList: [
      {
        params: [FLOAT3, FLOAT3],
        ret: (args) => `TODO:`,
      },
    ]
  }, {
    func: "mix", paramsList: [
      {
        params: [FLOAT, FLOAT, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT2, FLOAT2, FLOAT],
        ret: (args) => `TODO:`,
      }, {
        params: [FLOAT3, FLOAT3, FLOAT],
        ret: (args) => `TODO:`,
      },
    ]
  }
]

export function getFunc(func: string, params: Type[], args: string[]) {
  for (let funcMap of funcMapList) {
    if (funcMap.func === func) {
      for (let paramsRet of funcMap.paramsList) {
        let isEqual: boolean = true;
        for (let i = 0; i < Math.max(params.length, paramsRet.params.length); i++) {
          if ( !((params[i] === paramsRet.params[i]) || (params[i] === INT && paramsRet.params[i] === FLOAT) || (params[i] === FLOAT && paramsRet.params[i] === INT)) ) {
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
  }
  return null;
}

