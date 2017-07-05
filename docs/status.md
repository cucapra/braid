# Loose Ends

If you keep playing with Braid, you'll quickly notice that this is a research prototype. Here are a few of the most glaring current omissions:

- Parse errors are frequently useless: they'll point you toward a seemingly irrelevant part of the code. In BraidGL mode, the line number also reflects the (hidden) preamble code.
- Type errors are often vague and don't have source position information.
- Missing control flow constructs: we have `if` and `while` but not `for`.
- Shaders and their parameters are currently coupled: you can't bind a single shader and reuse it with multiple sets of uniforms and attributes without re-binding.
- The set of exposed WebGL and GLSL features is small and ad hoc. We should expand our coverage of the built-ins.
    - Relatedly, your code mostly gets to play in a "sandbox" currently. You can't load arbitrary models or texture graphics.
- These intrinsics are not currently "world-specific." For example, you won't get a type error when trying to use [the GLSL function `normalize`][normalize] in host code or the [JavaScript function `Date.now`][Date.now] in shader code---things will just break silently.
- Functions defined in shader code are not supported. You should also be able to share functions defined at the host stage inside shaders; this is also not implemented.

[normalize]: https://www.opengl.org/sdk/docs/man/html/normalize.xhtml
[Date.now]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now

Here are some other features we're working on:

- Compiling to native code for interoperation with C and C++ codebases.
- Support for other shader kinds aside from just vertex and fragment shaders.
- Using the GPU for GP-GPU computation in addition to real-time graphics.

Some minor usability issues in the current prototype:

- The [interactive viewer library](https://github.com/hughsk/canvas-orbit-camera) that we use currently doesn't work with touch on mobile devices.
- The asset loader should only load the assets needed for the current program.
