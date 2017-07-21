# title: environment
# mode: webgl
# ---

# Load buffers and parameters for the model.
# Load skyBox
var skyBoxMesh = load_obj("skyBox.obj");
var skyBoxPosition = mesh_positions(skyBoxMesh);
var skyBoxIndices = mesh_indices(skyBoxMesh);
var skyBoxSize = mesh_size(skyBoxMesh);

# Load teapot
var teapotMesh = load_obj("teapot.obj");
var teapotPosition = mesh_positions(teapotMesh);
var teapotNormal = mesh_normals(teapotMesh);
var teapotIndices = mesh_indices(teapotMesh);
var teapotSize = mesh_size(teapotMesh);

# create a transformation matrix for teapot
var trans = mat4.create();
mat4.rotateX(trans, trans, (-90.0) /180.0*3.14);
var normalTrans = mat4.create();
mat4.transpose(normalTrans, trans);
mat4.invert(normalTrans, normalTrans);

# Load a cube texture six images.
var tex = texture(load_image("posx.jpg"), load_image("negx.jpg"), load_image("posy.jpg"), load_image("negy.jpg"), load_image("posz.jpg"), load_image("negz.jpg"));

render js<
  var modelView = mat4.create();
  # Apply a translation matrix in y-axis in order to put the teapot at the center
  var T = mat4.create();
  mat4.fromTranslation(T, vec3(0.0, 8.0, 0.0));
  mat4.invert(modelView, view);
  modelView = T * modelView;
  mat4.invert(modelView, modelView);
  var mvInv = mat4.create();

  mat4.invert(mvInv, modelView);
  vertex glsl<
    gl_Position = projection * modelView * vec4(skyBoxPosition, 1.0);
    var pos = skyBoxPosition;
    fragment glsl<
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      # Change vector from right-hand coordinate system to left-hand coordinate system, which is a webgl convention
      gl_FragColor = textureCube(tex, (pos - eye) * vec3(-1.0, 1.0, 1.0));
    >
  >;
  draw_mesh(skyBoxIndices, skyBoxSize);

  vertex glsl<
    gl_Position = projection * modelView * trans * vec4(teapotPosition, 1.0);
    var frag_normal = vec3(normalTrans * vec4(teapotNormal, 0.0));
    var frag_pos = vec3(trans * vec4(teapotPosition / 5.0, 1.0));
    fragment glsl<
      # render the mirror effect
      var normal = normalize(frag_normal);
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      var rayIn = normalize(frag_pos - eye);
      var rayOut = normalize(reflect(rayIn, normal));
      gl_FragColor = textureCube(tex, rayOut * vec3(-1.0, 1.0, 1.0));
    >
  >;
  draw_mesh(teapotIndices, teapotSize);
>
