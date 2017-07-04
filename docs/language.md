This is an example-based introduction to programming with static staging.
It describes the static staging compiler, its basic language Braid, and its graphics-centric extended language BraidGL.

# The Basics { #basics }

Braid has a tiny, imperative core language. You can assign to variables with `var`, do basic arithmetic, and define functions with `def`:

    var g = 9.8;
    def gpe(mass:Float, height:Float)
      mass * height * g;
    gpe(2.0, 3.0)

This program evaluates to around 58.8. (You can click on any of the examples in this document to run them in your browser.)

There's also an ML-esque syntax for defining and invoking functions, which can occasionally be more appropriate:

    var g = 9.8;
    var gpe = fun mass:Float height:Float -> mass * height * g;
    gpe 2.0 3.0

The language can also interoperate with JavaScript. Use `extern` to declare something from JavaScript land:

    extern Math.PI: Float;
    def circumference(radius:Float)
      2.0 * Math.PI * radius;
    circumference(5.0)


# Multi-Stage Programming

Braid, as the name implies, is a [multi-stage programming language][metaml]. This section introduces its constructs for deferring execution (quote), "un-deferring" expressions (escape), and executing deferred code (run).

[metaml]: http://dl.acm.org/citation.cfm?id=259019
[metaocaml]: http://okmij.org/ftp/ML/MetaOCaml.html#implementing-staging
[terra]: http://terralang.org
[jeannie]: http://cs.nyu.edu/rgrimm/papers/oopsla07.pdf
[scala lms]: https://scala-lms.github.io/

## Quote and Run

Angle brackets denote a quote, which defers the execution of some code:

    < 40 + 2 >

A quote produces a code value. Like a closure, a code value is a first-class value representing a computation. To execute a code value, use the `!` operator:

    var code = < 21 * 2 >;
    !code

If you compile that code to JavaScript, you'll see that the quoted code gets compiled to a string literal---it is literally placed in quotation marks. To execute code, the emitted program uses a function called `run`, which is a small wrapper around JavaScript's `eval`.

## Splice

*Splicing* is a defining feature of classic staged languages. You use it to combine quoted code, stitching together pieces into complete programs.

To splice one code value into another, use an *escape* expression, which is denoted by square brackets:

    var a = < 7 * 3 >;
    var b = < [a] * 2 >;
    !b

You can think of `[a]` as invoking a three-step process: First, it *escapes* to the outer context, where `a` is defined. In that context, it evaluates `a` to get the code value `< 7 * 3 >`. Finally, it splices that code into the current quote to produce a code value equivalent to `< (7 * 3) * 2 >`.

If you look at the compiled JavaScript code, you'll see that the second string literal---the one representing the quotation `< [a] * 2 >`---has a placeholder token in it. (As of this writing, the token was `__SPLICE_10__`.) The program uses this along with JavaScript's `string.replace` function to stitch together code at run time before `eval`ing it. The logic for this string manipulation is encapsulated in a runtime function called `splice`.

## Persist

Braid has a second kind of escape expression called a *persist* escape. Rather than splicing together code at run time, persists let you share data between stages. Persist escapes are written with a leading `%` sign:

    var pi = 3.14;
    def calc_area(r:Float)
      < %[pi] * %[r * r] >;
    !calc_area(5.0) + !calc_area(2.0)

Like a splice escape, a persist escape shifts to the context outside of the quote and evaluates an expression. But instead of taking another code value and merging it in, a persist gets an ordinary value---here, plain old numbers---and makes them available inside the quote.

The difference may seem subtle, but it has an important effect on the generated code. This example has two calls to `calc_area` with different values for `r`. If we had used a splice, it would have created and executed two different programs at run time---each with a different number inlined in place of `r`. Instead, the compiled JavaScript only has one string literal in it, and no string splicing occurs at run time.

## Cross-Stage References

Braid includes syntactic niceness for persisting data without explicit escape expressions. In the previous section's example, we performed one multiplication (`r * r`) in the first stage and a second multiplication (by `pi`) in a second stage. If you want to perform both multiplications at the same stage, then you could write `< %[pi] * %[r] * %[r] >`. Braid lets you omit the persist-escape brackets when all you need is a single variable:

    var pi = 3.14;
    def calc_area(r:Float)
      < pi * r * r >;
    !calc_area(5.0) + !calc_area(2.0)

The code inside the quote can pretend that it shares the same variables that are available outside of the quote. The classic literature on multi-stage programming calls this shared-scope effect *cross-stage persistence*, but you can also think of it as syntactic sugar for explicit `%[x]` escapes. In fact, this is how Braid works: you can see that it generates exactly the same JavaScript code whether you surround `pi` and `r` in persist-escape brackets or not.

