# Dingus preamble.
extern dingus.projection: Mat4;
extern dingus.model: Mat4;
extern dingus.view: Mat4;
extern bunny.positions: Vec3 Buffer;
extern bunny.normals: Vec3 Buffer;

# Our variables.
var projection = dingus.projection;
var model = dingus.model;
var view = dingus.view;
var position = bunny.positions;
var normal = bunny.normals;

render js<
  vertex glsl<
    gl_Position = projection * view * model * (vec4 position 1.0);
    fragment glsl<
      gl_FragColor = (vec4 (abs normal) 1.0)
    >
  >
>
