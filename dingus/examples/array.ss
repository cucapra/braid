# title: array
# mode: webgl
# ---

# Position the model.
var model = mat4.create();
mat4.scale(model, model, vec3(10.0, 10.0, 10.0));
mat4.rotateY(model, model, 1.0);

var positionArray = array(
  # front
  vec3(-1, -1,  1),
  vec3(1, -1, 1),
  vec3(1, 1, 1),
  vec3(-1, 1, 1),
  # back
  vec3(-1, -1, -1),
  vec3(-1, 1, -1),
  vec3(1, 1, -1),
  vec3(1, -1, -1),
  # top
  vec3(-1, 1, -1),
  vec3(-1, 1, 1),
  vec3(1, 1, 1),
  vec3(1, 1, -1),
  # bottom
  vec3(-1, -1, -1),
  vec3(1, -1, -1),
  vec3(1, -1, 1),
  vec3(-1, -1, 1),
  # right
  vec3(1, -1, -1),
  vec3(1, 1, -1),
  vec3(1, 1, 1),
  vec3(1, -1, 1),
  # left
  vec3(-1, -1, -1),
  vec3(-1, -1, 1),
  vec3(-1, 1, 1),
  vec3(-1, 1, -1)
);

var texcoordArray = array(
  # front
  vec2(0, 0),
  vec2(1, 0),
  vec2(1, 1),
  vec2(0, 1),

  # back
  vec2(1, 0),
  vec2(1, 1),
  vec2(0, 1),
  vec2(0, 0),

  # top
  vec2(0, 1),
  vec2(0, 0),
  vec2(1, 0),
  vec2(1, 1),

  # bottom
  vec2(1, 1),
  vec2(0, 1),
  vec2(0, 0),
  vec2(1, 0),

  # right
  vec2(1, 0),
  vec2(1, 1),
  vec2(0, 1),
  vec2(0, 0),

  # left
  vec2(0, 0),
  vec2(1, 0),
  vec2(1, 1),
  vec2(0, 1)
);

var indicesArray = array(
  0, 1, 2,      0, 2, 3,    # Front face
  4, 5, 6,      4, 6, 7,    # Back face
  8, 9, 10,     8, 10, 11,  # Top face
  12, 13, 14,   12, 14, 15, # Bottom face
  16, 17, 18,   16, 18, 19, # Right face
  20, 21, 22,   20, 22, 23  # Left face
);

# Load buffers and parameters for the model.
var position = array_buffer(positionArray);
var texcoord = array_buffer(texcoordArray);
var indices = element_buffer(indicesArray);

# Load a texture from an image.
var tex = texture(load_image("default.png"));

render js<
  vertex glsl<
    gl_Position = projection * view * model * vec4(position, 1.0);
    fragment glsl<
      gl_FragColor = texture2D(tex, texcoord);
    >
  >;
  draw_mesh(indices, 36);
>
