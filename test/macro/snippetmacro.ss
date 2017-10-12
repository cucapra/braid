var spif = fun c:<Bool> t:$<Int> f:$<Int> -> if !c t f;

<
  var x = 2;
  var y = 3;
  @spif true x y
>
# -> < var x = 2 ; var y = 3 ; x >
