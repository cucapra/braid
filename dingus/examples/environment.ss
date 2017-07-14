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

# Load a cube texture six images.
var tex = texture(load_image("posx.jpg"), load_image("negx.jpg"), load_image("posy.jpg"), load_image("negy.jpg"), load_image("posz.jpg"), load_image("negz.jpg"));

var initTime = Date.now();

render js<
  var modelView = mat4.create();
  var T = mat4.create();
  mat4.fromTranslation(T, vec3(0.0, 1.5, 7.0));
  var R = mat4.create();
  # Create a modelview matrix such that the camera will rotate around the teapot and always towards it
  mat4.rotateY(R, R, (Date.now() - initTime) / 100.0 / 180.0 * 3.14);
  modelView = R * T;
  mat4.invert(modelView, modelView);
  var mvInv = mat4.create();
  mat4.invert(mvInv, modelView);
  vertex glsl<
    gl_Position = projection * modelView * vec4(skyBoxPosition, 1.0);
    var pos = skyBoxPosition;
    fragment glsl<
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      gl_FragColor = textureCube(tex, pos - eye);
    >
  >;
  draw_mesh(skyBoxIndices, skyBoxSize);

  # create a transformation matrix for teapot
  var trans = mat4.create();
  mat4.rotateX(trans, trans, (-90.0) /180.0*3.14);
  var normalTrans = mat4.create();
  mat4.transpose(normalTrans, trans);
  mat4.invert(normalTrans, normalTrans);
  vertex glsl<
    gl_Position = projection * modelView * trans * vec4(teapotPosition / 5.0, 1.0);
    var frag_normal = vec3(normalTrans * vec4(teapotNormal, 0.0));
    var frag_pos = vec3(trans * vec4(teapotPosition / 5.0, 1.0));
    fragment glsl<
      # render the mirror effect
      var normal = normalize(frag_normal);
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      var rayIn = normalize(frag_pos - eye);
      var rayOut = normalize(reflect(rayIn, normal));
      gl_FragColor = textureCube(tex, rayOut);
    >
  >;
  draw_mesh(teapotIndices, teapotSize);
>
