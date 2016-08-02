---
title: Happy Graphics Coding with Braid
abstract: |
    Graphics programming should be fun.
    But today, you have to choose between pre-packaged engines like Unity and low-level, nitty-gritty APIs like OpenGL and Direct3D.
    If you want to control the GPU directly with shaders, you're in for a steep learning curve.

    *Static staging* is a new programming language concept from [Microsoft Research][msr] that makes it easy to program across the CPU--GPU boundary. The [Static Staging Compiler][ssc] is an open-source prototype compiler that generates [WebGL][] and [GLSL][] code from a single program with *staging annotations*.

    [msr]: http://research.microsoft.com
    [ssc]: https://github.com/sampsyo/braid
    [webgl]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
    [glsl]: https://www.opengl.org/documentation/glsl/
epilogue: |
    There's a lot more to programming with static stages!
    Next, you might be interested in reading the full [SSC documentation][docs].
    We're working on expanding this tutorial, so check back soon.

    [docs]: http://microsoft.github.io/staticstaging/docs/
---
This tutorial will show you how to write some simple graphics programs using the [Static Staging Compiler][ssc].
Try editing any of the examples to see the result immediately.
You can also check out [the code on GitHub][ssc] or read the more technical [language manual][docs] for details.

[ssc]: https://github.com/sampsyo/braid
[docs]: http://microsoft.github.io/staticstaging/docs/

## Let's Draw Something

Here's a tiny SSC program that draws a [bunny][]:

    # Position the model.
    var model = mat4.create();
    mat4.scale(model, model, vec3(14.0, 14.0, 14.0));
    mat4.translate(model, model, vec3(0.0, -0.7, 0.0));

    # Load buffers and parameters for the model.
    var mesh = load_obj("bunny.obj");
    var position = mesh_positions(mesh);
    var normal = mesh_normals(mesh);
    var indices = mesh_indices(mesh);
    var size = mesh_size(mesh);

    # ---

    # Per-frame render loop.
    render js<

      # Vertex shader.
      vertex glsl<
        gl_Position = projection * view * model * vec4(position, 1.0);

        # Fragment shader.
        fragment glsl<
          gl_FragColor = vec4(abs(normal), 1.0);
        >
      >;

      # Draw the object with the above shader pair.
      draw_mesh(indices, size);
    >

In modern graphics programming, [*shader programs*][shader] are little chunks of code that run on the GPU to define objects' appearance.
Traditionally, you write shaders in special programming languages and then use OpenGL or Direct3D APIs to communicate with them from your CPU-side code.

With static staging, CPU and GPU code co-exist in the same program.
Those angle brackets in the SSC example above, like `< this >`, delimit the boundaries between different kinds of code, called *stages*.
This example uses four stages:

* The *setup stage*, which appears outside of any angle brackets and runs once when the program starts up.
* The *render stage*, which runs on the CPU to draw every frame.
* The *vertex stage*, which corresponds to the [vertex shader][vtx] in WebGL: it runs code on the GPU for every vertex in an object to determine its position.
* The *fragment stage*, which abstracts the [pixel shader][frag] and determines the color of every pixel on the surface of an object.

[shader]: https://en.wikipedia.org/wiki/Shader
[vtx]: https://www.opengl.org/wiki/Vertex_Shader
[frag]: https://www.opengl.org/wiki/Fragment_Shader
[bunny]: http://graphics.stanford.edu/data/3Dscanrep/

Those `render`, `vertex`, and `fragment` intrinsics decide when and where code runs.
You can annotate each stage with its kind: the GPU-side stages get the `glsl` annotation and the render stage gets a `js` annotation so it gets compiled to plain JavaScript.

## Placement and Communication

As the example above shows, variables in SSC programs can be shared between stages.
Cross-stage variable references are actually a special case of a more general communication construct in SSC called *materialization*.
Materialization lets you take an expression and run it at an earlier stage.
SSC automatically sets up a communication pipe to bring the resulting value back to the current stage.

