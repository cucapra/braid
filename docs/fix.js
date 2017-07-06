// Disable the Gitbook default theme's ridiculous hijacking of all link
// clicks. I don't know why they do this---request everything via Ajax instead
// of just following links like normal---but it breaks relative links to
// things that aren't book pages.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('a').forEach(function (a) {
    console.log(a);
    a.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  });
});
