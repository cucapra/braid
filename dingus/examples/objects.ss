# title: two objects
# mode: webgl
# ---

var id = mat4.create();

# Bunny model.
var b_mesh = load_obj("bunny.obj");
var b_position = mesh_positions(b_mesh);
var b_normal = mesh_normals(b_mesh);
var b_indices = mesh_indices(b_mesh);
var b_size = mesh_size(b_mesh);
var b_model_base = mat4.create();
mat4.translate(b_model_base, b_model_base, vec3(0.0, -5.0, 0.0));
mat4.scale(b_model_base, b_model_base, vec3(5.0, 5.0, 5.0));

# Teapot model.
var t_mesh = load_obj("teapot.obj");
var t_position = mesh_positions(t_mesh);
var t_normal = mesh_normals(t_mesh);
var t_indices = mesh_indices(t_mesh);
var t_size = mesh_size(t_mesh);
var t_model_base = mat4.create();
mat4.scale(t_model_base, t_model_base, vec3(0.5, 0.5, 0.5));

def simple_shader(pos: Float3 Array, norm: Float3 Array, model: Mat4) (
  vertex glsl<
    gl_Position = projection * view * model * vec4(pos, 1.0);
    fragment glsl<
      gl_FragColor = vec4(abs(norm), 1.0);
    >
  >;
);

# Model vectors for animation.
var b_model = mat4.create();
var t_model = mat4.create();

render js<
  # Animate.
  var phase = Math.sin(Date.now() / 200);
  mat4.rotateX(b_model, b_model_base, phase);
  mat4.rotateY(t_model, t_model_base, phase * 4);

  simple_shader(b_position, b_normal, b_model);
  draw_mesh(b_indices, b_size);

  simple_shader(t_position, t_normal, t_model);
  draw_mesh(t_indices, t_size);
>
