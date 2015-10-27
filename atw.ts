/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/minimist/minimist.d.ts" />

/// <reference path="src/driver.ts" />

let fs = require('fs');
let util = require('util');
let minimist = require('minimist');
let parser = require('./parser.js');

function read_string(filename: string, f: (s: string) => void) {
  fs.readFile(filename, function (err: any, data: any) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    f(data.toString());
  });
}

function main() {
  // Parse the command-line options.
  let args = minimist(process.argv.slice(2), {
    boolean: ['v', 'c', 'x', 'w'],
  });

  // The flags: -v, -c, and -x.
  let verbose: boolean = args.v;
  let compile: boolean = args.c;
  let execute: boolean = args.x;
  let webgl: boolean = args.w;

  // Get the filename.
  let fn = args._[0];
  if (!fn) {
    console.error("usage: " + process.argv[1] + " [-vcx] PROGRAM");
    process.exit(1);
  }

  // Log stuff, if in verbose mode.
  let log: (...msg: any[]) => void;
  if (verbose) {
    log = function (...msg: any[]) {
      let out: string[] = [];
      for (let m of msg) {
        if (typeof(m) === "string") {
          out.push(m);
        } else {
          out.push(util.inspect(m, { depth: null, colors: true }));
        }
      }
      // Work around a TypeScript limitation:
      // https://github.com/Microsoft/TypeScript/issues/4755
      console.log(out[0], ...out.slice(1));
    }
  } else {
    log = (_ => void 0);
  }

  // Configure the driver.
  let config: DriverConfig = {
    parser: parser,
    webgl: webgl,

    log: log,
    error (e: string) {
      console.error(e);
      process.exit(1);
    },

    parsed: (_ => void 0),
    typed: (_ => void 0),
  };

  // Read the source file and run the driver.
  read_string(fn, function (source) {
    driver_frontend(config, source, fn, function (tree, types) {
      if (compile) {
        // Compiler.
        driver_compile(config, tree, types, function (code) {
          if (execute) {
            driver_execute(config, code, function (res) {
              console.log(res);
            });
          } else {
            console.log(code);
          }
        });

      } else {
        // Interpreter.
        driver_interpret(config, tree, types, function (res) {
          console.log(res);
        });
      }
    });
  });
}

main();
