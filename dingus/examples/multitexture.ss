# title: multiple textures
# mode: webgl
# ---

# Simple texture mapping on a cube.

# Position the model.
var model = mat4.create();
mat4.scale(model, model, vec3(10.0, 10.0, 10.0));
mat4.rotateY(model, model, 1.0);

# Load buffers and parameters for the model.
var mesh = load_obj("cube.obj");
var position = mesh_positions(mesh);
var normal = mesh_normals(mesh);
var indices = mesh_indices(mesh);
var size = mesh_size(mesh);
var texcoord = mesh_texcoords(mesh);

# Load a texture from an image.
var tex = texture(load_image("default.png"));

render js<
  vertex glsl<
    gl_Position = projection * view * model * vec4(position, 1.0);
    fragment glsl<
      gl_FragColor = texture2D(tex, texcoord);
    >
  >;
  draw_mesh(indices, size);
>
