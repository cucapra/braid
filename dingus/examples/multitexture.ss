# title: multiple textures
# mode: webgl
# ---

# Render multiple textures in one shader.

# Position the model.
var model = mat4();
mat4.scale(model, model, vec3(10.0, 10.0, 10.0));
mat4.rotateY(model, model, 1.0);
# Five cubes at different positions.
var model1 = mat4();
mat4.translate(model1, model, vec3(0.0, 0.0, 0.0));
var model2 = mat4();
mat4.translate(model2, model, vec3(2.0, 0.0, 2.0));
var model3 = mat4();
mat4.translate(model3, model, vec3(-2.0, 0.0, -2.0));
var model4 = mat4();
mat4.translate(model4, model, vec3(-2.0, 0.0, 2.0));
var model5 = mat4();
mat4.translate(model5, model, vec3(2.0, 0.0, -2.0));

# Load buffers and parameters for the model.
var mesh = load_obj("cube.obj");
var position = mesh_positions(mesh);
var normal = mesh_normals(mesh);
var indices = mesh_indices(mesh);
var size = mesh_size(mesh);
var texcoord = mesh_texcoords(mesh);

# Load textures from images.
var texCornell = texture(load_image("cornell-logo.jpg"));
var texWood = texture(load_image("wood1.png"));
var texChecker = texture(load_image("checker.jpg"));

def renderCube(model: Mat4) (
  vertex glsl<
    gl_Position = projection * view * model * vec4(position, 1.0);
    fragment glsl<
      var c0 = texture2D(texCornell, texcoord);
      var c1 = texture2D(texWood, texcoord);
      # A checker texture to store the alpha value
      var alpha = swizzle(texture2D(texChecker, texcoord), "x");
      gl_FragColor = (1.0-alpha)*c0 + alpha*c1;
    >
  >;
  draw_mesh(indices, size);
);

render js<
  renderCube(model1);
  renderCube(model2);
  renderCube(model3);
  renderCube(model4);
  renderCube(model5);  
>