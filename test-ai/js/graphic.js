// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    //artboardResizer();

    create_inteaction();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}


var create_inteaction = function() {

    graphic = d3.select("#graphic")
    box = graphic.append('div')
        .attr("class", "box");

    boxHead = box.append('h3')
        .attr("class", "boxHead")
        .html("THIS IS A HEADLINE");

    boxText = box.append('p')
        .attr("class", "boxText")
        .html("This is some text");

    boxClose = box.append('span')
        .attr("class", "boxClose")
        .html("&times;")
        .on('click',function(){
            box.style("display","none");
        });

    GRAPHIC_DATA.forEach(function(d) {
        if (d.ids !== null) {
             d3.selectAll(d.ids)
                .style("cursor","pointer")
                .on('click',function(){
                    box.style("display","block");
                    boxText.html(d.text)
                    boxHead.html(d.title)
                });
        }
    })            

    // d3.select('#g-ai0-3')
    //     .on('click',function(){
    //         box.style("display","block");
    //     });

    // d3.select('#g-ai1-4')
    //     .on('click',function(){
    //         box.style("display","block");
    //     });



}

/*
 * Hide/show artboards based on min/max width.
 * Use if you have weird sizes and the CSS is too cumbersome to edit.
 */
var artboardResizer = function() {
    // only want one resizer on the page
    if (document.documentElement.className.indexOf("g-resizer-v3-init") > -1) return;
    document.documentElement.className += " g-resizer-v3-init";
    // require IE9+
    if (!("querySelector" in document)) return;
    function resizer() {
        var elements = Array.prototype.slice.call(document.querySelectorAll(".g-artboard[data-min-width]")),
            widthById = {};
        elements.forEach(function(el) {
            var parent = el.parentNode,
                width = widthById[parent.id] || parent.getBoundingClientRect().width,
                minwidth = el.getAttribute("data-min-width"),
                maxwidth = el.getAttribute("data-max-width");
            widthById[parent.id] = width;
            if (+minwidth <= width && (+maxwidth >= width || maxwidth === null)) {
                el.style.display = "block";
            } else {
                el.style.display = "none";
            }
        });
        try {
            if (window.parent && window.parent.$) {
                window.parent.$("body").trigger("resizedcontent", [window]);
            }
            if (window.require) {
                require(['foundation/main'], function() {
                    require(['shared/interactive/instances/app-communicator'], function(AppCommunicator) {
                        AppCommunicator.triggerResize();
                    });
                });
            }
        } catch(e) { console.log(e); }
        pymChild.sendHeight();
    }
    document.addEventListener('DOMContentLoaded', resizer);
    // feel free to replace throttle with _.throttle, if available
    window.addEventListener('resize', _.throttle(resizer, 200));
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
