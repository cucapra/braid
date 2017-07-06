# title: head
# mode: webgl
# ---

# Compile-time parameters.
var use_bumpmapping = (1);  # knob: 0

def bump?(bumpnorm: $<Vec3>, default: $<Vec3>)
  if use_bumpmapping
    bumpnorm
    default;

!<

# This example renders a textured model. The head model
# and its texture are from the Computer Graphics Archive
# at Williams:
# http://graphics.cs.williams.edu/data/meshes.xml

# Scale the model up.
var model_base = mat4.create();
mat4.scale(model_base, model_base, vec3(50.0, 50.0, 50.0));

# Load buffers and parameters for the model.
var mesh = load_obj("head.obj");
var position = mesh_positions(mesh);
var indices = mesh_indices(mesh);
var normal = mesh_normals(mesh);
var size = mesh_size(mesh);
var texcoord = mesh_texcoords(mesh);

# Load the color texture and bump map texture.
var tex = load_texture("lambertian.jpg");
var bumpTex = load_texture("bump-lowRes.png");

# Translated model matrix.
var model = mat4.create();

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

render js<
  # Set up for lighting.
  var camera_pos = eye(view);
  var lightpos = vec3(-40.0, 40.0, 30.0);
  var lightcolor = vec3(0.9, 0.8, 0.8);
  var specular = 50.0;

  grid(8, fun x:Int y:Int z:Int -> (
    mat4.translate(model, model_base, vec3((x - 5) * 0.1, y * 0.1, (z - 5) * 0.1));

    vertex glsl<
      gl_Position = projection * view * model * vec4(position, 1.0);
      fragment glsl<
        # Look up the surface color from a texture.
        var color = vec3(texture2D(tex, texcoord));

        var bumpNormal = @bump? (
            # Approximate the derivative.
            var delta = 1.0 / 1024.0;
            var bMd = swizzle(texture2D(bumpTex, texcoord), "x");
            var bUp = swizzle(texture2D(bumpTex, texcoord + vec2(0.0, delta)), "x");
            var bRt = swizzle(texture2D(bumpTex, texcoord + vec2(delta, 0.0)), "x");
            normalize(vec3(bUp - bMd, bRt - bMd, 0.01))
        ) vec3(0.0, 0.0, 0.0);

        # Combine the bump normal with the surface normal.
        var bumpedN = normalize(normal + bumpNormal * 0.2);

        # Phong lighting.
        var position_world = vec3(model * vec4(position, 1.0));
        var normal_world = normalize(vec3(model * vec4(bumpedN, 0.0)));
        var view_dir_world = normalize(camera_pos - position_world);
        var light_direction = normalize(lightpos - position_world);
        var ndl = vec3( max(0.0, dot(normal_world, light_direction)) );
        var angle = normalize(view_dir_world + light_direction);
        var spec_comp_b = max(0.0, dot(normal_world, angle));
        var spec_comp = pow( spec_comp_b, max(1.0, specular) ) * 2.0;

        # Compose the light with the base color.
        var lit = lightcolor * (color * (ndl + 0.7) +
          color * spec_comp * 0.3);

        gl_FragColor = vec4(lit, 1.0);
      >
    >;

    draw_mesh(indices, size);
  ));
>

>
