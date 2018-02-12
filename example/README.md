Braid Example
=============

This is an example of a standalone program that uses Braid code for its graphics rendering. The Braid code is compiled to JavaScript; the TypeScript source for the main program is compiled along with it to JavaScript; and everything is then bundled together with Webpack.

Here are the ingredients:

* `index.html` is the page to be loaded in the browser.
* `example.ts` is the "main" program for the example.
    * It locates the `<canvas>` element in the HTML page and starts a render loop to draw frames in a WebGL context.
    * To do this, it imports a Braid function for rendering like this:

          import { mat4 } from 'gl-matrix';

    * The included `tsconfig.json` contains the right options to allow this import to work. Type `tsc` to compile the TypeScript code.
* `render.braid` contains the Braid code for the example. It is compiled to `render.js`.
    * It needs to be compiled to JavaScript so it can be used in the main program. See `Makefile` for the command to do this:

          cat ../glrt/preamble.braid render.braid | braid -cmw > render.js

      We need to concatentate the "header file" from `glrt` here with the source file and then pass that into the Braid compiler. The `-cmw` flags to the compiler tell it to compile to a JavaScript module in WebGL mode.
* `webpack.config.js` is the configuration for the browser source bundler.
    * To be usable in a browser, the different modules (the JavaScript files generated from `example.ts` and `render.braid`) need to be bundled together into a single file. We use the popular [WebPack][] tool.
    * As the `Makefile` lists, just running the `webpack` command will create a bundle called `example.bundle.js`. This is included in the HTML page.
* `package.json` is the configuration for [npm][] or [Yarn][].
    * It includes a dependency on our `glrt` library, which is required to make the generated Braid code work.
    * If you have Yarn, just type `yarn` to get the dependencies.
    * If you change the `glrt` library and recompile it, you'll also need to run something like `yarn upgrade glrt` to load in the new version of the dependency.

[yarn]: https://yarnpkg.com/en/
[npm]: https://www.npmjs.com
[WebPack]: https://webpack.js.org
