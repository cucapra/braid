# title: dynamic environment
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

# Load box
var boxMesh = load_obj("box.obj");
var boxPosition = mesh_positions(boxMesh);
var boxNormal = mesh_normals(boxMesh);
var boxIndices = mesh_indices(boxMesh);
var boxSize = mesh_size(boxMesh);

# create a transformation matrix for teapot
var teapotTrans = mat4();
mat4.rotateX(teapotTrans, teapotTrans, (-90.0) /180.0*3.14);
var teapotNormalTrans = mat4();
mat4.transpose(teapotNormalTrans, teapotTrans);
mat4.invert(teapotNormalTrans, teapotNormalTrans);

var fbo = createFramebuffer();

# Load a cube texture six images.
var tex = cubeTexture(load_image("posx.jpg"), load_image("negx.jpg"), load_image("posy.jpg"), load_image("negy.jpg"), load_image("posz.jpg"), load_image("negz.jpg"));
var environment = cubeTexture();
var envProjection = mat4();
mat4.perspective(envProjection, 90 / 180 * 3.14, 1024/1024, 0.1, 2000.0);

var lightPos = vec3(8, 15, 8);

var initTime = Date.now();

# var boxCode = glsl<vec4(1.0, 0.0, 0.0, 1.0)>; # Red color for box
# var envCode = glsl<textureCube(tex, frag_pos * vec3(-1.0, 1.0, 1.0))>; # cube map

# def dynamicEnv(vert_position: Float3 Array, envLookAt: Mat4, trans: Mat4, fragCode: glsl<Float4>) (
#   var envMVP = envProjection * envLookAt;
#   vertex glsl<
#     gl_Position = envMVP * trans * vec4(vert_position, 1.0);
#     var frag_pos = vec3(trans * vec4(vert_position, 1.0));
#     fragment glsl<
#       gl_FragColor = 2[fragCode];
#     >
#   >
# );

def dynamicEnv(vert_position: Float3 Array, projection: Mat4, modelView: Mat4, trans: Mat4) (
  var mvp = projection * modelView;
  vertex glsl<
    gl_Position = mvp * trans * vec4(vert_position, 1.0);
    var frag_pos = vec3(trans * vec4(vert_position, 1.0));
    fragment glsl<
      gl_FragColor = textureCube(tex, frag_pos * vec3(-1.0 ,1.0, 1.0));
    >
  >;
);

def dynamicBox(vert_position: Float3 Array, projection: Mat4, modelView: Mat4, normalMatrix: Mat4, trans: Mat4, boxNormalTrans: Mat4) (
  var mvp = projection * modelView;
  vertex glsl<
    gl_Position = projection * modelView * trans * vec4(vert_position, 1.0);
    # Compute varying position and normal in camera space
    var vPosition = modelView * trans * vec4(vert_position, 1.0);
    var vNormal = normalize(vec3(normalMatrix * boxNormalTrans * vec4(boxNormal, 0.0)));
    fragment glsl<
      # the default color of teapot
      var color = vec3(0.5, 0.0, 0.0);

      # diffuse shader
      var N = normalize(vNormal);
      var V = normalize(vec3(-vPosition));
      var light_dir = modelView * vec4(lightPos, 0.0);
      var L = normalize(vec3(light_dir) - vec3(0, 0, 0));
      var H = normalize(L + V);
      var lambertian = max(0.0, dot(N, L));
      var specular = 0.0;
      # phong shader
      if(lambertian >= 0.00001) (
        var R = reflect(-L, N);

        var specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, 0.8);
      ) (

        specular = 0.0;
      );

      # ambient shading + diffuse shading + phong shading
      gl_FragColor = vec4((1.0 * vec3(0.2, 0.0, 0.0) +
                      1.0 * lambertian * color +
                      0.3 * specular * vec3(1.0, 1.0, 1.0)) * 2.0, 1.0);
    >
  >;

  # vertex glsl<
  #   gl_Position = mvp * trans * vec4(vert_position, 1.0);
  #   fragment glsl<
  #     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  #   >
  # >
);

