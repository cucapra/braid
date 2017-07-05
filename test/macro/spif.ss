# Specialized `if`.
var spif = fun c:<Boolean> t:<Int> f:<Int> -> if !c t f;

# Just for fun, we'll define a macro-like function that just duplicates
# the built-in `if` expression.
var myif = fun c:<Boolean> t:<Int> f:<Int> -> < if [c] [t] [f] >;

# These functions can be invoked as normal, without the `@` prefix.
var spif? = fun s:<Boolean> c:<Boolean> t:<Int> f:<Int> ->
    if !s (spif c t f) (myif c t f);

< @spif true 2 3 +
  @myif true 2 3 +
  @spif? false true 2 3 +
  @spif? true true 2 3 >
# -> < 2 + (if true 2 3) + (if true 2 3) + 2 >
