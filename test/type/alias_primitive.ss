type t = Float;
def f(x:t, y:Float)
  x * y;
f(3.0, 6.0);

type t1 = Int;
def f1(x:t1, y:t)
  x + y;
f1(3, 4.0);

var x = 4.0;
f(x, 2.0);
