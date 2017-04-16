import * as ast from './ast';

// Create a copy of an object `obj`, optionally with its fields updated
// according to `values`.
// TODO Opportunistically avoid copying identical expressions? This would work
// best combined with full-on hash consing, which in turn would be painful
// without using ES6 Map.
export function merge<T extends Object>(obj: T, values: Object = {}): T {
  let out = <T> {};
  for (let key in obj) {
    if (values.hasOwnProperty(key)) {
      (<any> out)[key] = (<any> values)[key];
    } else if (obj.hasOwnProperty(key)) {
      (<any> out)[key] = (<any> obj)[key];
    }
  }
  return out;
}

// An alternative that more closely matches ES6 Object.assign.
export function assign <T, U> (target: T, ...sources: U[]): T & U {
  var t: any = {};
  for (var i = 0; i < arguments.length; ++i) {
    for (var k in arguments[i]) {
      t[k] = arguments[i][k];
    }
  }
  return t;
};

// A bit of a hack that abuses prototypes to create overlay. Return a copy of
// the argument where changing the new object won't affect the original.
export function overlay<T extends Object>(base: T): T {
  return <T> Object.create(base);
}

// Lispy list manipulation.
export function hd<T> (list: T[]): T {
  if (list.length === 0) {
    throw "error: head of empty list";
  }
  return list[0];
}

export function tl<T> (list: T[]): T[] {
  if (list.length === 0) {
    throw "error: tail of empty list";
  }
  return list.slice(1);
}

export function cons<T> (x: T, xs: T[]): T[] {
  return [x].concat(xs);
}

export function zip<A, B> (a: A[], b: B[]): [A, B][] {
  let out: [A, B][] = [];
  for (let i = 0; i < a.length && i < b.length; ++i) {
    out.push([a[i], b[i]]);
  }
  return out;
}

export type Gen <T> = (_:T) => T;

// A fixed-point combinator.
export function fix <T extends Function> (f : Gen<T>) : T {
  return <any> function (...args: any[]) {
    return (f(fix(f)))(...args);
  };
}

// Function composition.
export function compose <A, B, C> (g : (_:B) => C, f : (_:A) => B): (_:A) => C {
  return function (x : A): C {
    return g(f(x));
  }
}

type MapStack <T> = { [key: string]: T }[];

// Look up a key in a stack of maps, from left to right. Return the value and
// the position where it was found (or [undefined, undefined] if not found).
export function stack_lookup <T> (
  mapstack: MapStack<T>,
  ident: string):
  [T, number] | [undefined, undefined]
{
  let i = 0;
  for (let map of mapstack) {
    let value = map[ident];
    if (value !== undefined) {
      return [value, i];
    }
    ++i;
  }
  return [undefined, undefined];
}

// Assign a value in the topmost map in a stack of maps.
export function stack_put <T> (
  mapstack: MapStack<T>,
  key: string,
  value: T):
  MapStack<T>
{
  let head = overlay(hd(mapstack));
  head[key] = value;
  return cons(head, tl(mapstack));
}

// Treat an array as a set and insert into it. That is, do nothing if the
// value is already present, and otherwise push it onto the list.
export function set_add <T> (a: T[], v: T): T[] {
  for (let x of a) {
    if (x === v) {
      return a;
    }
  }

  return cons(v, a);
}

// Check whether a set (implemented as a list) contains a value.
export function set_in <T> (a: T[], v: T): boolean {
  for (let x of a) {
    if (x === v) {
      return true;
    }
  }
  return false;
}

// Difference (relative complement) for sets. A naive/inefficient
// implementation.
export function set_diff <T> (a: T[], b: T[]): T[] {
  let out: T[] = [];
  for (let x of a) {
    if (!set_in(b, x)) {
      out.push(x);
    }
  }
  return out;
}

/**
 * Union for set. Also a naive implementation.
 */
export function set_union <T> (a: T[], b: T[]): T[] {
  let out: T[] = [];
  out = out.concat(a);
  for (let x of b) {
    if (!set_in(a, x)) {
      out.push(x);
    }
  }
  return out;
}

// Eval inside a scope.
export function scope_eval(code: string): any {
  return (function () {
    return eval("'use strict'; " + code);
  })();
}

// toString for an AST SyntaxNode's location
export function location(node: ast.SyntaxNode): string {
  if (node.location === undefined) {
    return "No location found";
  }
  let start: ast.LocationData = node.location.start;
  let end: ast.LocationData = node.location.end;
  return "(" + start.line + "," + start.column + ") to (" 
    + end.line + "," + end.column + ")"
    + " in file " + node.location.filename;
}

export function locationError(node: ast.SyntaxNode): string {
  return " at " + location(node);
}