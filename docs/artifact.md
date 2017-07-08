OOPSLA Artifact
===============

This page contains the instructions for the [OOPSLA 2017 artifact evaluation][aec] for the in-submission paper "Static Stages for Heterogeneous Programming."
The Braid artifact consists of the implementation of the Braid language and its real-time graphics extension, BraidGL.
(If you're not the artifact reviewer, you can read this as a step-by-step guide to doing something nontrivial with Braid.)

[aec]: http://2017.splashcon.org/track/splash-2017-OOPSLA-Artifacts


Contents
--------

There are ways to use this artifact: "from scratch" via a [source checkout][repo], a pre-compiled and pre-installed tarball, or in a VM image:

1. Source checkout. The implementation is [open source on GitHub][repo], and the [documentation there][readme] has instructions for how to build everything from scratch. This could be fun if you're into compiling things, but the next option is likely to be more convenient.
2. Compiled tarball. For the artifact evaluation, we've compiled all the sources and fetched all the [npm][] dependencies so you don't have to. You will still need to install minimal dependencies---namely, [Node][]---yourself. Nevertheless, **we recommend this option.** If you just want to run the version of Braid that lives in a browser, no dependencies (outside of your browser) are needed.
3. Virtual machine. For maximum bitrot prevention, we have also included a virtual machine image with everything set up to run the code. Even though VMs are the recommended delivery mechanism for artifacts, there's one problem with this particular artifact: **it is super hard to get GPU support working in most hypervisors**, especially in a portable way. This means you can't run the OpenGL version of Braid in the VM.

The rest of this guide will assume you're using the recommended option 2. If you choose option 1, you can follow the [setup docs][readme] to get things running. If you choose option 3, you can skip the next section.

For the virtual machine image, the user is called `oopsla` and the password is the same. There's a directory called `braid` in the home directory.

[readme]: https://github.com/sampsyo/braid/blob/master/docs/README.md
[repo]: https://github.com/sampsyo/braid
[Node]: https://nodejs.org/
[npm]: https://www.npmjs.com/


Setup
-----

The Braid compiler is written in [TypeScript][]. There are two ways to use it: on the command line via [Node][] and in a Web browser. Node is the main thing you need to [install][install node]. Here's how:

* On Linux, Node is probably available in your [package manager][install node]. For example, on Ubuntu and other Debian-based systems, use `apt-get install nodejs`.
* On macOS, you can use [Homebrew][]. Use `brew install node`.
* On Windows, you can use the [Node installer][].

For the Web version, you just need a modern browser. We have tested Braid in current versions of Safari, Chrome, Firefox, and Edge.

[Node installer]: http://nodejs.org/#download
[Homebrew]: https://brew.sh
[TypeScript]: https://www.typescriptlang.org
[install node]: https://nodejs.org/en/download/package-manager/


Command Line
------------

You should be able to run the command-line tool like this:

    $ node build/ssc.js --help

To make the `ssc` command available with less typing, you can run `npm link`. This will place the program in a directory you can find by typing `npm bin -g`. If you put that on your `$PATH`, then things get a little easier:

    $ ssc --help

(If you're curious, SSC stands for "Static Staging Compiler," which is from a time before Braid got a real name.)

Let's run a Braid program. There are lots of programs in the `test/` directory:

    $ ssc test/basic/print.ss
    42

By default, the tool runs in interpreter mode. Switch to compiler mode by using `ssc -cx`:

    $ ssc -cx test/basic/print.ss
    42

The result should always be the same (modulo pretty-printing). To see the JavaScript code that gets compiled from the Braid source, you can leave off the `-x`, which stands for *execute:*

    $ ssc -c test/basic/print.ss
    (function () {
      function main() {
        return 42;
      }
      return main();
    })()

The `-x` flag just `eval`s that compiled code along with a couple of runtime support functions.


The Tests
---------

You can check that Braid supports all the language features that it should by running its test suite. Each file in `test/` has a special `# ->` comment that indicates its expected output. The `-t` flag tests that each program's output matches the expectation:

    $ ssc -t test/basic/*.ss
    add ✓
    annotation-ok ✓
    assoc ✓
    [...]

To run the entire test suite, including both compiler and interpreter modes, use the `make test` target.

We encourage you to poke around in the `test/` directory to see lots of funky edge-case examples of Braid's static staging constructs.


Web Dingus
----------

It's much more exciting to interact with Braid via its web dingus. To use it, start a Web server in the `dingus/` directory. If you have Python installed, for example, you can do this:

    $ cd dingus
    $ python2 -m SimpleHTTPServer
    # ... or ...
    $ python3 -m http.server

That will start a server on port 8000. Go to <http://0.0.0.0:8000/> in your browser. You should see a text pane on the left-hand side. You can type Braid code there to see its result on the right-hand side. The compiler runs automatically as you type. For example, try copying and pasting this code into the text editor:

    var x = 2;
    var y = !< 37 + %[x] >;
    !< y + 3 >

You should see `42` appear on the right-hand side. Below the code, the interface should say "Int", which is the type of the program.

Now, try switching the dingus from interpreter mode to compiler mode. Below the text box, the first pop-up menu chooses the mode. If you switch to compiler mode, the right-hand side should still say `42`, but the interface should also show you the compiled JavaScript code too.

Next, try using the built-in examples. The second pop-up menu has a list. Try choosing each of them in order. We'll explain what's going on in the code a bit later, but feel free to explore.

You will find that the later examples switch the dingus into WebGL mode; the textual output is then replaced with a 3D rendering. You can interact with this view with your mouse. Click and drag to rotate the scene; scroll to zoom; and hold the "control" key while dragging to pan. If you ever get lost, just reload the page to reset; the code should not get erased.


Using the Language
------------------

In this segment, we will take a tour through the language via a few examples. The idea is to convince you that the implementation actually supports the language features described in the paper. You can follow along using the Braid dingus.

There is an exhaustive [language manual][docs] available online with complete details, but you should not need to read that to evaluate this artifact.

[docs]: https://capra.cs.cornell.edu/braid/docs/

### Basic Language

To get a feel for the [basic language structure][basics], load the `basics` example in the web dingus. This example shows you how to use variables, basic arithmetic, and functions in Braid. There's nothing all that interesting here, but play around here to see how the boring parts work.

The dingus shows the final result in the right-hand pane. You're currently in *interpreter mode*. The code gets type-checked and interpreted as you type.

You can also skip ahead to the `externs` example, which shows you how to use values from the JavaScript standard library.

[basics]: https://github.com/sampsyo/braid/blob/master/docs/basics.md

### Simple Multi-Stage Programming

Switch to the `quote and splice` example. This tiny program shows you the syntax for quoting code between `<>` brackets, executing code with `!`, and splicing together code with `[]`. These constructs appear in Section 3.1 of the paper submission.

To explore, try deleting the `!` on the second line---i.e., run this program:

    var x = <5>;
    < 37 + [x] >

Braid will just output `<quote>`, which isn't terribly helpful. This is because you're now in *compiler mode*, which is incapable of pretty-printing code by design. In a sense, this is the essence of static staging: we generate all code, for all stages, ahead of time, so there is no AST to pretty-print at run time.

Switch to interpreter mode using the left-hand pop-up menu to see that the result value is the code `< 37 + 5 >`, as you might expect. The interpreter *does* have a run-time AST representation, which is nice for debugging.

If you switch back to compiler mode, you can also inspect the generated JavaScript code. You'll see two (concatenated series of) string literals. These correspond to the two quotes, `<5>` and `<37+[x]>`, in your program. The second has a magic `__SPLICE_XX__` token to represent the splice brackets, `[x]`. There's a call to a `splice` runtime function in the main code that replaces this magic token with the code for the `<5>` program. If you use `!`, you'll see another runtime function, `run`: this is a wrapper around JavaScript's `eval`.

Another important feature in any multi-stage language is type checking. It should be impossible to mix up code and other values, for example. Try deleting the angle brackets around 5---i.e., run this program:

    var x = 5;
    !< 37 + [x] >

Braid should tell you something like:

    type error: splice escape produced non-code value

The type checker is complaining that, in the splice brackets `[x]`, the value `x` has type `Int`, not the code type `<Int>`. (You can read `<Int>` as *code which, when run, will produce an `Int`*.) You're not allowed to splice real values into code---doing so would require synthesizing code to represent the value. Instead, you need to use a *materialization* expression, which we'll see in the next section.

### Materialization

Switch to the example called `persist`. This little program uses a different kind of brackets, written `%[...]`, in place of the plain splice brackets. This time, it *is* legal to take a plain `Int` and communicate it into the quote. You can read more about materialization in Section 3.2 of the submitted paper.

This example shows that you can also implicitly refer to variables from earlier stages. This is (close to) syntactic sugar for explicitly using `%[...]` expressions.

The main takeaway here is in the generated JavaScript code. Notice that there is no `__SPLICE_XX__` nonsense in either of the string literals. Instead, the code refers to plain JavaScript variables to retrieve the materialized (a.k.a. "persisted") values. These values are never turned into strings; they just stay in memory. This is the key difference between splicing and materialization, of which traditional multi-stage languages only support the former.

You can also try switching back to interpreter mode again and removing the `!` on the final quote. The interpreter represents materialized values with opaque tokens, so you'll see this:

    < 37 + %0 >

where `%0` takes the place of the materialization. That's in contrast to the `< 37 + 5 >` we got when we spliced in code in that position.

Also take a quick look at the example called `w/o metaprogramming`. This example shows an *annotated* quote that starts with `js`. This annotation instructs Braid that the quote will not use splicing at all, so it's OK to avoid using strings and `eval` for the quote. Instead, the program gets emitted as a plain JavaScript function.

### Open Code and Pre-Splicing

Section 3.4 in the submission describes *open code*. Open code is an optional mode for writing quotes in Braid that introduces new powers and new restrictions. The new power is the ability to re-use a scope from a containing quote inside a splice. This program is illegal, for example:

    <
      var x = 5;
      [ <x> ]
    >

because Braid can't guarantee, in general, that `x` will be in scope when the inner quote runs. Open code relaxes this restriction. To use open code, you can annotate splice and quote brackets with a `$` character:

    <
      var x = 5;
      $[ $<x> ]
    >

This example is legal. Try it out in interpreter mode to see what it generates.

To make open code safe, Braid needs to know *statically* where a given quote will be spliced. This means that you can't pass `$<...>` quotes around arbitrarily.

For a more complete program, load the `pre-splicing` example in the dingus. This little program has a stage-1 variable called `flag` that controls how the stage-2 code behaves. Try toggling this variable between `true` and `false`.

The generated code reveals that an important optimization is taking place. Pre-splicing (Section 3.4.1) avoids any run-time splice operations by enumerating all possible resolutions of open-code escapes and just choosing between them at run time. There are no `__SPLICE_XX__` tokens here either, even though we're clearly using splicing.

### Staging-Based Macros

Switch to the `macros` example to see an example of Braid's macro syntax. Macro invocations like `@spif` in this example are just syntactic sugar for escaped function invocations. Read more about the macro system in Section 3.5 of the paper.

### Graphics

At last, we're ready to see an example that uses Braid's WebGL capabilities. Switch to the `basic shader` example. This little graphics program is not too different from the example in the paper's Section 2, which introduces the graphics pipeline and WebGL.

In WebGL mode, the compiler supports a bunch of graphics-specific intrinsics. For example, the `load_obj` function loads a mesh data file from the server. There are also special data types; for example, the `mat4.create()` call in this example creates a matrix value of type `Float4x4`.

The main interesting bit here is the triply-nested set of staging quotes marked with the intrinsics `render`, `vertex`, and `fragment`. Respectively, these indicate code that runs per frame on the CPU, in the vertex shader stage of the GPU graphics pipeline, and in the fragment (pixel) shader stage. The stages are nested in this way because data can flow from the earlier stages to the later stages, inward through the hierarchy. Each stage has a specific responsibility:

* The render stage should call `draw_mesh` at least once to kick off the rendering pipeline.
* The vertex stage should assign to `gl_Position` to determine the position, in 3D space, of every vertex in the mesh.
* The fragment stage should assign to `gl_FragColor` to determine the color of a pixel on the surface interpolated between the vertices.

For a slightly more complicated example, switch to `two objects` in the dingus. This one demonstrates:

* How to wrap vertex/fragment shader pairs in functions so they can be reused.
* How to call `draw_mesh` multiple times to draw more than one object.
* Using `extern`s like `Math.sin` and `Date.now` to do simple animation.

So far, these two examples have been trivial demos. Let's try a real 3D effect. Load the `phong lighting` example to see a shiny bunny. The vertex and fragment shaders are a bit more sophisticated here.

BraidGL also supports texture mapping. Load up the `texture` example to see calls to:

* `load_image`, which can fetch any major image type from the server;
* `texture`, which converts DOM image data into a WebGL texture object;
* and `texture2D` in the fragment shader, which looks up a color in a texture.

For the two most complex graphics examples, try `head` and `couch`. There are no fundamentally new features here, but you can see all the pieces composed in useful ways. There is a bit more background on these examples in the evaluation section of the paper.


Browsing the Code
-----------------

If you're interested, you can have a look around the TypeScript source code for the Braid implementation. There is an excruciating level of detail available [in the documentation section on the compiler architecture][hacking], but here's are a few highlights of what's available in the source:

* `src/`: The main language implementation source.
    * `driver.ts`: Coordinates the pieces and runs the whole thing. Both the command-line tool and the web dingus start here.
    * `grammar.pegjs`: The [PEG.js][] parser generator source.
    * `ast.ts` and `type.ts`: The AST and type data structures.
    * `type_check.ts`: The type checker for the base language. This uses a generic visitor interface for ASTs defined in `visit.ts`. In `type_elaborate.ts`, there's a bit of bookkeeping for storing the deduced type for every expression in an AST.
    * `interp.ts`: The interpreter, which uses the pretty-printer in `pretty.ts`.
    * `sugar.ts`: Desugaring passes for macros and (in interpreter mode) cross-stage variable references.
    * `compile/`: The middle-end tools for analyzing Braid ASTs.
        * `ir.ts`: The data structures for all the analysis information produced by these tools. Start with the main `CompilerIR` interface.
        * `defuse.ts`: Definition/use analysis.
        * `lift.ts`: Analysis for lambda lifting (closure conversion) and the analogous operation for quotes.
    * `backends/`: Code generation.
        * `js.ts`: The main JavaScript code generation rules.
        * `glsl.ts`: Similarly, the code generation rules for producing GLSL soruce.
        * `webgl.ts`: An extended version of the JavaScript backend with a bunch of intrinsics for writing WebGL.
        * `gl.ts`: Shared resources for both the shader and host side of WebGL programs. This includes new type definitions for vectors and matrices, for example.
* `ssc.ts`: The entry point for the command-line tool.
* `dingus/`:  The Web dingus source and assets.
    * `src/`: The TypeScript source for the dingus.
    * `examples/`: All the example programs that show up in the dingus pop-up menu.
* `docs/`: The documentation, including this artifact instruction document. The documentation is rendered with [Gitbook][].

If you're interested in browsing TypeScript source code, I recommend using [Visual Studio Code][vscode].

[vscode]: https://code.visualstudio.com
[PEG.js]: https://github.com/pegjs/pegjs
[Gitbook]: https://www.gitbook.com
[hacking]: https://github.com/sampsyo/braid/blob/master/docs/hacking.md


Reproducing the Results
-----------------------

You can also run the performance evaluation we performed for the paper.

### Collect Performance Data

The performance test harness works by launching a bunch of versions of Braid programs in a special version of the web dingus. The browser streams performance data back to the test harness server using HTTP requests, and the harness records the data on disk.

This testing infrastructure requires Make and Python 3 in addition to Node.

To collect the performance data for one program, try this:

    $ node build/harness.js bench/solid.ss

This will open your default Web browser, load a test scene, take some measurements over a period of about ten seconds, and then shut down. Here are a couple of notes on the performance measurements:

* While the main, interactive dingus has its framerate limited by the browser to a [reasonable animation speed][raf], this test harness does not. It draws frame *as fast as it can*.
* The benchmarks all draw a grid consisting of many copies of the same object to stress-test the animation loop. Some of the scenes can get quite computationally intensive.

See the evaluation section of the paper for more details on the methodology.

To collect performance data for *all* the benchmarks, type:

    $ make latencies.json

This will collect raw performance logs into the `collected` directory and then use a Python script to summarize the results into one JSON file.

[raf]: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame

### Draw Plots

You can draw the performance charts from the paper using the collected data. The plotting tool is [Vega-Lite][], so you will need to install that. It's usually as easy as:

    $ npm install -g vega@2.6.1
    $ npm install -g vega-lite@1.0.15

Then you can run:

    $ make plots

to construct SVG and PDF plots. Conversion from SVG to PDF uses `rsvg-convert`, which you can get by installing the [rsvg][] package on your system.

We expect the absolute numbers for the performance results to vary significantly from GPU to GPU and from browser to browser, but the same rough trends shown in the paper should be visible on your machine.

[rsvg]: https://en.wikipedia.org/wiki/Librsvg
[Vega-Lite]: https://vega.github.io/vega-lite/
