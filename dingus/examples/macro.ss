# title: macros
# mode: interp
# ---

# A specialized `if` that runs at this
# "compile-time" stage rather than at
# run time.
var spif = fun c:<Bool> t:$<Int> f:$<Int> ->
  (if !c t f);

# Here's the program we're generating.
<
  var x = 35;
  var y = 7;
  @spif true x y +
  @spif false x y
>
