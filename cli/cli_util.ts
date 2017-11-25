import * as fs from 'fs';

export const STDIN_FILENAME = '-';  // Indicates we should read from stdin.

/**
 * Read text from a file or from stdin, if the filename is -.
 */
export function readText(filename: string): Promise<string> {
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