In this example, we'll rotate the model's position on the CPU.
The materialization expression `%[ model * rot ]` multiplies the pre-defined model position matrix, `model`, by a rotation matrix `rot` and then sends the result to the GPU:

    # Original model position.
    var model = mat4.create();
    mat4.scale(model, model, vec3(3.5, 3.5, 3.5));
    mat4.translate(model, model, vec3(0.0, -0.7, 0.0));

    # Load buffers and parameters for the model.
    var mesh = load_obj("bunny.obj");
    var position = mesh_positions(mesh);
    var normal = mesh_normals(mesh);
    var indices = mesh_indices(mesh);
    var size = mesh_size(mesh);

    # ---

    # Create two identity matrices.
    var id = mat4.create();
    var rot = mat4.create();

    render js<
      # Rotate the identity matrix.
      var phase = Date.now() / 1000;
      mat4.rotateY(rot, model, phase);

      vertex glsl<
        # Multiply the model position by the rotation
        # matrix *on the CPU* and communicate it to
        # the GPU.
        gl_Position = projection * view * %[ model * rot ] * vec4(position, 1.0);
        fragment glsl<
          gl_FragColor = vec4(abs(normal), 1.0);
        >
      >;
      draw_mesh(indices, size);
    >

This example also calls a couple of JavaScript functions, `Math.sin` and `Date.now`.
We also used the `mat4.rotateY` function from the [`gl-mat4`][mat4] library of matrix utilities.
SSC compiles to plain JavaScript, so interop is easy.

[mat4]: https://github.com/stackgl/gl-mat4

# A Full Example

This example shows how to build larger programs using SSC.
You can abstract shaders into functions to keep your code clean when you draw scenes with more than one object.

This code listing elides the definitions of the `phong` and `solid` functions that wrap the two shaders.
You can see the full code in this page's source or [on GitHub][ex-full].
Try playing with the `light_color` variable at the top here to change the color of the light:

[ex-full]: https://github.com/sampsyo/braid/blob/master/site/index.md#a-full-example

    # Phong shader.
    def phong(pos: Float3 Array, norm: Float3 Array, model: Mat4, lightpos: Vec3, color: Vec3, specular: Float) (
      var camera_pos = eye(view);

      vertex glsl<
        gl_Position = projection * view * model * vec4(pos, 1.0);

        fragment glsl<
          # Convert to world space.
          var position_world = vec3(model * vec4(pos, 1.0));
          var normal_world = normalize(vec3(model * vec4(pos, 0.0)));
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

    # Simple, solid-color shader.
    def solid(pos: Float3 Array, model: Mat4, color: Vec3) (
      vertex glsl<
        gl_Position = projection * view * model * vec4(pos, 1.0);
        fragment glsl<
          gl_FragColor = vec4(color, 1.0);
        >
      >;
    );

    # Load buffers and parameters for the main model.
    var mesh = load_obj("teapot.obj");
    var position = mesh_positions(mesh);
    var normal = mesh_normals(mesh);
    var indices = mesh_indices(mesh);
    var size = mesh_size(mesh);

    # Position the teapot model.
    var model = mat4.create();
    mat4.translate(model, model, vec3(0.0, -10.0, 0.0));
    mat4.scale(model, model, vec3(0.2, 0.2, 0.2));

    # Light-source marker model.
    var bunny = load_obj("bunny.obj");
    var b_position = mesh_positions(bunny);
    var b_normal = mesh_normals(bunny);
    var b_indices = mesh_indices(bunny);
    var b_size = mesh_size(bunny);
    var b_model = mat4.create();

    # An identity matrix, which we'll use for model positioning.
    var id = mat4.create();

    # ---

    # The parameters for the Phong shader.
    var specular = 50.0;
    var light_color = vec3(1.0, 0.2, 0.5);

    render js<
      # Rotate a light-source point in a circle.
      var t = Date.now();
      var light_position = vec3(
        Math.cos(t / 400) * 14.0,
        0.0,
        Math.sin(t / 400) * 14.0
      );

      # Draw the teapot using the Phong shader.
      phong(position, normal, model,
            light_position, light_color,
            specular);
      draw_mesh(indices, size);

      # Place the bunny at the light source,
      # for illustrative purposes.
      mat4.translate(b_model, id, light_position);
      mat4.scale(b_model, b_model,
                 vec3(0.5, 0.5, 0.5));
      solid(b_position, b_model, light_color);
      draw_mesh(b_indices, b_size);
    >
