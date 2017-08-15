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

# create a framebuffer object
var fbo = createFramebuffer();

# Load a cube texture six images.
var tex = cubeTexture(load_image("posx.jpg"), load_image("negx.jpg"), load_image("posy.jpg"), load_image("negy.jpg"), load_image("posz.jpg"), load_image("negz.jpg"));
# create a empty cube map texture to store the dynamic environment
var environment = cubeTexture();
# create a projection matrix for the dynamic environment
var envProjection = mat4();
mat4.perspective(envProjection, 90 / 180 * 3.14, 1024/1024, 0.1, 2000.0);

# define light position
var lightPos = vec3(8, 15, 8);

var initTime = Date.now();

# skybox shader 
def dynamicSkybox(vert_position: Float3 Buffer, projection: Mat4, modelView: Mat4) (
  var mvp = projection * modelView;
  vertex glsl<
    gl_Position = mvp * vec4(vert_position, 1.0);
    var frag_pos = vert_position;
    fragment glsl<
      gl_FragColor = textureCube(tex, frag_pos * vec3(-1.0 ,1.0, 1.0));
    >
  >;
);

# box shader
def dynamicBox(vert_position: Float3 Buffer, projection: Mat4, modelView: Mat4, normalMatrix: Mat4, trans: Mat4, color: Float3) (
  var boxNormalTrans = mat4();
  mat4.transpose(boxNormalTrans, trans);
  mat4.invert(boxNormalTrans, boxNormalTrans);
  
  vertex glsl<
    gl_Position = projection * modelView * trans * vec4(vert_position, 1.0);
    # Compute varying position and normal in camera space
    var vPosition = modelView * trans * vec4(vert_position, 1.0);
    var vNormal = normalize(vec3(normalMatrix * boxNormalTrans * vec4(boxNormal, 0.0)));
    fragment glsl<
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
      gl_FragColor = vec4((0.3 * color +
                      1.0 * lambertian * color +
                      0.3 * specular * vec3(1.0, 1.0, 1.0)) * 2.0, 1.0);
    >
  >;
);

# render the dynamic environment per face
# target is the index of [posx, negx, posy, negy, posz, negz]
def drawEnvFace(fbo: Framebuffer, environment: CubeTexture, target: Int, envLookDir: Float3, envLookUp: Float3, trans1: Mat4, trans2: Mat4, trans3: Mat4) (
  # bind one face of a cube texture to the framebuffer
  framebufferTexture(fbo, environment, target);
  
  # construct a modelview matrix towards the target face
  var envLookAt = mat4();
  var envOrigin = vec3(0, 0, 0);
  mat4.lookAt(envLookAt, envOrigin, envLookDir, envLookUp);
  # calculate the corresponding normal matrix
  var envNormalMatrix = mat4();
  mat4.transpose(envNormalMatrix, envLookAt);
  mat4.invert(envNormalMatrix, envNormalMatrix);

  # render the skybox
  dynamicSkybox(skyBoxPosition, envProjection, envLookAt);
  draw_mesh(skyBoxIndices, skyBoxSize);

  # render a red box
  dynamicBox(boxPosition, envProjection, envLookAt, envNormalMatrix, trans1, vec3(0.5, 0.0, 0.0));
  draw_mesh(boxIndices, boxSize);
  # render a green box
  dynamicBox(boxPosition, envProjection, envLookAt, envNormalMatrix, trans2, vec3(0.0, 0.5, 0.0));
  draw_mesh(boxIndices, boxSize);
  # render a blue box
  dynamicBox(boxPosition, envProjection, envLookAt, envNormalMatrix, trans3, vec3(0.0, 0.0, 0.5));
  draw_mesh(boxIndices, boxSize);
);

# render six faces of the dynamic environment
def drawEnv(fbo: Framebuffer, environment: CubeTexture, trans1: Mat4, trans2: Mat4, trans3: Mat4) (
  drawEnvFace(fbo, environment, 0, vec3(1, 0, 0), vec3(0, -1, 0), trans1, trans2, trans3);
  drawEnvFace(fbo, environment, 1, vec3(-1, 0, 0), vec3(0, -1, 0), trans1, trans2, trans3);
  drawEnvFace(fbo, environment, 2, vec3(0, 1, 0), vec3(0, 0, 1), trans1, trans2, trans3);
  drawEnvFace(fbo, environment, 3, vec3(0, -1, 0), vec3(0, 0, -1), trans1, trans2, trans3);
  drawEnvFace(fbo, environment, 4, vec3(0, 0, 1), vec3(0, -1, 0), trans1, trans2, trans3);
  drawEnvFace(fbo, environment, 5, vec3(0, 0, -1), vec3(0, -1, 0), trans1, trans2, trans3);
);

# create a box translation matrix
# based on three rotation coefficients and a translation vector
def createBoxTrans(rX: Float, rY: Float, rZ: Float, pos: Float3) (
  var boxTrans = mat4();
  mat4.rotateY(boxTrans, boxTrans, (Date.now() - initTime) / rX / 180.0 * 3.14);
  mat4.rotateX(boxTrans, boxTrans, (Date.now() - initTime) / rY / 180.0 * 3.14);
  mat4.rotateZ(boxTrans, boxTrans, (Date.now() - initTime) / rZ / 180.0 * 3.14);
  mat4.translate(boxTrans, boxTrans, pos);
  boxTrans;
);

# rendering loop
render js<
  var modelView = mat4();
  # Apply a translation matrix in y-axis in order to put the teapot at the center
  var T = mat4();
  mat4.fromTranslation(T, vec3(0.0, 8.0, 0.0));
  mat4.invert(modelView, view);
  modelView = T * modelView;
  mat4.invert(modelView, modelView);
  # calculate modelView inverse
  var mvInv = mat4();
  mat4.invert(mvInv, modelView);
  var normalMatrix = mat4();
  mat4.transpose(normalMatrix, modelView);
  mat4.invert(normalMatrix, normalMatrix);

  # create a transformation matrix for boxes
  var boxTrans1 = createBoxTrans(40.0, 20.0, 30.0, vec3(25.0, 5.0, 25.0));
  var boxTrans2 = createBoxTrans(20.0, 50.0, 40.0, vec3(0.0, 5.0, 30.0));
  var boxTrans3 = createBoxTrans(35.0, 25.0, 50.0, vec3(40.0, 5.0, 10.0));

  # bind to the framebuffer
  bindFramebuffer(fbo);

  # render dynamic environment into a cube texture
  drawEnv(fbo, environment, boxTrans1, boxTrans2, boxTrans3);
  
  # bind back to the screen
  bindFramebuffer(screenbuffer);

  # render three boxes
  dynamicBox(boxPosition, projection, modelView, normalMatrix, boxTrans1, vec3(0.5, 0.0, 0.0));
  draw_mesh(boxIndices, boxSize);  
  dynamicBox(boxPosition, projection, modelView, normalMatrix, boxTrans2, vec3(0.0, 0.5, 0.0));
  draw_mesh(boxIndices, boxSize);  
  dynamicBox(boxPosition, projection, modelView, normalMatrix, boxTrans3, vec3(0.0, 0.0, 0.5));  
  draw_mesh(boxIndices, boxSize);

  # render the skybox
  dynamicSkybox(skyBoxPosition, projection, modelView);
  draw_mesh(skyBoxIndices, skyBoxSize);

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
