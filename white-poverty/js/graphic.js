// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'data.csv';
var SECONDARY_DATA_URL = 'national_data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

var colorD3;
var graphicData = null;
var secondaryData = null;
var isMobile = false;

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        d3.csv(SECONDARY_DATA_URL, function(error, data) {
            secondaryData = data;
        })

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;

            colorD3 = d3.scale.ordinal()
                .range([ COLORS['blue2'], COLORS['blue5'] ])
                .domain(d3.keys(graphicData[0]).filter(function(key) {
                    return key !== 'group';
                }));

            graphicData.forEach(function(d) {
                var y0 = 0;
                d['group'] = d.group;
                d['values'] = colorD3.domain().map(function(name) {
                    if (d[name] != null) {
                        d[name] = +d[name];
                    }
                    return { name: name, y0: y0, y1: y0 += +d[name], val: +d[name] };
                });
                d['total'] = d['values'][d['values'].length - 1]['y1'];
            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });

        
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    var graphicWidth;

    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth) {
    var aspectHeight = 9;
    var aspectWidth = 16;
    if (isMobile) {
        aspectHeight = 3;
        aspectWidth = 4;
    }

    var margin = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 50
    };
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(graphicData.map(function (d) {
            return d['group'];
        }));

    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([ 0, d3.max(graphicData, function(d) {
            return Math.ceil(d['total']/50) * 50; // round to next 50
        }) ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {return d});

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    var y_axis_grid = function() { return yAxis; }

    // draw the legend
    var legend = d3.select('#graphic').append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(graphicData[0]['values'])
            .enter().append('li')
                .attr('class', function(d, i) {
                    return 'key-item key-' + i + ' ' + classify(d['name']);
                });
    legend.append('b')
        .style('background-color', function(d,i) {
            return colorD3(d['name']);
        })
    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

    var lineLegend = d3.select('#graphic ul')
        .append('li')
    lineLegend.attr('class', 'key-item')
        .append('svg')
            .attr('height',5)
            .attr('width',40)
        .append("line")
            .style("stroke", "#ff0058")
            .style("stroke-width", 3)
            .style("stroke-dasharray", ("5, 5"))
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 40)
            .attr("y2", 0)
    lineLegend.append('label')
            .text("National poverty level");

    // draw the chart itself
    var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    var bars = svg.selectAll('.bars')
        .data(graphicData)
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return 'translate(' + x(d['group']) + ',0)';
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('x', function(d) {
                return x(d['x0']);
            })
            .attr('y', function(d) {
                return y(d['y1']);
            })
            .attr('height', function(d) {
                return y(d['y0']) - y(d['y1']);
            })
            .style('fill', function(d) {
                return colorD3(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    var lines = svg.selectAll('.lines')
        .data(secondaryData)
        .enter().append("line")
            .style("stroke", "#ff0058")
            .style("stroke-width", 3)
            .style("stroke-dasharray", ("5, 5"))
            .attr("x1", function(d,i){
                // console.log( x(d['group']));
                // return x(d['group']);
                return 0;
            })
            .attr("y1", function(d){
                return y(d.total)
            })
            .attr("x2", function(d,i){
                return x.rangeBand()
            })
            .attr("y2", function(d){
                return y(d.total)
            })
            .attr('transform', function(d) {
                return 'translate(' + x(d['group']) + ',0)';
            });

    // svg.selectAll(".linetext")
    //     .data(secondaryData)
    //     .enter()
    //     .append("text")
    //     .attr("class", "bartext")
    //     .attr("text-anchor", "middle")
    //     .attr("fill", "white")
    //     .attr("x",0)
    //     .attr("y",function(d){
    //         return y(d.total)-40
    //     })
    //     .text(function(d){
    //          return d.rate + "% national rate";
    //     })
    //     .attr('transform', function(d) {
    //         return 'translate(' + x(d['group']) + ',0)';
    //     });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
