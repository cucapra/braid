Getting Started with Braid
==========================

This is an example-based introduction to programming with static staging.
It describes the static staging compiler, its basic language Braid, and its graphics-centric extended language BraidGL.

## Build and Run

To get the compiler running, install [Node][] and [npm][]. Then, on Unix, just type `make` to install the dependencies and build the project. Or you can run these commands manually:

    $ npm install
    $ npm run build

Then, you can install the `ssc` command-line program by typing:

    $ npm link

To make sure it's working, you can try running an example:

    $ ssc test/basic/add.ss

[npm]: https://www.npmjs.com/
[Node]: https://nodejs.org/

### Command Line

Type `ssc -h` for usage. The most important options are:

* `-c`: Use the compiler to JavaScript. Otherwise, the interpreter is used instead. By default, this dumps the compiled JavaScript code to the standard output.
- `-x`: When in compiler mode, run the resulting JavaScript code with `eval` and print the output. Together, `-cx` should give you the same output as running the interpreter (with no options at all).
- `-w`: Use the WebGL language extension. (Only valid in compiler mode.)

There's also `-v` for debugging output and `-g` for program generation, as described in the language overview.

### Web Dingus

There's also an interactive browser frontend. On Unix, just type `make` in the `dingus` directory, or otherwise use the same `npm run build` dance. Then, open `index.html` in your browser.

The dingus seems to work in current versions of Safari, Firefox, Chrome, and Microsoft Edge.
