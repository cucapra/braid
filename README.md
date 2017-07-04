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
[docs]: http://microsoft.github.io/staticstaging/docs/
[hacking]: http://microsoft.github.io/staticstaging/docs/hacking.html

## Using and Hacking

To get started, make sure you have Node and clone the repository. The included Makefile should build everything, or you can type these commands to use `npm` to get things ready:

    $ npm install
    $ npm run build

The latter produces the parser and compiles the source code with [TypeScript][]'s `tsc` command. Then, you might want to run:

    $ npm link

to install an alias to the `ssc` command. Then, type:

    $ ssc --help

to see some options. In particular, run `ssc example.ss` to interpret programs; run `ssc -c example.ss` to compile programs to JavaScript; and run `ssc -cx example.ss` to compile programs and then execute the resulting JavaScript.

## Details

The license is [MIT][].
This project uses the [Microsoft Open Source Code of Conduct][coc]; check out the [FAQ about the CoC][cocfaq].

[MIT]: https://opensource.org/licenses/MIT
[coc]: https://opensource.microsoft.com/codeofconduct/
[cocfaq]: https://opensource.microsoft.com/codeofconduct/faq/
