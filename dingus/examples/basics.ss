# title: basics
# mode: interp
# ---

# Here's some basic arithmetic.
var x = 18;
var y = x + 3;

# You can write lambdas with `fun`.
var double = fun n:Int -> n * 2;
double y;

# Here's the syntax for named functions.
var g = 9.8;
def gpe(mass:Float, height:Float)
  mass * height * g;
gpe(2.0, 3.0);

# There are loops and conditionals.
var i = 10;
var n = 2;
while (i != 0) (
  i = i - 1;
  n = n * 3
);
n
