# Metaprogramming

Splicing is the basis of Braid's metaprogramming tools.
This section describes extensions beyond the basic splices we've already seen that make metaprogramming more powerful.

## Open Code

So far, each quote has had its own independent scope. No two quotes get to share the same set of local variables, and that includes quotes nested inside escapes. It's important to prohibit programs like this, for example:

    <
      var x = 5;
      [ x ]
    >

because the reference to `x` would run before `x` is defined. Prohibiting this more complex example might seem less intuitive, but it's illegal for the same reason:

    <
      var x = 5;
      [
        < x * 2 >
      ]
    >

The reference to `x` won't typecheck because it wasn't defined in the inner quote's enclosing scope, which doesn't include variables from the outer quote.

But for metaprogramming, scopes that span multiple quotes can be important. Say, for example, that you want to compute either the surface area or the volume of a sphere given its diameter:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      <
        var r = d / 2.0;
        pi * r * r * [
          if volume
            < 4.0 / 3.0 * r >
            < 4.0 >
        ]
      >;
    !sphere(4.0, 1)

You need to share the value of `r` between the outer quote and the first inner quote (to compute the volume as $$\frac{4}{3} \pi r^3$$).

To make this work, Braid supports special kinds of escape and quote that can preserve scopes. They're called *open code* quotes, and you use them by prefixing escapes and quotes with the `$` character. This modified example works:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      <
        var r = d / 2.0;
        pi * r * r * $[
          if volume
            $< 4.0 / 3.0 * r >
            $< 4.0 >
        ]
      >;
    !sphere(4.0, 1)

When a quote is marked with a `$`, it inherits its scope from the nearest containing escape---if it is also marked with a `$`. (Syntax mnemonic: `$` is for \$plicing \$nippets.)

Open code's scope sharing is in tension with the self-contained, reusable nature of garden-variety quotes. In fact, confusing self-contained programs with partial pieces of code causes lots of problems in [other work on multi-stage programming][mint]. Since open code can contain variables referenced elsewhere, it would be meaningless to run them independently or to splice them anywhere other than their one true intended splicing point.

[mint]: http://www.cs.rice.edu/~mgricken/research/mint/download/techreport.pdf

Braid uses a simple strategy to make sure that an open code value can only be spliced into its intended destination. The language gives a special, one-off type to open code values that identifies their splice points. This sneaky program, for example:

    var c = <0>;
    <
      var x = 5;
      $[ c = $<x> ]
    >;
    !c

tries to squirrel away an open code value that refers to a variable from the outer quote. Braid will helpfully complain that the `$<x>` expression has a special type that can't be assigned into a variable with type `<Int>`. That special type has only one purpose: to be spliced into one specific point in one specific program.

## Pre-Splicing

Aside from giving you scope-spanning, open code can also be compiled more efficiently. The key factor is the same property that lets them span scopes: they can be spliced into exactly one other program point.

Check out the JavaScript code generated from the sphere example above. Unlike previous examples that used splicing, the code here has no magical `__SPLICE_N__` tokens and no runtime `splice` calls. There is no run-time code generation at all. Instead, the two choices for completing the program have been *inlined*. To decide how the quote should behave, the program just chooses between the two complete program variants stored in two different JavaScript strings (called `q10_25` and `q10_31` as of this writing).

In fact, unlike ordinary splicing, you can use open-code splicing with `js<...>` function-backed quotes. Look at the code generated for this version of our example:

    var pi = 3.14;
    def sphere(d: Float, volume: Int)
      js<
        var r = d / 2.0;
        pi * r * r * $[
          if volume
            $< 4.0 / 3.0 * r >
            $< 4.0 >
        ]
      >;
    !sphere(4.0, 1)

There are two specialized variants of the function for the quote. There's no code in string literals and no `eval` monkey business in sight.

Pre-splicing is important because it lets you use staging to express *compile-time* metaprogramming in the same way that you can write *run-time* metaprogramming. Open code and pre-splicing are necessarily more restrictive, but they let you avoid the costs of more general run-time splicing.

On the command line, you can optionally disable the presplicing optimization. Use the `-P` flag (with the ordinary `-c` flag to use the compiler) to see the effect.

## Macros

Braid has macros.
In fact, the staging concepts you already know are already enough to implement something very close to macros you know and love!
Braid just uses a little syntactic sugar to make them work.

Fundamentally, a macro is just a function that takes code as arguments and produces code as its return value.
In Braid, that's exactly how you define a macro:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;

To use a macro, type its name prefixed with an `@` symbol:

    @add 1 2

Unlike an ordinary function call, like `add 1 2`, the arguments to a macro invocation are treated as *code*, as if you had wrapped them in angle brackets.
Like this:

    add <1> <2>

A macro invocation also automatically escapes *to the point where the name was defined*.
Specifically, this:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;
    < @add 1 2 >

is syntactic sugar for this:

    def add(lhs: <Int>, rhs: <Int>)
      < [lhs] + [rhs] >;
    < [ add <1> <2> ] >

Intuitively, you can think of the `@` symbol as saying, "Escape out to where the macro was defined, invoke it with my arguments as unevaluated code, and then splice its result back in here."
In other words, macros are just functions that run at an earlier stage.

### Open Code and Macros

Open-code splicing composes with macros.
Together, they enforce *macro hygeine*, letting you safely use variables from the scope surrounding the macro invocation.

To make this work, Braid uses the types on the parameters to the macro function.
Decorate your function's argument types with a `$` to indicate that the argument should be an open-code quote:

    def left(lhs: $<Int>, rhs: $<Int>)
      lhs;
    < var x = 1; var y = 2; @left x y >

When the macro function has an open-code parameter type, the corresponding argument quote behaves like an open-code quote. So the `@left x y` invocation above desugars to:

    $[ left $<x> $<y> ]

Open-code escapes are powerful because they can use variables from the surrounding scope, but they come with corresponding limitations: most importantly, you can't run (`!`) them.


# Code Generation

This section describes how to invoke Braid's compiler or interpreter to generate code.

You can use the interpreter mode to generate Braid code, which you can then feed back into the interpreter.
Use the `-g` flag to the command-line tool to make it emit the *body* of a residualizable code value produced by the program.
For example:

```sh
$ echo 'var x = <5>; < [x] + 2>' | &tool;
< 5 + 2 >
$ echo 'var x = <5>; < [x] + 2>' | &tool; -g
5 + 2
$ echo 'var x = <5>; < [x] + 2>' | &tool; -g | &tool;
7
```

The code must be residualizable: it must not contain any persists.
For example, this will produce an error:

```sh
$ echo 'var x = 5; < %[x] + 2>' | &tool; -g
```

indicating that the resulting code value `< %0 + 2 >` can't be residualized.

In compiler mode, the `-g` flag does not produce Braid source code; instead, it produces JavaScript code.
You can execute this code by passing it into `node`, probably with the `-p` flag to print its output.
For example:

```sh
$ echo 'var x = <5>; < [x] + 2>' | &tool; -cxg
(... a bunch of JavaScript ...)
$ echo 'var x = <5>; < [x] + 2>' | &tool; -cxg | node -p
7
```

If you like, you can save this JavaScript code to a file to execute it later.


