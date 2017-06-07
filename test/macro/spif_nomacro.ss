var spif = fun c:<Boolean> t:<Int> f:<Int> -> if !c t f;
var myif = fun c:<Boolean> t:<Int> f:<Int> -> < if [c] [t] [f] >;
var spif? = fun s:<Boolean> c:<Boolean> t:<Int> f:<Int> ->
    if !s (spif c t f) (myif c t f);
< [ spif <true> <2> <3> ] +
  [ myif <true> <2> <3> ] +
  [ spif? <false> <true> <2> <3> ] +
  [ spif? <true> <true> <2> <3> ] >
# -> < 2 + (if true 2 3) + (if true 2 3) + 2 >