## Staging Without Metaprogramming

If you don't use any splicing, quotes can feel very similar to lambdas. A lambda also wraps up code to run later, and via closures, a lambda can also share state from the enclosing scope where it is defined. In fact, it can seem silly that Braid uses string literals and `eval` where an ordinary function would do just fine.

In recognition this correspondence, Braid lets you write quotes that compile to JavaScript functions. They have the same semantics as ordinary `eval`-based quotes---only their implementation, and therefore their performance, differs. To use function stages, you can *annotate* quotes with `js`, like this:

    var x = 21;
    var doubler = js< x + x >;
    !doubler

The JavaScript code that Braid generates for this program doesn't have any string literals at all---and it won't use `eval` at run time.

The compiler needs keeps track of the kinds of programs so it knows how to execute them with `!`. The type system tracks the annotation on each quote. Here's a function that indicates that it takes a function (`js`-annotated) quote:

    def runit(c:js<Int>)
      !c;
    runit(js<2>)

You'll get a type error if the annotations don't match:

    def runit(c:<Int>)
      !c;
    runit(js<2>)

## N-Level Escapes { #multiescape }

Braid generalizes escapes to move across multiple stages at once. You can write a number after a splice `[e]` or persist `%[e]` escape to indicate the number of stages to look through:

    var c = <5>;
    !< 2 + !< 8 * 2[c] > >

The escape `2[c]` gets the value to splice from *two* levels up---where `c` is defined---rather than just shifting to the immediately containing quote.

At first glance, it might look like `n[e]` or `%n[e]` is just syntactic sugar for $$n$$ nested escapes, like `[[e]]` or `%[%[e]]`. This is close to true semantically, but as with cross-stage references and program quotes, the differences are in performance.

Take another look at the splicing example above. It uses a form like `< ... < 2[e] > ... >` to splice code from the main stage *directly* into a nested program. That is, the expression $$e$$ is evaluated when the outer quote expression is evaluated, and the resulting program should do *no further splicing* when it is executed. In other words, if we inspect the program that the splice generates:

    var c = <5>;
    < 2 + !< 8 * 2[c] > >

we'll see a splice-free nested program, `< 2 + !< 8 * 5 > >`. (You may need to switch the tool's mode to "interpreter" to see this pretty-printed code.) That's in contrast to this similar program that uses nested splices:

    var c = <<5>>;
    < 2 + !< 8 * [[c]] > >

which produces `< 2 + !< 8 * [<5>] > >`, a program that will splice the number 5 into the inner quote when it eventually executes. Nesting a persist inside a splice, as in `[%[c]]`, has a similar drawback. In fact, it is impossible to implement $$n$$-level escapes as syntactic sugar: they are required to splice directly into nested quotes. We'll also see below that they model certain CPU--GPU communication channels that can skip stages.


# Metaprogramming

Splicing is the basis of Braid's metaprogramming tools.
This section describes extensions beyond the basic splices we've already seen that make metaprogramming more powerful.

## Open Code

So far, each quote has had its own independent scope. No two quotes get to share the same set of local variables, and that includes quotes nested inside escapes. It's important to prohibit programs like this, for example:

    <
      var x = 5;
      [ x ]
    >

because the reference to `x` would run before `x` is defined. Prohibiting this more complex example might seem less intuitive, but it's illegal for the same reason:

    <
      var x = 5;
      [
        < x * 2 >
      ]
    >

The reference to `x` won't typecheck because it wasn't defined in the inner quote's enclosing scope, which doesn't include variables from the outer quote.

But for metaprogramming, scopes that span multiple quotes can be important. Say, for example, that you want to compute either the surface area or the volume of a sphere given its diameter:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      <
        var r = d / 2.0;
        pi * r * r * [
          if volume
            < 4.0 / 3.0 * r >
            < 4.0 >
        ]
      >;
    !sphere(4.0, 1)

You need to share the value of `r` between the outer quote and the first inner quote (to compute the volume as $$\frac{4}{3} \pi r^3$$).

To make this work, Braid supports special kinds of escape and quote that can preserve scopes. They're called *open code* quotes, and you use them by prefixing escapes and quotes with the `$` character. This modified example works:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      <
        var r = d / 2.0;
        pi * r * r * $[
          if volume
            $< 4.0 / 3.0 * r >
            $< 4.0 >
        ]
      >;
    !sphere(4.0, 1)

When a quote is marked with a `$`, it inherits its scope from the nearest containing escape---if it is also marked with a `$`. (Syntax mnemonic: `$` is for \$plicing \$nippets.)

