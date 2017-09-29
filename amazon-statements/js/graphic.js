/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;


twttr.events.bind(
  'rendered',
  function (event) {
    // console.log("Created widget", event.target.id);
    pymChild.sendHeight()
  }
);