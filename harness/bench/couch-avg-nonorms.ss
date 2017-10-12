# title: couch
# mode: webgl
# ---

# Position the model.
var modelBase = mat4.create();
mat4.scale(modelBase, modelBase, vec3(0.35, 0.35, 0.35));
mat4.rotateX(modelBase, modelBase, 0.4);
mat4.rotateY(modelBase, modelBase, 1.2);
mat4.rotateZ(modelBase, modelBase, 0.5);

# Load buffers and parameters for the model.
var mesh = load_raw("couch/couch.vtx.raw");
var position = mesh_positions(mesh);
var vert_normal = mesh_normals(mesh);
var vert_tangent = mesh_tangents(mesh);
var size = mesh_count(mesh);
var texcoord = mesh_texcoords(mesh);

# Repeating leather texture.
var leatherImg = load_image("couch/T_Leather_D.png");
var leatherTex = texture(leatherImg);
var leatherColor = average(leatherImg);

# Ambient occlusion (AO) texture for highlighting.
var aoImg = load_image("couch/T_Couch_AO.png");
var aoTex = texture(aoImg);

# The mask texture has a few different parameters.
var maskImg = load_image("couch/T_Couch_Mask.png");
var maskTex = texture(maskImg);

# Specular lighting for the leather texture.
var leatherSpecularImg = load_image("couch/T_Leather_S.png");
var leatherSpecularTex = texture(leatherSpecularImg);

# Normal maps for lighting the surface.
var normalImg = load_image("couch/T_Couch_N.png");
var normalTex = texture(normalImg);
var leatherNormalImg = load_image("couch/T_Leather_N.png");
var leatherNormalTex = texture(leatherNormalImg);

# A model matrix with rotation.
var id = mat4.create();
var model = mat4.create();

# Position a light.
var lightPos = vec3(-40.0, 40.0, 30.0);
var lightColor = vec3(0.9, 0.8, 0.8);

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
  var cameraPos = eye(view);

  grid(8, fun x:Int y:Int z:Int -> (
    mat4.translate(model, modelBase, vec3((x - 5), y, (z - 5)));

    # Normal transformation matrix.
    var normalMatrix = model * view;

    vertex glsl<
      gl_Position = projection * view * model * vec4(position, 1.0);
      fragment glsl<
        # BASE COLOR: TEXTURE LOOKUPS

        # The leather texture repeats more quickly than
        # the per-couch textures.
        var leatherTexCoord = texcoord * 5.79;

        # Look up the ambient occlusion amount.
        var aoVec = texture2D(aoTex, texcoord);
        var ao = swizzle(aoVec, "x");
        var seam = swizzle(aoVec, "y");

        # The mask texture has a few different intensities.
        var mask = texture2D(maskTex, texcoord);
        var maskx = swizzle(mask, "x");
        var masky = swizzle(mask, "y");
        var wearFactor = swizzle(mask, "z") * 0.381;

        # Start with the leather texture.
        var bcol = vec3(leatherColor);

        # Desaturate the leather color according to the
        # wear factor.
        var wearDesatMin = 0.0;
        var wearDesatMax = 0.0896;
        var wearDesat = mix(wearDesatMin, wearDesatMax, wearFactor);
        var leatherLuminance =
          swizzle(leatherColor, "x") * 0.3 +
          swizzle(leatherColor, "y") * 0.59 +
          swizzle(leatherColor, "z") * 0.11;
        var leatherGray = vec3(leatherLuminance,
                               leatherLuminance,
                               leatherLuminance);
        bcol = mix(bcol, leatherGray, wearDesat);

        # Mix with a wear color.
        var wearColorMin = vec3(1.0, 0.86,0.833);
        var wearColorMax = vec3(0.628,0.584, 0.584);
        bcol = bcol * mix(wearColorMin, wearColorMax, wearFactor);

        # Mix with black and then gray according to the
        # mask's x and y channels.
        bcol = mix(vec3(0.0, 0.0, 0.0), bcol, maskx);
        bcol = mix(bcol, vec3(0.823, 0.823, 0.823), masky);

        # Mix in a seam color according to the AO
        # texture's y channel.
        var seamColor = vec3(0.522, 0.270, 0.105);
        bcol = mix(bcol, seamColor, seam);

        # Ambient occlusion.
        bcol = bcol * ao;


        # LIGHTING

        # Specular texture for the leather.
        var leatherSpec = swizzle(
          vec3(texture2D(leatherSpecularTex, leatherTexCoord)),
          "x"
        );

        # Normal textures for the couch and leather.
        var normal_in = vec3(texture2D(normalTex, texcoord));

        # Tangent space transform.
        var vNormal = vec3(normalMatrix * vec4(vert_normal, 1.0));
        var vTangent = vec3(normalMatrix * vec4(vert_tangent, 1.0));
        var vBiTangent = cross(vTangent, vNormal);
        var signed_n = normal_in * 2.0 - 1.0;
        var normal = normalize(
          swizzle(signed_n, "x") * vTangent
          + swizzle(signed_n, "y") * vBiTangent
          + swizzle(signed_n, "z") * vNormal
        );

        # Lighting parameters.
        var roughness =
          mix(
            mix(
              mix(
                0.2,
                mix(
                  mix(0.659, 2.01, leatherSpec),
                  -0.154,
                  wearFactor
                ),
              maskx
            ),
            0.0,
            masky
          ),
          0.0,
          seam
        );
        var metallic = mix(0.2, 0.1, leatherSpec);
        var specular = 3.0;

        # Locations and conversions.
        var position_world = vec3(model * vec4(position, 1.0));
        var view_dir_world = normalize(cameraPos - position_world);
        var lightDir = normalize(lightPos - position_world);

        # Diffuse lighting.
        var brightness = clamp(dot(lightDir, normal), 0.0, 1.0);

        # Phong.
        var L = lightDir;
        var H = normalize(view_dir_world + L);
        var dotNL = clamp(dot(normal, L), 0.01, 0.99);
        var dotLH = clamp(dot(L, H), 0.01, 0.99);
        var dotNH = clamp(dot(normal, H), 0.01, 0.99);
        var alpha = roughness * roughness;
        var p = 6.644/(alpha*alpha) - 6.644;
        var pi = 3.14159;
        var highlight = dotNL * exp2(p * dotNH - p) / (pi * (alpha*alpha)) *
          specular;

        # Compose the Phong specular lighting with the albedo color and
        # diffuse brightness.
        var albedo = bcol;
        var lighting = lightColor *
          (albedo * (brightness + 0.7) * (1.0 - metallic) +
          mix(albedo, vec3(1.0), 1.0 - metallic) * highlight);

        # Color output.
        gl_FragColor = vec4(lighting, 1.0);
      >
    >;

    draw_arrays(size);
  ));
>
