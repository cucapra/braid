# title: shadow
# mode: webgl
# ---

# Load floor
var floorMesh = load_obj("floor.obj");
var floorPosition = mesh_positions(floorMesh);
var floorNormal = mesh_normals(floorMesh);
var floorIndices = mesh_indices(floorMesh);
var floorSize = mesh_size(floorMesh);

# Load teapot
var teapotMesh = load_obj("teapot.obj");
var teapotPosition = mesh_positions(teapotMesh);
var teapotNormal = mesh_normals(teapotMesh);
var teapotIndices = mesh_indices(teapotMesh);
var teapotSize = mesh_size(teapotMesh);

# create a transformation matrix for teapot
var trans = mat4();
mat4.scale(trans, trans, vec3(0.4, 0.4, 0.4));
mat4.rotateX(trans, trans, (-90.0) /180.0*3.14);
var normalTrans = mat4();
mat4.transpose(normalTrans, trans);
mat4.invert(normalTrans, normalTrans);

# Create a view matrix and a projection matrix
# from the perspective of light
var projLight = mat4();
var modelViewLight = mat4();
var lightPos = vec3(8, 15, 8);
var center = vec3(0, 0, 0);
var up = vec3(-1, 2, -1);
mat4.perspective(projLight, 120 / 180 * 3.14, 1024/1024, 0.1, 2000.0);
mat4.lookAt(modelViewLight, lightPos, center, up);
var MVPLight = projLight * modelViewLight;

# Create an empty texture to store the depth buffer
var shadowMap = texture();

# Create an framebuffer using the empty texture
var fbo = createFramebuffer();


# shadow shader
def shadow(vert_position: Float3 Array, mvp: Mat4, trans: Mat4) (
  vertex glsl<
    gl_Position = mvp * trans * vec4(vert_position, 1.0);
    fragment glsl<
      var bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
      var bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
      var rgbaDepth = fract(swizzle(gl_FragCoord, "z") * bitShift);
      var gbaa = vec4(swizzle(rgbaDepth, "g"), swizzle(rgbaDepth, "b"), swizzle(rgbaDepth, "a"), swizzle(rgbaDepth, "a"));
      rgbaDepth = rgbaDepth - gbaa * bitMask;
      gl_FragColor = rgbaDepth;
    >
  >
);

render js<
  # change camera's matrix
  var modelView = mat4();
  var T = mat4();
  mat4.fromTranslation(T, vec3(0.0, 5.0, 0.0));
  mat4.invert(modelView, view);
  modelView = T * modelView;
  mat4.invert(modelView, modelView);
  # create camera's normal transformation matrix
  var normalMatrix = mat4();
  mat4.transpose(normalMatrix, modelView);
  mat4.invert(normalMatrix, normalMatrix);

  # bind to the framebuffer to render the depth texture
  bindFramebuffer(fbo);
  framebufferTexture(fbo, shadowMap);
  # Use the shadow shader
  shadow(teapotPosition, MVPLight, trans);
  draw_mesh(teapotIndices, teapotSize);
  shadow(floorPosition, MVPLight, mat4());
  draw_mesh(floorIndices, floorSize);

  # Bind to the screenbuffer to render the image
  bindFramebuffer(screenbuffer);
  # teapot shader
  vertex glsl<
    gl_Position = projection * modelView * trans * vec4(teapotPosition, 1.0);
    # Compute varying position and normal in camera space
    var vPosition = modelView * trans * vec4(teapotPosition, 1.0);
    var vNormal = normalize(vec3(normalMatrix * normalTrans * vec4(teapotNormal, 0.0)));
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
  draw_mesh(teapotIndices, teapotSize);

  # Floor shader
  vertex glsl<
    gl_Position = projection * modelView * vec4(floorPosition, 1.0);
    # Compute varying position and normal in camera space    
    var vPosition = modelView * vec4(floorPosition, 1.0);
    var vNormal = normalize(vec3(normalMatrix * vec4(floorNormal, 0.0)));
    # Compute varying position in light space 
    var vPositionFromLight = MVPLight * vec4(floorPosition, 1.0);

    fragment glsl<
      # Get the depth from the depth buffer
      var shadowCoord = (vec3(vPositionFromLight)/swizzle(vPositionFromLight, "w"))/2.0 + 0.5;
      var rgbaDepth = texture2D(shadowMap, vec2(swizzle(shadowCoord, "x"), swizzle(shadowCoord, "y")));
      var bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0*256.0*256.0));
      var depth = dot(rgbaDepth, bitShift);

      # Check whether it should be shadowed
      var visibility = 0.0;
      if (swizzle(shadowCoord, "z") >= (depth + 0.00015)) (
        visibility = 0.6;
      ) (visibility = 1.0;);

      # the default color of floor
      var color = vec3(0.5, 0.5, 0.5);
      var N = normalize(vNormal);
      var V = normalize(vec3(-vPosition));

      var light_dir = modelView * vec4(lightPos, 0.0);
      var L = normalize(vec3(light_dir) - vec3(0, 0, 0));
      var H = normalize(L + V);
      var lambertian = max(0.0, dot(N, L));
      var specular = 0.0;

      if(lambertian >= 0.00001) (
        var R = reflect(-L, N);

        var specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, 0.8);
      ) (
        specular = 0.0;
      );

      # ambient shading + diffuse shading + phong shading
      gl_FragColor = vec4((1.0 * vec3(0.0, 0.0, 0.0) +
                     1.0 * lambertian * color * visibility +
                     0.2 * specular * vec3(1.0, 1.0, 1.0) * visibility)
                     * 2.0, 1.0);
    >
  >;
  draw_mesh(floorIndices, floorSize);
>
