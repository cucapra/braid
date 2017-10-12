# title: phong lighting
# mode: webgl
# ---

# Phong shader.
def phong(pos: Float3 Buffer, norm: Float3 Buffer, model: Mat4, lightpos: Vec3, color: Vec3, specular: Float) (
  var camera_pos = eye(view);

  vertex glsl<
    gl_Position = projection * view * model * vec4(pos, 1.0);

    fragment glsl<
      # Convert to world space.
      var position_world = vec3(model * vec4(pos, 1.0));
      var normal_world = normalize(vec3(model * vec4(norm, 0.0)));
      var view_dir_world = normalize(camera_pos - position_world);

      # Light.
      var light_direction = normalize(lightpos - position_world);

      # Diffuse.
      var ndl = vec3( max(0.0, dot(normal_world, light_direction)) );

      # Specular.
      var angle = normalize(view_dir_world + light_direction);
      var spec_comp_b = max(0.0, dot(normal_world, angle));
      var spec_comp = pow( spec_comp_b, max(1.0, specular) ) * 2.0;

      gl_FragColor = vec4(color * ndl + vec3(spec_comp), 1.0);
    >
  >;
);

# ---

# Load buffers and parameters for the main model.
var mesh = load_obj("bunny.obj");
var position = mesh_positions(mesh);
var normal = mesh_normals(mesh);
var indices = mesh_indices(mesh);
var size = mesh_size(mesh);

# Position the model.
var id = mat4.create();
var model = mat4.create();
mat4.translate(model, model, vec3(0.0, -10.0, 0.0));
mat4.scale(model, model, vec3(15.0, 15.0, 15.0));

# The parameters for the Phong shader.
var specular = 100.0;
var light_color = vec3(1.0, 0.2, 0.5);
var light_position = vec3(20.0, 0.0, 20.0);

# Rotation matrix.
var rot = mat4.create();

render js<
  # Rotation animation.
  var t = Date.now();
  mat4.rotateY(rot, id, t / 1000);

  phong(position, normal, rot * model, light_position, light_color, specular);
  draw_mesh(indices, size);
>
