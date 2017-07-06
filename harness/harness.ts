/**
 * The server-side component of the performance test harness. This serves the
 * static files for the dingus, instructs it to load scenes, and collects
 * performance data to disk.
 */

import open_url = require('open');
import * as querystring from 'querystring';
import * as fs from 'fs';
import * as http from 'http';
import { parse as url_parse } from 'url';

/**
 * Read a file to a string.
 */
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

/**
 * Send a file from the filesystem as an HTTP response.
 */
export function sendfile(res: http.ServerResponse, path: string, mime='text/html') {
  res.statusCode = 200;
  res.setHeader('Content-Type', mime);

  let stream = fs.createReadStream(path);
  stream.on('error', (e: any) => {
    if (e.code === 'ENOENT') {
      console.error(`static path ${path} not found`);
      res.statusCode = 404;
      res.end('not found');
    } else {
      console.error(`filesystem error: ${e}`);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  stream.pipe(res);
}

const MIME_TYPES: { [e: string]: string } = {
  'js': 'application/javascript',
  'css': 'text/css',
};

/**
 * Start the server and return its URL.
 */
function serve(log: (msg: any) => any): Promise<string> {
  // Create a Web server that serves the in-browser code and collects results.
  let server = http.createServer((req, res) => {
    let url = url_parse(req.url);

    // Log messages to a file.
    if (url.pathname === '/log') {
      let out = log(JSON.parse(url.query['msg']));
      res.end(out);
      return;
    }

    // Serve the main HTML and JS files.
    if (url.pathname === '/') {
      sendfile(res, 'index.html');
      return;
    }
    if (url.pathname === '/client.js') {
      sendfile(res, 'build/client.js', MIME_TYPES['js']);
      return;
    }

    // Other paths: serve the dingus assets.
    // TODO MIME?
    let path = '../dingus' + url.pathname;
    let mime = 'text/html';
    for (let ext in MIME_TYPES) {
      if (url.pathname.lastIndexOf('.' + ext) ===
          url.pathname.length - ext.length - 1) {
        mime = MIME_TYPES[ext];
        break;
      }
    }
    sendfile(res, path, mime);
  });

  // More filling in the blanks: log each request as it comes in.
  server.on('after', (req: any, res: any, route: any, err: any) => {
    plog(res.statusCode + " " + req.method + " " + req.url);
  });

  // Start the server.
  let port = 4700;
  let url = "http://localhost:" + port;
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      resolve(url);
    });
  });
}

// The number of messages to receive before terminating.
let MESSAGE_COUNT = 8;

/**
 * Called when a performance experiment has finished with data about the
 * experiment.
 */
function experiment_finished(data: any) {
  process.stdout.write(JSON.stringify(data));

  // Stop.
  setTimeout(() => {
    process.exit();
  }, 500);
}

/**
 * Write a message to stderr.
 */
function plog(s: any) {
  if (typeof(s) === "string") {
    process.stderr.write(s);
  } else {
    process.stderr.write(JSON.stringify(s));
  }
  process.stderr.write("\n");
}

function main() {
  // Get the program to execute.
  let fn = process.argv[2];
  let code: string;
  plog("executing " + fn);
  read_string(fn).then((code) => {
    // Handler for logged messages.
    let messages: any[] = []
    let handle_log = (msg: any) => {
      plog(msg);
      messages.push(msg);
      if (messages.length >= MESSAGE_COUNT) {
        experiment_finished({
          fn,
          messages,
        });
        return "done";
      } else {
        return "ok";
      }
    };

    serve(handle_log).then((url) => {
      plog(url);

      // Open the program in the browser.
      let query = querystring.stringify({ code });
      open_url(url + '/#' + query);
    });
  });
}

main();
