# Phong shader.
def phong(pos: Float3 Array, norm: Float3 Array, model: Mat4, lightpos: Vec3, color: Vec3, specular: Float) (
  var camera_pos = eye(view);

  vertex glsl<
    gl_Position = projection * view * model * vec4(pos, 1.0);

    fragment glsl<
      var out = %[
        # Convert to world space.
        var position_world = vec3(model * vec4(pos, 1.0));
        var normal_world = normalize(vec3(model * vec4(norm, 0.0)));
        var view_dir_world = normalize(camera_pos - position_world);

        # Light.
        var light_direction = normalize(lightpos - position_world);

        # Diffuse component.
        var diffuse = (
          var ndl = vec3( max(0.0, dot(normal_world, light_direction)) );
          color * ndl
        );

        # Add specular component.
        (diffuse +
          (
            var angle = normalize(view_dir_world + light_direction);
            var spec_comp_b = max(0.0, dot(normal_world, angle));
            var spec_comp = pow( spec_comp_b, max(1.0, specular) ) * 2.0;
            vec3(spec_comp)
          )
        )
      ];

      gl_FragColor = vec4(out, 1.0);
    >
  >;
);

# ---

# A triply-nested loop to draw lots of objects in a grid.
def grid(count: Int, f:(Int Int Int -> Void)) (
  var x = count;
  while (x != 0) (
    x = x - 1;
    var y = count;
    while (y != 0) (
      y = y - 1;
      var z = count;
      while (z != 0) (
        z = z - 1;
        f(x, y, z);
      )
    )
  )
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
mat4.scale(model, model, vec3(5.0, 5.0, 5.0));

# The parameters for the Phong shader.
var specular = 100.0;
var light_color = vec3(1.0, 0.2, 0.5);
var light_position = vec3(20.0, 0.0, 20.0);

# Instance positioning.
var id = mat4.create();
var trans = mat4.create();

render js<
  grid(8, fun x:Int y:Int z:Int -> (
    mat4.translate(trans, id, vec3((x - 5) * 10, y * 10, (z - 5) * 10));
    phong(position, normal, trans * model, light_position, light_color, specular);
    draw_mesh(indices, size);
  ));
>
