# The Basics

Braid has a tiny, imperative core language. You can assign to variables with `var`, do basic arithmetic, and define functions with `def`:

    var g = 9.8;
    def gpe(mass:Float, height:Float)
      mass * height * g;
    gpe(2.0, 3.0)

This program evaluates to around 58.8. (Copy and paste any of these examples into the interactive [dingus][] to see it working.)

[dingus]: ../dingus

## Functions

You can define functions like this:

    def name(arg1:Type, arg2:Type, ...)
        body

The body is just an expression. In Braid's syntax, `;` sequences expressions and binds loosely; if you want a long function body, you'll want to surround it with parentheses:

    def name(arg1:Type, arg2:Type, ...) (
        body;
        more body
    )

You can also write lambdas (a.k.a. anonymous functions) using `fun`:

    (fun x:Int -> x * 2)(21)

## Interoperation via `extern` {#extern}

The language can also interoperate with JavaScript. Use `extern` to declare something from JavaScript land:

    extern Math.PI: Float;
    def circumference(radius:Float)
      2.0 * Math.PI * radius;
    circumference(5.0)

Braid treats the entire name `Math.PI` as one token; the `.` is not significant from its perspective.

## Parentheses-Free Function Syntax

There's also an ML-esque syntax for defining and invoking functions, which can occasionally be more appropriate:

    var g = 9.8;
    var gpe = fun mass:Float height:Float -> mass * height * g;
    gpe 2.0 3.0

I realize it's somewhat silly to have both C-like `call(arg, arg)` syntax and ML-like `call arg arg` syntax, but the flexibility is occasionally convenient for some examples.