def drawEnv(fbo: Framebuffer, environment: CubeTexture, target: Int, envLookDir: Float3, envLookUp: Float3, trans: Mat4, boxNormalTrans: Mat4) (
  framebufferTexture(fbo, environment, target);
  var envLookAt = mat4();
  var envOrigin = vec3(0, 0, 0);
  mat4.lookAt(envLookAt, envOrigin, envLookDir, envLookUp);
  dynamicEnv(skyBoxPosition, envProjection, envLookAt, mat4());
  draw_mesh(skyBoxIndices, skyBoxSize);

  var envNormalMatrix = mat4();
  mat4.transpose(envNormalMatrix, envLookAt);
  mat4.invert(envNormalMatrix, envNormalMatrix);
  dynamicBox(boxPosition, envProjection, envLookAt, envNormalMatrix, trans, boxNormalTrans);
  draw_mesh(boxIndices, boxSize);
);


render js<

  var modelView = mat4();
  # Apply a translation matrix in y-axis in order to put the teapot at the center
  var T = mat4();
  mat4.fromTranslation(T, vec3(0.0, 8.0, 0.0));
  mat4.invert(modelView, view);
  modelView = T * modelView;
  mat4.invert(modelView, modelView);
  var mvInv = mat4();
  mat4.invert(mvInv, modelView);
  var normalMatrix = mat4();
  mat4.transpose(normalMatrix, modelView);
  mat4.invert(normalMatrix, normalMatrix);

  # create a transformation matrix for box
  var boxTrans = mat4();
  mat4.rotateY(boxTrans, boxTrans, (Date.now() - initTime) / 20.0 / 180.0 * 3.14);
  mat4.rotateX(boxTrans, boxTrans, (Date.now() - initTime) / 40.0 / 180.0 * 3.14);
  mat4.rotateZ(boxTrans, boxTrans, (Date.now() - initTime) / 30.0 / 180.0 * 3.14);
  mat4.translate(boxTrans, boxTrans, vec3(25.0, 5.0, 25.0));
  var boxNormalTrans = mat4();
  mat4.transpose(boxNormalTrans, boxTrans);
  mat4.invert(boxNormalTrans, boxNormalTrans);

  bindFramebuffer(fbo);

  drawEnv(fbo, environment, 0, vec3(1, 0, 0), vec3(0, -1, 0), boxTrans, boxNormalTrans);
  drawEnv(fbo, environment, 1, vec3(-1, 0, 0), vec3(0, -1, 0), boxTrans, boxNormalTrans);
  drawEnv(fbo, environment, 2, vec3(0, 1, 0), vec3(0, 0, 1), boxTrans, boxNormalTrans);
  drawEnv(fbo, environment, 3, vec3(0, -1, 0), vec3(0, 0, -1), boxTrans, boxNormalTrans);
  drawEnv(fbo, environment, 4, vec3(0, 0, 1), vec3(0, -1, 0), boxTrans, boxNormalTrans);
  drawEnv(fbo, environment, 5, vec3(0, 0, -1), vec3(0, -1, 0), boxTrans, boxNormalTrans);
  
  bindFramebuffer(screenbuffer);

  # skyBox shader
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

  # box shader
  dynamicBox(boxPosition, projection, modelView, normalMatrix, boxTrans, boxNormalTrans);
  draw_mesh(boxIndices, boxSize);

  # mirror teapot shader
  vertex glsl<
    gl_Position = projection * modelView * teapotTrans * vec4(teapotPosition, 1.0);
    var frag_normal = vec3(teapotNormalTrans * vec4(teapotNormal, 0.0));
    var frag_pos = vec3(teapotTrans * vec4(teapotPosition / 5.0, 1.0));
    fragment glsl<
      # render the mirror effect
      var normal = normalize(frag_normal);
      var eye = vec3(mvInv * vec4(0.0, 0.0, 0.0, 1.0));
      var rayIn = normalize(frag_pos - eye);
      var rayOut = normalize(reflect(rayIn, normal));
      gl_FragColor = textureCube(environment, rayOut * vec3(1.0, 1.0, 1.0));
    >
  >;
  draw_mesh(teapotIndices, teapotSize);
>
