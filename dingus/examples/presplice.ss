# title: pre-splicing
# mode: compile
# ---

# Try switching this between true and false.
var flag = true;

# Try annotating this quote with `js`; it still works.
!<
  var x = 4;
  var y = 5;

  # The $ indicates open code.
  $[ if flag $<2> $<3> ] +

  # It lets you share the enclosing scope.
  $[ if flag $<x> $<y> ]
>
