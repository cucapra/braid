var spif = fun c:<Boolean> t:$<Int> f:$<Int> -> if !c t f;

<
  var x = 2;
  var y = 3;
  @spif true x y
>
# -> < var x = 2 ; var y = 3 ; x >
