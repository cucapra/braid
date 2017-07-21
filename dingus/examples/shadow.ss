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
mat4.lookAt(modelViewLight, eye, center, up);
var MVPLight = projLight * modelViewLight;

var shadowMap = texture();
var fbo = framebuffer(shadowMap);

def shadow(vert_position: Float3 Array) (
  vertex glsl<
    gl_Position = MVPLight * vec4(vert_position, 1.0);
    fragment glsl<
      var bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
      var bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
      var rgbaDepth = fract(gl_FragCoord.z * bitShift);
      rgbaDepth = rgbaDepth - rgbaDepth.gbaa * bitMask;
      gl_FragColor = rgbaDepth;
    >
  >
);

def unpackDepth(rgbaDepth: Float4) (
  var bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0*256.0*256.0));
  var depth = dot(rgbaDepth, bitShift);
  return depth;
);


render js<

  bindFramebuffer(fbo);
  # shadow shader
  shadow(boxPosition);
  draw_mesh(boxIndices, boxSize);
  shadow(floorPosition);
  draw_mesh(floorIndices, floorSize);

  bindFramebuffer();

  var normalMatrix = mat4.create();
  mat4.transpose(normalMatrix, view);
  mat4.invert(normalMatrix, normalMatrix);

  # Box shader
  vertex glsl<
    gl_Position = projection * view * vec4(boxPosition, 1.0);
    var vPosition = view * vec4(boxPosition, 1.0);
    var vNormal = normalize(vec3(normalMatrix * vec4(boxNormal, 0.0)));

    fragment glsl<
      var color = vec3(0.5, 0.0, 0.0);
      var N = normalize(vNormal);
      var V = normalize(-vPosition.xyz);

      var light_dir = modelView * vec4(lightPos, 0.0);
      var L = normalize(lightPos.xyz - vec3(0, 0, 0));
      var H = normalize(L + V);
      var lambertian = max(0.0, dot(N, L));
      var specular = 0.0;

      if(lambertian > 0.0) {
        var R = reflect(-L, N);

        var specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, 0.8);
      }
      gl_FragColor = vec4((1.0 * vec3(0.2, 0.0, 0.0) +
                      1.0 * lambertian * color +
                      0.3 * specular * vec3(1.0, 1.0, 1.0)) * 2.0, 1.0);
    >
  >;
  draw_mesh(boxIndices, boxSize);

  # Floor shader
  vertex glsl<
    gl_Position = projection * view * vec4(floorPosition, 1.0);
    var vPosition = view * vec4(floorPosition, 1.0);
    var vNormal = normalize((normalMatrix * vec4(floorNormal, 0.0)).xyz);
    var vPositionFromLight = MVPLight * vec4(floorPosition, 1.0);

    fragment glsl<
      var shadowCoord = (vPositionFromLight.xyz/vPositionFromLight.w)/2.0 + 0.5;
      var rgbaDepth = texture2D(shadowMap, shadowCoord.xy);
      var depth = unpackDepth(rgbaDepth);
      var visibility = (shadowCoord.z > depth + 0.00015) ? 0.6 : 1.0;

      vec3 color = vec3(0.5, 0.5, 0.5);
      var N = normalize(vNormal);
      var V = normalize(-vPosition.xyz);

      var light_dir = modelView * vec4(lightPos, 0.0);
      var L = normalize(lightPos.xyz - vec3(0, 0, 0));
      var H = normalize(L + V);
      var lambertian = max(0.0, dot(N, L));
      var specular = 0.0;

      if(lambertian > 0.0) {
        var R = reflect(-L, N);

        var specAngle = max(dot(R, V), 0.0);
        specular = pow(specAngle, 0.8);
      }
      gl_FragColor = vec4((1.0 * vec3(0.0, 0.0, 0.0) +
                      1.0 * lambertian * color * visibility +
                      0.2 * specular * vec3(1.0, 1.0, 1.0) * visibility)
                      * 2.0, 1.0);
    >
  >;

>
