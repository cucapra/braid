/**
 * Turn a list of plain-text files into a single JSON document.
 */

let fs = require('fs');
let path = require('path');

const FRONT_MATTER_MARKER = /---\n/;
const KEY_VALUE_PAIR = /(\w+): (.*)$/;

function read_string(filename: string) {
  let data = fs.readFileSync(filename);
  return data.toString();
}

function split_front_matter(s: string): [string, string] {
  let index = s.search(FRONT_MATTER_MARKER);
  if (index === -1) {
    return ['', s.trim()];
  } else {
    let back = s.slice(index);
    let nlindex = back.indexOf("\n");
    if (nlindex != -1) {
      back = back.slice(nlindex);
    }
    return [s.slice(0, index).trim(), back.trim()];
  }
}

type StringMap = { [ key: string]: string };
function parse_front_matter(s: string): StringMap {
  let out: StringMap = {};
  for (let line of s.split(/\n/)) {
    let res = line.match(KEY_VALUE_PAIR);
    if (res) {
      out[res[1]] = res[2];
    }
  }
  return out;
}

function main() {
  let args = process.argv.slice(2);

  let out: StringMap[] = [];
  for (let fn of args) {
    let s = read_string(fn);
    let [front, back] = split_front_matter(s);
    let values = parse_front_matter(front);
    values['body'] = back;
    values['name'] = path.basename(fn).split('.')[0];
    out.push(values);
  }

  let json = JSON.stringify(out, null, 2);

  process.stdout.write(json);
}

main();
