glrt
====

These are the runtime services used by compiled BraidGL programs. Both compiler-generated operations and user code can reference this set of graphics-oriented functions.

To compile useful BraidGL code, the user needs to provide the included preamble, which consists of a list of `extern`s that `glrt` provides. To use compiled BraidGL code, a JavaScript program needs to "link" it with `glrt`. This works by obtaining the runtime object and passing it as an argument into the Braid function.