Open code's scope sharing is in tension with the self-contained, reusable nature of garden-variety quotes. In fact, confusing self-contained programs with partial pieces of code causes lots of problems in [other work on multi-stage programming][mint]. Since open code can contain variables referenced elsewhere, it would be meaningless to run them independently or to splice them anywhere other than their one true intended splicing point.

[mint]: http://www.cs.rice.edu/~mgricken/research/mint/download/techreport.pdf

Braid uses a simple strategy to make sure that an open code value can only be spliced into its intended destination. The language gives a special, one-off type to open code values that identifies their splice points. This sneaky program, for example:

    var c = <0>;
    <
      var x = 5;
      $[ c = $<x> ]
    >;
    !c

tries to squirrel away an open code value that refers to a variable from the outer quote. Braid will helpfully complain that the `$<x>` expression has a special type that can't be assigned into a variable with type `<Int>`. That special type has only one purpose: to be spliced into one specific point in one specific program.

## Pre-Splicing

Aside from giving you scope-spanning, open code can also be compiled more efficiently. The key factor is the same property that lets them span scopes: they can be spliced into exactly one other program point.

Check out the JavaScript code generated from the sphere example above. Unlike previous examples that used splicing, the code here has no magical `__SPLICE_N__` tokens and no runtime `splice` calls. There is no run-time code generation at all. Instead, the two choices for completing the program have been *inlined*. To decide how the quote should behave, the program just chooses between the two complete program variants stored in two different JavaScript strings (called `q10_25` and `q10_31` as of this writing).

In fact, unlike ordinary splicing, you can use open-code splicing with `js<...>` function-backed quotes. Look at the code generated for this version of our example:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      js<
        var r = d / 2.0;
        pi * r * r * $[
          if volume
            $< 4.0 / 3.0 * r >
            $< 4.0 >
        ]
      >;
    !sphere(4.0, 1)

There are two specialized variants of the function for the quote. There's no code in string literals and no `eval` monkey business in sight.

Pre-splicing is important because it lets you use staging to express *compile-time* metaprogramming in the same way that you can write *run-time* metaprogramming. Open code and pre-splicing are necessarily more restrictive, but they let you avoid the costs of more general run-time splicing.

On the command line, you can optionally disable the presplicing optimization. Use the `-P` flag (with the ordinary `-c` flag to use the compiler) to see the effect.

## Macros

Braid has macros.
In fact, the staging concepts you already know are already enough to implement something very close to macros you know and love!
Braid just uses a little syntactic sugar to make them work.

Fundamentally, a macro is just a function that takes code as arguments and produces code as its return value.
In Braid, that's exactly how you define a macro:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;

To use a macro, type its name prefixed with an `@` symbol:

    @add 1 2

Unlike an ordinary function call, like `add 1 2`, the arguments to a macro invocation are treated as *code*, as if you had wrapped them in angle brackets.
Like this:

    add <1> <2>

A macro invocation also automatically escapes *to the point where the name was defined*.
Specifically, this:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;
    < @add 1 2 >

is syntactic sugar for this:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;
    < [ add <1> <2> ] >

Intuitively, you can think of the `@` symbol as saying, "Escape out to where the macro was defined, invoke it with my arguments as unevaluated code, and then splice its result back in here."
In other words, macros are just functions that run at an earlier stage.

### Open Code and Macros

Open-code splicing composes with macros.
Together, they enforce *macro hygeine*, letting you safely use variables from the scope surrounding the macro invocation.

To make this work, Braid uses the types on the parameters to the macro function.
Decorate your function's argument types with a `$` to indicate that the argument should be an open-code quote:

    def left(lhs: $<Int>, rhs: $<Int>)
      lhs;
    < var x = 1; var y = 2; @left x y >

When the macro function has an open-code parameter type, the corresponding argument quote behaves like an open-code quote. So the `@left x y` invocation above desugars to:

    $[ left $<x> $<y> ]

Open-code escapes are powerful because they can use variables from the surrounding scope, but they come with corresponding limitations: most importantly, you can't run (`!`) them.


# Code Generation

This section describes how to invoke Braid's compiler or interpreter to generate code.

You can use the interpreter mode to generate Braid code, which you can then feed back into the interpreter.
Use the `-g` flag to the command-line tool to make it emit the *body* of a residualizable code value produced by the program.
For example:

```sh
$ echo 'var x = <5>; < [x] + 2>' | &tool;
< 5 + 2 >
$ echo 'var x = <5>; < [x] + 2>' | &tool; -g
5 + 2
$ echo 'var x = <5>; < [x] + 2>' | &tool; -g | &tool;
7
```

