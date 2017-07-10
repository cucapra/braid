/**
 * Create a new JavaScript object that is a copy of `obj`. If `values`
 * is provided, the new copy has its values merged in.
 *
 * This is just ES6's Object.assign with a fresh, empty object {} as its
 * first parameter.
 */
export function merge<S, T>(obj: S, ...values: T[]): S {
  return Object.assign({}, obj, ...values);
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

type MapStack <T> = { readonly [key: string]: T }[];

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
  let head = Object.assign({}, hd(mapstack), { [key]: value });
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
