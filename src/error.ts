import * as ast from './ast';

/**
 * Represent an AST node's location as a string.
 *
 * This uses the GNU guidelines for error messages:
 * https://www.gnu.org/prep/standards/html_node/Errors.html
 */
export function locString(loc: ast.Location): string {
  let out: string = "";
  if (loc.filename) {
    out += `${loc.filename}:`;
  }
  out += `${loc.start.line}.${loc.start.column}`;
  if (loc.end.line !== loc.start.line) {
    out += `-${loc.end.line}.${loc.end.column}`;
  } else if (loc.start.column !== loc.end.column) {
    out += `-${loc.end.column}`;
  }
  return out;
}

/**
 * The kinds of front-end errors.
 */
export type ErrorKind = "type" | "parse";

/**
 * A front-end error message.
 */
export class Error {
  constructor(
    public location: ast.Location,
    public kind: ErrorKind,
    public message: string,
  ) {}

  toString() {
    return `${locString(this.location)}: ${this.kind} error: ${this.message}`;
  }
}

/**
 * Create a new front-end error for a syntax node.
 */
export function error(node: ast.SyntaxNode, kind: ErrorKind, message: string) {
  return new Error(node.location!, kind, message);
}
