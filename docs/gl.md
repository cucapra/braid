# Graphics

Braid has a graphics-oriented extension called BraidGL. In BraidGL mode, the compiler targets a combination of JavaScript with WebGL API calls and [GLSL][], the associated low-level shading language.

[glsl]: https://www.opengl.org/documentation/glsl/

## Shader Quotes

The most obvious extension that BraidGL adds is quotations that compile to GLSL shader code. Recall that we previously *annotated* quotes with `f` to make the compiler emit them as JavaScript functions; a new annotation, `s`, switches to emit them as shader programs.

BraidGL also has a couple of intrinsic functions, `vertex` and `fragment`, to indicate vertex and fragment shaders. A fragment-shader quote is contained within a vertex-shader quote because it's a later stage. Here's a useless BraidGL program:

    vertex glsl< fragment glsl< 1.0 > >

Take a look at the compiler's output. You'll see two string literals in the final JavaScript, both of which contain a `void main() {...}` declaration that characterizes them as GLSL shader programs.

## Render, Vertex, Fragment

BraidGL programs use three kinds of stages. We've already seen two: the vertex shader stage and the fragment shader stage. Both of thee run on the GPU. The third stage is the *render loop* stage, which distinguishes code that runs on the CPU for every frame from code that runs once at setup time.

The render stage needs to be a function quote (annotated with `f`), and you pass it to an intrinsic function called `render` to register it as the render-loop code. Inside the vertex and fragment shader stages, your job is to assign to the intrinsic variables `gl_Position` and `gl_FragColor` respectively. In the initial setup stage, there are also intrinsics to load a few built-in sample model assets. Here's a tiny example that uses all of the BraidGL stages:

    # Load the mesh data for a sample model.
    var mesh = teapot;
    var position = mesh_positions(mesh);
    var indices = mesh_indices(mesh);
    var size = mesh_size(mesh);

    render js<
      # Bind the shader program.
      vertex glsl<
        # Compute the final position of the model's vertex. The `projection`
        # and `view` matrices are provided by the runtime context.
        gl_Position = projection * view * vec4(position, 1.0);

        fragment glsl<
          # Use a solid color.
          gl_FragColor = vec4(0.5, 0.3, 0.7, 1.0);
        >
      >;

      # Draw the model with the above bound shader.
      draw_mesh(indices, size);
    >

There's a lot going on even in this small example. The next two sections will introduce the graphics-specific intrinsics that the example uses and the way data is shared between the stages. Then, we'll move on to more interesting graphics.

**TK: Start with a simpler example (no mesh).**

## GL Types

Braid's graphics mode adds a handful of new types to the language that mirror OpenGL types. There are fixed-size vector types, such as `Int2` and `Float4`, as well as small matrix types, such as `Float4x4`. These names are inspired by the more explicit Direct3D style, but the float versions also have aliases that mirror the OpenGL style: for example, `Vec3` is another name for `Float4`, and `Mat4` is the same as `Float4x4`.

