# title: pre-splicing
# mode: compile
# ---

# Try switching this between true and false.
var flag = true;

# Try annotating this quote with `js`; it still works.
!<
  var x = 4;
  var y = 5;

  # The $ stands for "$nippet" and avoids run-time splicing.
  $[ if flag $<2> $<3> ] +

  # It also lets you share the enclosing scope.
  $[ if flag $<x> $<y> ]
>
