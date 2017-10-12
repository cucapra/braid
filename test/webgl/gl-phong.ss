# Dingus preamble.
extern dingus.projection: Mat4;
extern dingus.model: Mat4;
extern dingus.view: Mat4;
extern bunny.positions: Vec3 Buffer;
extern bunny.normals: Vec3 Buffer;
extern Date.now: -> Float;
extern Math.sin: Float -> Float;
extern Math.cos: Float -> Float;

# Our variables.
var projection = dingus.projection;
var model = dingus.model;
var view = dingus.view;
var position = bunny.positions;
var normal = bunny.normals;

var shininess = 0.5;

render js<
  var t = Date.now();
  var lx = Math.sin(t / 200);
  var ly = Math.sin(t / 100);
  var lz = Math.sin(t / 300);
  vertex glsl<
    var light_position = vec3(lx, ly, lz);

    var view_model = view * model;
    var view_model_position = view_model * vec4(position, 1.0);

    var camera_position = vec3(view_model_position);

    gl_Position = projection * view_model_position;

    # Convert to world space.
    var position_world = vec3(model * vec4(position, 1.0));
    var normal_world = normalize(vec3(model * vec4(position, 0.0)));
    var view_direction = normalize(camera_position - position_world);

    var light_direction = normalize(light_position - position_world);

    var norm_norm = normalize(normal);

    fragment glsl<
      # Phong power.
      var r = -(reflect(light_direction, norm_norm));
      var power = pow(max(0.0, dot(view_direction, r)), shininess);

      gl_FragColor = vec4(power, power, power, 1.0);
    >
  >
>
