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

You will find that the later examples switch the dingus into WebGL mode; the textual output is then replaced with a 3D rendering. You can interact with this view with your mouse. Click and drag to rotate the scene; scroll to zoom; and hold the "control" key while dragging to pan. If you ever get lost, just reload the page to reset; the code should not get erase.


Using the Language
------------------

In this segment, we will take a tour through the language via a few examples. The idea is to convince you that the implementation actually supports the language features described in the paper. You can follow along using the Braid dingus.

There is an exhaustive [language manual][docs] available online with complete details, but you should not need to read that to evaluate this artifact.

[docs]: https://capra.cs.cornell.edu/braid/docs/

### Basic Language

To get a feel for the [basic language structure][basics], load the `basics` example in the web dingus. This example shows you how to use variables, basic arithmetic, and functions in Braid. There's nothing all that interesting here, but play around here to see how the boring parts work.

The dingus shows the final result in the right-hand pane. You're currently in interpreter mode; the code gets type-checked and interpreted as you type.

[basics]: https://github.com/sampsyo/braid/blob/master/docs/basics.md

### Staging

TK

### Graphics

TK


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

    $ npm install -g vega-lite

Then you can run:

    $ make plots

to construct SVG and PDF plots. Conversion from SVG to PDF uses `rsvg-convert`, which you can get by installing the [rsvg][] package on your system.

We expect the absolute numbers for the performance results to vary significantly from GPU to GPU and from browser to browser, but the same rough trends shown in the paper should be visible on your machine.

[rsvg]: https://en.wikipedia.org/wiki/Librsvg
[Vega-Lite]: https://vega.github.io/vega-lite/