There are also new polymorphic types for arrays.
The type `T Array` for any `T` is implemented as a JavaScript array on the host whose elements are of type `T`.
A different but related polymorphic type is `T Buffer`, which represents a GPU-allocated buffer filled with `T`-type elements.
The CPU can hold references to these GPU-side buffers but it cannot modify them directly.
See [the section on attributes](#attr) for more details on how to use `T Buffer`s to send data from the CPU to the GPU shaders.

## WebGL and GLSL Intrinsics

BraidGL gives you access to parts of the [WebGL API][webgl] for host-side code and [GLSL built-ins][glsl ref] in shader code. It also provides several handy higher-level operations from libraries that extend the WebGL basics. All of these are exposed using [`extern`s](/basics.md) in a standard preamble. You can see the definitive list in [the source code for this preamble][preamble]. Here are a few important intrinsics you'll need:

[preamble]: https://github.com/cucapra/braid/blob/master/dingus/gl_preamble.ss

* `teapot`, `bunny`, and `snowden`: `Mesh`. Sample object assets.
* `mesh_positions`: `Mesh -> Float3 Buffer`. Get the vertex positions from a mesh. Under the hood, a `Float3 Buffer` is implemented as a WebGL buffer.
* `mesh_indices`: `Mesh -> Int3 Buffer`. Get the triangle vertex indices for a mesh.
* `mesh_size`: `Mesh -> Int`. Get the size (in triangles) of a mesh.
* `draw_mesh`: `(Int3 Buffer) Int -> Void`. Draw an object given its index array and the length of the array using the currently bound shader. Uses [`gl.drawElements`][drawelements] under the hood.
* `projection` and `view`: `Float4x4`. Transform matrices corresponding to the viewer's canvas shape and camera position.

These intrinsics use matrix and vector types such as `Float4` (a 4-element float vector) and `Int3x3` (a 3-by-3 matrix of integers). We provide aliases to make these comfortable for people coming from Direct3D and HLSL (`Float3` and `Float3x3`) and from OpenGL (`Vec3` and `Mat4`). These alternate names can be used interchangeably.

[drawelements]: https://msdn.microsoft.com/en-us/library/dn302396(v=vs.85).aspx
[webgl]: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
[glsl ref]: https://www.opengl.org/sdk/docs/man4/index.php

## Cross-Stage Persistence in BraidGL

While sharing data between stages is straightforward in Braid's homogeneous JavaScript mode, the BraidGL mode has more work to do to build communication channels among the CPU and the rendering stages on the GPU.

### Uniform Variables

In the example above, we use cross-stage persistence to share data between the CPU and GPU. For example, the `model` matrix is initialized in the setup stage but used in the vertex shader. When a host communicates a value to a shader like this, it is traditionally called a [uniform variable][uniform], because the value is constant across invocations of the shader body. In the compiled code for the above example, you'll see several calls like `gl.uniformMatrix4fv(...)`. That's [the WebGL function for binding uniforms][uniformMatrix4fv] of the appropriate type.

It is also possible to share uniform data directly from the CPU to the fragment stage (skipping the vertex stage). This case is based on [$$n$$-level escapes][#multiescape]. You can use explicit two-level escapes like `2[ e ]` or implicit cross-stage references to get this effect.

If different stages use the same uniform variable, BraidGL only needs to bind it once.

### Vertex Attributes {#attr}

Graphics APIs have a second mechanism for sending data to shaders that differs per vertex, called *vertex attributes*. In our above example, the `position` variable is an array of vectors indicating the location of each vertex. We don't want to pass the entire array to every invocation of the vertex shader---instead, each invocation should get a different vector, as if we had called `map` on the array.

To this end, BraidGL handles cross-stage persistence specially when sharing arrays from the host to a shader. If an expression `e` has type `T Buffer`, then in a shader quote, the persist-escape expression `%[e]` has the element type `T`. The compile code uses WebGL's APIs to bind the array as an attribute instead of a uniform.

When a program uses an attribute at the fragment stage, OpenGL can't communicate the value directly. (There is no such thing as a "fragment attribute.") Instead, BraidGL implements the communication by generated code at the vertex stage to pass the current value to the fragment stage.

[uniform]: https://www.opengl.org/wiki/Uniform_(GLSL)
[uniformMatrix4fv]: https://msdn.microsoft.com/en-us/library/dn302458(v=vs.85).aspx

### Varying

The third communication mode that BraidGL provides is between different stages of the graphics pipeline. If you need to perform some computation in the vertex stage and communicate it to the fragment stage, this is the mechanism you need. In OpenGL, variables like this use a `varying` qualifier, so they are sometimes just called *varyings*. In BraidGL, stage-to-stage communication looks the same between GPU stages as it does when communicating from the CPU and GPU. Persists and cross-stage references work how you expect them to, and BraidGL compiles them to GLSL varyings.

## Reusable Shaders

So far, our example has statically inlined the shading code with the host code. Realistically, we need to be able to separate the two. This separation is not only helpful for building a cleaner abstraction, but also so the shader can be decoupled from the object it "paints": you'll want to draw multiple objects with a single shader, or choose between multiple shaders for a single object.

In BraidGL, you can encapsulate shaders just by wrapping them in functions. Since shader programs are first-class values, this works without any special consideration:

    def solid(pos: Float3 Buffer, model: Mat4, color: Vec3)
      vertex glsl<
        gl_Position = projection * view * model * vec4(pos, 1.0);
        fragment glsl<
          gl_FragColor = vec4(color, 1.0);
        >
      >;

This function, `solid`, takes the vertex position array and model-space matrix for the object it will draw along with the color to use as a red/green/blue vector. The global `projection` and `view` matrices come from closed-over state. Passing the shader to the `vertex` intrinsic binds it and its associated uniforms and attributes.

Here's [a more complete example][example-objects] that uses a function-wrapped shader to draw two different objects.

[example-objects]: ../dingus/#example=objects
