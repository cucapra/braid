import * as ast from './ast';

/**
 * Represent an AST node's location as a string.
 *
 * This uses the GNU guidelines for error messages:
 * https://www.gnu.org/prep/standards/html_node/Errors.html
 */
export function location(node: ast.SyntaxNode): string {
  let loc = node.location;
  if (!loc) {
    return "?";
  }

  let out = `${loc.filename}:${loc.start.line}.${loc.start.column}-`;
  if (loc.end.line !== loc.start.line) {
    out += `${loc.end.line}.`;
  }
  out += `${loc.end.column}`;

  return out;
}

/**
 * The kinds of front-end errors.
 */
export type ErrorKind = "type";

/**
 * A front-end error message.
 */
export class Error {
  constructor(
    public location: ast.Location,
    public kind: ErrorKind,
    public message: string,
  ) {}
}

/**
 * Create a new front-end error for a syntax node.
 */
export function error(node: ast.SyntaxNode, kind: ErrorKind, message: string) {
  return new Error(node.location!, kind, message);
}

export function locationError(node: ast.SyntaxNode): string {
  return " at " + location(node);
}
