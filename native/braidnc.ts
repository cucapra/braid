#!/usr/bin/env node

import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as minimist from 'minimist';

import * as driver from "../src/driver";
import { Error } from "../src/error";

const STDIN_FILENAME = '-';  // Indicates we should read from stdin.
const EXTENSION = '.ss';
const HEADER_FILE = 'header.ss';

function run(filename: string, source: string) {
  let success = true;

  // Configure the driver.
  let config: driver.Config = {
    webgl: false,
    generate: false,
    presplice: false,

    log: (() => void 0),
    error: e => {
      console.error(e.toString());
      success = false;
    },

    parsed: (_ => void 0),
    typed: (_ => void 0),
  };

  // Run the driver.
  let sources: string[] = [source];
  let filenames: string[] = [filename];

  let res = driver.frontend(config, sources, filenames);
  if (res instanceof Error) {
    console.error(res.toString());
    return false;
  }

  // Compile to an LLVM module.
  let [tree, types] = res;
  let ir = driver.to_ir(config, tree, types);
  let mod = llvm.codegen(ir);
  console.log(mod.toString());  // TODO Write bitcode to file.
  mod.free();

  return success;
}

// TODO Share with the main CLI tool.
/**
 * Read code from a file or from stdin, if the filename is -.
 */
function readCode(filename: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    if (filename === STDIN_FILENAME) {
      // Read from stdin.
      let chunks: string[] = [];
      process.stdin.on("data", function (chunk: string) {
        chunks.push(chunk);
      }).on("end", function () {
        resolve(chunks.join(""));
      }).setEncoding("utf8");
    } else {
      // Read from a file.
      fs.readFile(filename, function (err: any, data: any) {
        if (err) {
          reject(err);
        }
        resolve(data.toString());
      });
    }
  });
}

function main() {
  // Parse the command-line options.
  let args = minimist(process.argv.slice(2), {
    boolean: ['v', 'g'],
    string: ['o'],
  });

  let verbose: boolean = args['v'];
  let opengl: boolean = args['g'];
  let outfile: string = args['o'];

  // Help.
  if (args['h'] || args['help'] || args['?']) {
    console.error("usage: " + process.argv[1] + " [-vcxwtgP] [PROGRAM...]");
    console.error("  -v: verbose mode");
    console.error("  -g: graphics (OpenGL) mode");
    console.error("  -o FILE: emit result in FILE");
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
  readCode(filename).then(source => {
    let success = run(filename, source);
    if (!success) {
      process.exit(1);
    }
  });
}

main();
