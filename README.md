Braid: a Static Staging Compiler
================================

[![build status](https://circleci.com/gh/sampsyo/braid.svg?style=shield)](https://circleci.com/gh/sampsyo/braid)

Braid is an experimental programming language for heterogeneous systems based on multi-stage programming. See [the documentation][docs] for an introduction to the language.

The compiler is written in [TypeScript][] and runs on [Node][].
You can build the compiler and run a few small programs by typing `make test` (if you have [npm][]).
Check out the [code documentation][hacking] for an introduction to the compiler's internals.

[npm]: https://www.npmjs.com/
[Node]: https://nodejs.org/
[TypeScript]: http://www.typescriptlang.org/
[docs]: https://capra.cs.cornell.edu/braid/docs/
[hacking]: https://capra.cs.cornell.edu/braid/docs/hacking.html

## Using and Hacking

To get started, make sure you have Node and clone the repository. The included Makefile should build everything, or you can type these commands to use `npm` to get things ready:

    $ npm install
    $ npm run build

The latter produces the parser and compiles the source code with [TypeScript][]'s `tsc` command. Then, you might want to run:

    $ npm link

to install an alias to the `ssc` command. Then, type:

    $ ssc --help

to see some options. In particular, run `ssc example.ss` to interpret programs; run `ssc -c example.ss` to compile programs to JavaScript; and run `ssc -cx example.ss` to compile programs and then execute the resulting JavaScript.

## Credits

This is a project of [Capra][] at Cornell. The license is [MIT][].

[Adrian Sampson](http://www.cs.cornell.edu/~asampson/) started this project while he was at Microsoft Research, where it was released as [open source][ssc]. It has since been improved by [Richie Henwood](https://github.com/rhenwood39), [Eric Lin](https://github.com/eric780), and [Yiteng Guo](https://github.com/guoyiteng).

[MIT]: https://opensource.org/licenses/MIT
[ssc]: https://github.com/microsoft/staticstaging
[capra]: https://capra.cs.cornell.edu
