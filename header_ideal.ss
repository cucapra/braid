type GL_UNARY_TYPE =
  Int -> Int |
  Float -> Float |
  Float3 -> Float3 |
  Float4 -> Float4;

type GL_BINARY_TYPE =
  Int Int -> Int |
  Float Float -> Float |
  Float2 Float2 -> Float2 |
  Float3 Float3 -> Float3 |
  Float4 Float4 -> Float4 |
  Float3x3 Float3x3 -> Float3x3 |
  Float4x4 Float4x4 -> Float4x4 |
# Vector by scalar
  Float2 Float -> Float2 |
  Float3 Float -> Float3 |
  Float4 Float -> Float4;

type GL_UNARY_BINARY_TYPE =
  GL_UNARY_TYPE |
  GL_BINARY_TYPE;

type GL_MUL_TYPE =
  Int Int -> Int |
  Float Float -> Float |
  Float3 Float3 -> Float3 |
  Float4 Float4 -> Float4 |
  Float3x3 Float3x3 -> Float3x3 |
  Float4x4 Float4x4 -> Float4x4 |
# Vector by scalar
  Float2 Float -> Float2 |
  Float3 Float -> Float3 |
  Float4 Float -> Float4 |
  Float Float2 -> Float2 |
  Float Float3 -> Float3 |
  Float Float4 -> Float4 |
# Special cases for matrix-vector multiply
  Float3x3 Float3 -> Float3 |
  Float4x4 Float4 -> Float4;

extern render: js<Any> -> Void;
extern vertex: glsl<Any> -> Void;
extern fragment: glsl<Any> -> Void;
extern gl_Position: Float4;
extern gl_FragColor: Float4;
extern vec4: 
  Float3 Float -> Float4 | 
  Float Float Float Float -> Float4 | 
  Float -> Float4;
extern vec3:
  Float4 -> Float3 |
  Float Float Float -> Float3 |
  Float -> Float3;
extern vec2:
  Float Float -> Float2;
extern abs:   GL_UNARY_TYPE;
extern normalize: GL_UNARY_TYPE;
extern pow: GL_BINARY_TYPE;
extern reflect: GL_BINARY_TYPE;
extern dot:
  Float3 Float3 -> Float |
  Float4 Float4 -> Float;
extern min: GL_BINARY_TYPE;
extern max: GL_BINARY_TYPE;
extern clamp:
  Float Float Float -> Float |
  Float2 Float Float -> Float2 |
  Float3 Float Float -> Float3;
extern exp2: Float -> Float;
extern cross: Float3 Float3 -> Float3;
extern mix: 
  Float Float Float -> Float |
  Float2 Float2 Float -> Float2 |
  Float3 Float3 Float -> Float;

extern (+): GL_UNARY_BINARY_TYPE;
extern (-): GL_UNARY_BINARY_TYPE;
extern (*): GL_MUL_TYPE;
extern (/): GL_BINARY_TYPE;
extern texture2D: Texture Float2 -> Float4;
# TODO support below
#extern float_array: # TODO maybe add 3 dots as syntax
extern swizzle:
  Float2 String -> Float |
  Float3 String -> Float |
  Float4 String -> Float;