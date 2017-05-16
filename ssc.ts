#!/usr/bin/env node

import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as minimist from 'minimist';

import * as driver from "./src/driver";

const STDIN_FILENAME = '-';  // Indicates we should read from stdin.
const EXTENSION = '.ss';

function read_string(filename: string, f: (s: string) => void) {
  fs.readFile(filename, function (err: any, data: any) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    f(data.toString());
  });
}

// Check the output of a test. Return a success flag.
function check_output(filename: string, source: string, result: string):
  boolean
{
  let name = path.basename(filename, EXTENSION);

  let [,expected] = source.split('# -> ');
  if (expected === undefined) {
    console.log(`${name} ✘: ${result} (no expected result found)`);
    return false;
  }
  expected = expected.trim();
  result = result.trim();

  let match: boolean;
  if (expected === "type error") {
    match = result.indexOf(expected) === 0;
  } else {
    match = expected === result;
  }

  if (match) {
    console.log(`${name} ✓`);
    return true;
  } else {
    console.log(`${name} ✘: ${result} (${expected})`);
    return false;
  }
}

function run(filename: string, source: string, webgl: boolean,
    compile: boolean, execute: boolean, test: boolean,
    generate: boolean, log: (...msg: any[]) => void, presplice: boolean,
    native: boolean, outfile: string)
{
  let success = true;

  try {

    // Configure the driver.
    let config: driver.Config = {
      webgl: webgl,
      native: native,
      generate: generate,

      log: log,
      error (e: string) {
        if (test) {
          success = check_output(filename, source, e);
        } else {
          console.error(e);
          success = false;
        }
      },

      parsed: (_ => void 0),
      typed: (_ => void 0),

      presplice,
    };

    // Run the driver.
    driver.frontend(config, source, filename, function (tree, types) {
      if (compile) {
        // Compiler.
        driver.compile(config, tree, types, function (code) {
          if (execute) {
            driver.execute(config, code, function (res) {
              if (test) {
                success = check_output(filename, source, res);
              } else {
                console.log(res);
              }
            });
          } else {
            console.log(code);
          }
        },

        // Native compilation result.
        (mod) => {
          if (outfile) {
            let err = mod.writeBitcodeToFile(outfile);
            if (err) {
              throw "error writing bitcode: " + err;
            }
          } else {
            console.log(mod.toString());
          }
        });

      } else {
        // Interpreter.
        driver.interpret(config, tree, types, function (res) {
          if (test) {
            success = check_output(filename, source, res);
          } else {
            console.log(res);
          }
        });
      }
    });

  } catch (e) {

    if (test) {
      // Avoid crashing the test harness.
      let name = path.basename(filename, EXTENSION);
      console.log(`${name} ✘: unhandled error`);
      console.error(e.stack || e);
      success = false;
    } else {
      throw e;
    }

  }

  return success;
}

function main() {
  // Parse the command-line options.
  let args = minimist(process.argv.slice(2), {
    boolean: ['v', 'c', 'x', 'w', 't', 'g', 'P', 'n'],
    string: ['o'],
  });

  // The flags: -v, -c, and -x.
  let verbose: boolean = args['v'];
  let compile: boolean = args['c'];
  let execute: boolean = args['x'];
  let webgl: boolean = args['w'];
  let test: boolean = args['t'];
  let generate: boolean = args['g'];
  let no_presplice: boolean = args['P'];
  let native: boolean = args['n'];
  let outfile: string = args['o'];

  // Help.
  if (args['h'] || args['help'] || args['?']) {
    console.error("usage: " + process.argv[1] + " [-vcxwtgP] [PROGRAM...]");
    console.error("  -v: verbose mode");
    console.error("  -c: compile (as opposed to interpreting)");
    console.error("  -x: execute the program (use with -c)");
    console.error("  -w: use the WebGL language variant");
    console.error("  -t: test mode (check for expected output)");
    console.error("  -g: dump generated code");
    console.error("  -P: do not use the presplicing optimization");
    console.error("  -n: use native (LLVM) backend");
    console.error("  -o FILE: emit result in FILE");
    process.exit(1);
  }

  // Get the program filenames, or indicate that we'll read code from STDIN.
  let filenames: string[] = args._;
  if (!filenames.length) {
    filenames = [STDIN_FILENAME];
  }

  // Log stuff, if in verbose mode.
  let log: (...msg: any[]) => void;
  if (verbose) {
    log = function (...msg: any[]) {
      let out: string[] = [];
      for (let m of msg) {
        if (typeof(m) === "string") {
          out.push(m);
        } else if (m instanceof Array) {
          for (let i = 0; i < m.length; ++i) {
            out.push("\n" + i + ": " +
                util.inspect(m[i], { depth: undefined, colors: true }));
          }
        } else {
          out.push(util.inspect(m, { depth: undefined, colors: true }));
        }
      }
      // Work around a TypeScript limitation:
      // https://github.com/Microsoft/TypeScript/issues/4755
      console.log(out[0], ...out.slice(1));
    }
  } else {
    log = (_ => void 0);
  }

  // Read each source file and run the driver.
  let success = true;
  let promises = filenames.map(function (fn) {
    return new Promise(function (resolve, reject) {
      let then = function (source: string) {
        success = run(fn, source, webgl, compile, execute, test,
            generate, log, !no_presplice, native, outfile) && success;
        resolve();
      };
      if (fn === STDIN_FILENAME) {
        // Read from stdin.
        let chunks: string[] = [];
        process.stdin.on("data", function (chunk: string) {
          chunks.push(chunk);
        }).on("end", function () {
          then(chunks.join(""))
        }).setEncoding("utf8");
      } else {
        // Read from a file.
        read_string(fn, then);
      }
    });
  });
  Promise.all(promises).then(function() {
    if (!success) {
      process.exit(1);
    }
  });
}

main();
