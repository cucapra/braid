#!/usr/bin/env node

import * as util from 'util';
import * as path from 'path';
import * as minimist from 'minimist';

import * as driver from "../src/driver";
import { Error } from "../src/error";
import * as llvm from "./llvm";
import { readText, STDIN_FILENAME } from "../cli/cli_util";

function run(filename: string, source: string, outfile: string | undefined) {
  let success = true;

  // Configure the driver.
  let config: driver.Config = {
    webgl: false,
    generate: false,
    presplice: false,
    module: false,

    log: (() => void 0),
    error: e => {
      console.error(e.toString());
      success = false;
    },

    parsed: (_ => void 0),
    typed: (_ => void 0),
  };

  // Run the driver.
  let res = driver.frontend(config, [source], [filename]);
  if (res instanceof Error) {
    console.error(res.toString());
    return false;
  }

  // Compile to an LLVM module.
  let [tree, types] = res;
  let ir = driver.to_ir(config, tree, types);
  let mod = llvm.codegen(ir);

  if (outfile) {
    // Dump bitcode to the file.
    mod.writeBitcodeToFile(outfile);
  } else {
    // Print human-readable IR to stdout.
    console.log(mod.toString());
  }

  // Free the compiled LLVM module.
  mod.free();

  return success;
}

function main() {
  // Parse the command-line options.
  let args = minimist(process.argv.slice(2), {
    boolean: ['v', 'g'],
    string: ['o'],
  });

  let verbose: boolean = args['v'];
  let opengl: boolean = args['g'];
  let outfile: string | undefined = args['o'];

  // Help.
  if (args['h'] || args['help'] || args['?']) {
    console.error("usage: " + process.argv[1] + " [-vcxwtgP] [PROGRAM...]");
    console.error("  -v: verbose mode");
    console.error("  -g: graphics (OpenGL) mode");
    console.error("  -o FILE: emit LLVM bitcode to FILE");
    process.exit(1);
  }

  // Get the program filename, or indicate that we'll read code from STDIN.
  let filename: string;
  if (args._.length) {
    filename = args._[0];
  } else {
    filename = STDIN_FILENAME;
  }

  // Read the source and run the driver.
  readText(filename).then(source => {
    let success = run(filename, source, outfile);
    if (!success) {
      process.exit(1);
    }
  });
}

main();