The code must be residualizable: it must not contain any persists.
For example, this will produce an error:

```sh
$ echo 'var x = 5; < %[x] + 2>' | &tool; -g
```

indicating that the resulting code value `< %0 + 2 >` can't be residualized.

In compiler mode, the `-g` flag does not produce Braid source code; instead, it produces JavaScript code.
You can execute this code by passing it into `node`, probably with the `-p` flag to print its output.
For example:

```sh
$ echo 'var x = <5>; < [x] + 2>' | &tool; -cxg
(... a bunch of JavaScript ...)
$ echo 'var x = <5>; < [x] + 2>' | &tool; -cxg | node -p
7
```

If you like, you can save this JavaScript code to a file to execute it later.


# Graphics { data-mode=webgl }

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

## WebGL and GLSL Intrinsics

BraidGL gives you access to parts of the [WebGL API][webgl] for host-side code and [GLSL built-ins][glsl ref] in shader code. It also provides several handy higher-level operations from libraries that extend the WebGL basics. All of these are exposed using [`extern`s][#basics] in a standard preamble. You can see the definitive list in [the source code for this preamble][preamble]. Here are a few important intrinsics you'll need:

[preamble]: https://github.com/sampsyo/braid/blob/master/dingus/gl_preamble.ss

* `teapot`, `bunny`, and `snowden`: `Mesh`. Sample object assets.
* `mesh_positions`: `Mesh -> Float3 Array`. Get the vertex positions from a mesh. Under the hood, a `Float3 Array` is implemented as a WebGL buffer.
* `mesh_indices`: `Mesh -> Int3 Array`. Get the triangle vertex indices for a mesh.
* `mesh_size`: `Mesh -> Int`. Get the size (in triangles) of a mesh.
* `draw_mesh`: `(Int3 Array) Int -> Void`. Draw an object given its index array and the length of the array using the currently bound shader. Uses [`gl.drawElements`][drawelements] under the hood.
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

### Vertex Attributes

Graphics APIs have a second mechanism for sending data to shaders that differs per vertex, called *vertex attributes*. In our above example, the `position` variable is an array of vectors indicating the location of each vertex. We don't want to pass the entire array to every invocation of the vertex shader---instead, each invocation should get a different vector, as if we had called `map` on the array.

To this end, BraidGL handles cross-stage persistence specially when sharing arrays from the host to a shader. If an expression `e` has type `T Array`, then in a shader quote, the persist-escape expression `%[e]` has the element type `T`. The compile code uses WebGL's APIs to bind the array as an attribute instead of a uniform.

When a program uses an attribute at the fragment stage, OpenGL can't communicate the value directly. (There is no such thing as a "fragment attribute.") Instead, BraidGL implements the communication by generated code at the vertex stage to pass the current value to the fragment stage.

[uniform]: https://www.opengl.org/wiki/Uniform_(GLSL)
[uniformMatrix4fv]: https://msdn.microsoft.com/en-us/library/dn302458(v=vs.85).aspx

### Varying

The third communication mode that BraidGL provides is between different stages of the graphics pipeline. If you need to perform some computation in the vertex stage and communicate it to the fragment stage, this is the mechanism you need. In OpenGL, variables like this use a `varying` qualifier, so they are sometimes just called *varyings*. In BraidGL, stage-to-stage communication looks the same between GPU stages as it does when communicating from the CPU and GPU. Persists and cross-stage references work how you expect them to, and BraidGL compiles them to GLSL varyings.

## Reusable Shaders

So far, our example has statically inlined the shading code with the host code. Realistically, we need to be able to separate the two. This separation is not only helpful for building a cleaner abstraction, but also so the shader can be decoupled from the object it "paints": you'll want to draw multiple objects with a single shader, or choose between multiple shaders for a single object.

In BraidGL, you can encapsulate shaders just by wrapping them in functions. Since shader programs are first-class values, this works without any special consideration:

    def solid(pos: Float3 Array, model: Mat4, color: Vec3)
      vertex glsl<
        gl_Position = projection * view * model * vec4(pos, 1.0);
        fragment glsl<
          gl_FragColor = vec4(color, 1.0);
        >
      >;

This function, `solid`, takes the vertex position array and model-space matrix for the object it will draw along with the color to use as a red/green/blue vector. The global `projection` and `view` matrices come from closed-over state. Passing the shader to the `vertex` intrinsic binds it and its associated uniforms and attributes.

Here's [a more complete example][example-objects] that uses a function-wrapped shader to draw two different objects.

[example-objects]: https://microsoft.github.io/staticstaging/dingus/#example=objects


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
