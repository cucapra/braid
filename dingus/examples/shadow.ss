# title: shadow
# mode: webgl
# ---

# Load floor
var floorMesh = load_obj("floor.obj");
var floorPosition = mesh_positions(floorMesh);
var floorNormal = mesh_normals(floorMesh);
var floorIndices = mesh_indices(floorMesh);
var floorSize = mesh_size(floorMesh);

# Load Box
var boxMesh = load_obj("box.obj");
var boxPosition = mesh_positions(boxMesh);
var boxNormal = mesh_normals(boxMesh);
var boxIndices = mesh_indices(boxMesh);
var boxSize = mesh_size(boxMesh);

# # Load teapot
# var teapotMesh = load_obj("teapot.obj");
# var teapotPosition = mesh_positions(teapotMesh);
# var teapotNormal = mesh_normals(teapotMesh);
# var teapotIndices = mesh_indices(teapotMesh);
# var teapotSize = mesh_size(teapotMesh);

# # create a transformation matrix for teapot
# var trans = mat4.create();
# mat4.rotateX(trans, trans, (-90.0) /180.0*3.14);
# var normalTrans = mat4.create();
# mat4.transpose(normalTrans, trans);
# mat4.ainvert(normalTrans, normalTrans);

var projLight = mat4.create();
var modelViewLight = mat4.create();
var lightPos = vec3(8, 8, 8);
var center = vec3(0, 0, 0);
var up = vec3(-1, 2, -1);
mat4.perspective(projLight, 90.0, 1024/1024, 0.1, 2000.0);
mat4.lookAt(modelViewLight, lightPos, center, up);
var MVPLight = projLight * modelViewLight;

var shadowMap = texture();
var fbo = framebuffer(shadowMap);
var initTime = Date.now();

def shadow(vert_position: Float3 Array, mvp: Mat4) (
  vertex glsl<
    gl_Position = mvp * vec4(vert_position, 1.0);
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
  
  
  var modelView = mat4.create();
  var T = mat4.create();
  mat4.fromTranslation(T, vec3(0.0, 5.0, 20.0));
  var R = mat4.create();
  mat4.rotateY(R, R, (Date.now() - initTime) / 100.0 / 180.0 * 3.14);
  var rotationX = -10.0/180*3.14;
  mat4.rotateX(R, R, rotationX);
  modelView = R * T;
  mat4.invert(modelView, modelView);


  bindFramebuffer(fbo);
  # shadow shader
  shadow(boxPosition, MVPLight);
  draw_mesh(boxIndices, boxSize);
  shadow(floorPosition, MVPLight);
  draw_mesh(floorIndices, floorSize);

  bindFramebuffer(screenbuffer);

  var normalMatrix = mat4.create();
  mat4.transpose(normalMatrix, modelView);
  mat4.invert(normalMatrix, normalMatrix);

  # Box shader
  vertex glsl<
    gl_Position = projection * modelView * vec4(boxPosition, 1.0);
    var vPosition = modelView * vec4(boxPosition, 1.0);
    var vNormal = normalize(vec3(normalMatrix * vec4(boxNormal, 0.0)));

    fragment glsl<
      var color = vec3(0.5, 0.0, 0.0);
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
      ) (var a = 0.0;);
      gl_FragColor = vec4((1.0 * vec3(0.2, 0.0, 0.0) +
                      1.0 * lambertian * color +
                      0.3 * specular * vec3(1.0, 1.0, 1.0)) * 2.0, 1.0);
    >
  >;
  draw_mesh(boxIndices, boxSize);

  # Floor shader
  vertex glsl<
    gl_Position = projection * modelView * vec4(floorPosition, 1.0);
    var vPosition = modelView * vec4(floorPosition, 1.0);
    var vNormal = normalize(vec3(normalMatrix * vec4(floorNormal, 0.0)));
    var vPositionFromLight = MVPLight * vec4(floorPosition, 1.0);

    fragment glsl<
      var shadowCoord = (vec3(vPositionFromLight)/swizzle(vPositionFromLight, "w"))/2.0 + 0.5;
      var rgbaDepth = texture2D(shadowMap, vec2(swizzle(shadowCoord, "x"), swizzle(shadowCoord, "y")));
      var bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0*256.0*256.0));
      var depth = dot(rgbaDepth, bitShift);
      var visibility = 0.0;
      if (swizzle(shadowCoord, "z") >= (depth + 0.00015)) (
        visibility = 0.6;
      ) (visibility = 1.0;);
      var color = vec3(0.7, 0.7, 0.7);
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
      ) (var a = 0.0;);
      gl_FragColor = vec4((1.0 * vec3(0.0, 0.0, 0.0) +
                     1.0 * lambertian * color * visibility +
                     0.2 * specular * vec3(1.0, 1.0, 1.0) * visibility)
                     * 2.0, 1.0);
    >
  >;
  draw_mesh(floorIndices, floorSize);

>
