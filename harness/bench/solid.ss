# title: phong lighting
# mode: webgl
# ---

def solid(pos: Float3 Buffer, model: Mat4, color: Vec3) (
  var camera_pos = eye(view);

  vertex glsl<
    gl_Position = projection * view * model * vec4(pos, 1.0);

    fragment glsl<
      gl_FragColor = vec4(color, 1.0);
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

# The solid color to use.
var light_color = vec3(1.0, 0.2, 0.5);

# Instance positioning.
var id = mat4.create();
var trans = mat4.create();

render js<
  grid(8, fun x:Int y:Int z:Int -> (
    mat4.translate(trans, id, vec3((x - 5) * 10, y * 10, (z - 5) * 10));
    solid(position, trans * model, light_color);
    draw_mesh(indices, size);
  ));
>
