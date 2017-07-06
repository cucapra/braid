/**
 * The server-side component of the performance test harness. This serves the
 * static files for the dingus, instructs it to load scenes, and collects
 * performance data to disk.
 */

const restify = require('restify');
import open_url = require('open');
import * as querystring from 'querystring';
import * as fs from 'fs';

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
 * Start the server and return its URL.
 */
function serve(log: (msg: any) => any): Promise<string> {
  let server = restify.createServer();
  let qp = restify.queryParser({ mapParams: false });

  // Log messages to a file.
  server.get('/log', qp, (req: any, res: any, next: any) => {
    let out = log(JSON.parse(req.query['msg']));
    res.send(out);
    return next();
  });

  // Serve the main HTML and JS files.
  server.get('/', restify.serveStatic({
    // `directory: '.'` appears to be broken:
    // https://github.com/restify/node-restify/issues/549
    directory: '../harness',
    file: 'index.html',
    maxAge: 0,
  }));
  server.get('/client.js', restify.serveStatic({
    directory: './build',
    file: 'client.js',
    maxAge: 0,
  }));

  // Serve the dingus assets.
  server.get(/\/.*/, restify.serveStatic({
    directory: '../dingus',
    default: 'index.html',
    maxAge: 0,
  }));

  // Show errors. This should be a Restify default.
  server.on('uncaughtException', (req: any, res: any, route: any, err: any) => {
    if (err.stack) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
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
