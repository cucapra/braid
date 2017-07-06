import { FLOAT4X4, FLOAT3X3, FLOAT4, FLOAT3, FLOAT2 } from './gl';
import { Type, PrimitiveType, FLOAT, INT } from '../type';

interface ParamsRetType {
  params: Type[];
  ret: string;
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
        ret: "TODO:",
      }, {
        params: [FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: "TODO:",
      },
    ]
  }, {
    func: "-", paramsList: [
      {
        params: [FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: "TODO:",
      },
    ]
  }, {
    func: "*", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT4],
        ret: "TODO:",
      },
    ]
  }, {
    func: "/", paramsList: [
      {
        params: [FLOAT2, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT4X4],
        ret: "TODO:",
      }, {
        params: [FLOAT2, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT2],
        ret: "TODO:",
      }, {
        params: [FLOAT3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3],
        ret: "TODO:",
      }, {
        params: [FLOAT4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT3X3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT3X3],
        ret: "TODO:",
      }, {
        params: [FLOAT4X4, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT4X4],
        ret: "TODO:",
      },
    ]
  }, {
    func: "vec4", paramsList: [
      {
        params: [FLOAT3, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT, FLOAT, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT],
        ret: "TODO:",
      },
    ]
  }, {
    func: "vec3", paramsList: [
      {
        params: [FLOAT4],
        ret: "TODO:",
      }, {
        params: [FLOAT, FLOAT, FLOAT],
        ret: "TODO:",
      }, {
        params: [FLOAT],
        ret: "TODO:",
      }
    ]
  }, {
    func: "vec2", paramsList: [
      {
        params: [FLOAT, FLOAT],
        ret: "vec2.fromValues",
      }, {
        params: [FLOAT],
        ret: "TODO:",
      }
    ]
  }
]

export function getFunc(func: string, params: Type[]) {
  for (let funcMap of funcMapList) {
    if (funcMap.func === func) {
      for (let paramsRet of funcMap.paramsList) {
        let isEqual: boolean = true;
        for (let i = 0; i < Math.max(params.length, paramsRet.params.length); i++) {
          isEqual = isEqual && (params[i] === paramsRet.params[i]);
        }

        if (isEqual) {
          return paramsRet.ret;
        }
      }
      return null;
    }
  }
  return null;
}

