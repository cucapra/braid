#!/usr/bin/env node

import * as fs from 'fs';

function read_string(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, function (err: any, data: any) {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString());
      }
    });
  });
}

function read_stdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let chunks: string[] = [];
    process.stdin.on("data", function (chunk: string) {
      chunks.push(chunk);
    }).on("end", function () {
      resolve(chunks.join(""))
    }).setEncoding("utf8");
  });
}

/**
 * Main function.
 */
function prevl() {
  // Each argument has the format `path=value`, where `path` is a
  // dot-separated list of keys to traverse and `value` is a value that will
  // replace the current value at that point.
  let changes: [string[], string][] = [];
  for (let arg of process.argv.slice(2)) {
    let [path, value] = arg.split('=');
    let keys = path.split('.');
    changes.push([keys, value]);
  }

  read_stdin().then((json) => {
    let data = JSON.parse(json);

    // Apply each change.
    for (let [keys, value] of changes) {
      let obj = data;
      let lastkey = keys[keys.length - 1];
      for (let key of keys.slice(0, -1)) {
        obj = obj[key];
      }
      obj[lastkey] = value;
    }

    process.stdout.write(JSON.stringify(data));
  });
}

prevl();
