# title: environment
# mode: webgl
# ---

# Simple texture mapping on a cube.

# Position the model.
var model = mat4.create();
var mvInv = mat4.create();
mat4.invert(mvInv, view * model);
# mat4.scale(model, model, vec3(10.0, 10.0, 10.0));
# mat4.rotateY(model, model, 1.0);

# Load buffers and parameters for the model.
# var mesh = load_obj("cube.obj");
var skyBoxMesh = load_obj("skyBox.obj");
var position = mesh_positions(skyBoxMesh);
var indices = mesh_indices(skyBoxMesh);
var size = mesh_size(skyBoxMesh);

# Load a texture from an image.
var tex = texture(load_image("posx.jpg"), load_image("negx.jpg"), load_image("posy.jpg"), load_image("negy.jpg"), load_image("posz.jpg"), load_image("negz.jpg"));

render js<
  vertex glsl<
    gl_Position = projection * view * model * vec4(position, 1.0);
    var pos = position;
    fragment glsl<
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      gl_FragColor = textureCube(tex, pos - eye);
      # gl_FragColor = vec4(0.5,0.0,0.0,1.0);
    >
  >;
  draw_mesh(indices, size);
>
