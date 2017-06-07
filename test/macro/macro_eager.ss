def spif(c:Boolean, t:$<Int>, f:$<Int>)
  if c t f;

var z = true;
!<
  var x = 5;
  var y = 9;
  @spif z x y
>
# -> 5
