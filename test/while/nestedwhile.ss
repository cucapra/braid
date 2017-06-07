var x = 2;
var n = 0;
while (x !== 0) (
  x = x - 1;
  var y = 3;
  while (y !== 0) (
    y = y - 1;
    n = n + 1
  )
);
n
# -> 6
