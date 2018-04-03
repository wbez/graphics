/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {

     schoolTable = $('#school-table').DataTable({
        paging: false,
        scrollY: 400,
        scrollX: false,
        ordering: false,
        info:     false,
     });

     $('#search-table').keyup(function(){
      schoolTable.search($(this).val()).draw() ;
  });

     pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}






/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
