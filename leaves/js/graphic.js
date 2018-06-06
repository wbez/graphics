// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var graphicData = null;


// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'] != null;
            })
        });
    }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 75,
        bottom: 40,
        left: 60
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(["#ce8484", COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //     .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item ' + classify(d['name']);
    //         });

    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['name']);
    //     });

    // legend.append('label')
    //     .text(function(d) {
    //         return d['name'];
    //     });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // SVG for arrow
    chartElement.append("svg:defs").selectAll("marker")
        .data(["arrow"])
      .enter().append("svg:marker")
        .attr('class','arrow')
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 5)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");


    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return fmtYearFull(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });


    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "translate(" + (chartWidth / 2) + " ," + (chartHeight + margins['bottom']) + ")")
        .style("text-anchor", "middle")
        .text("Year");

    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margins['left'])
        .attr("x",0 - (chartHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Yard waste (tonnage)");


// Render annotations

var offset = 5;
var box10 = chartElement.append('g')
        .attr('class', 'annotation-box')
        .append('rect');

var box11 = chartElement.append('g')
        .attr('class', 'annotation-box')
        .append('rect');

var box19 = chartElement.append('g')
        .attr('class', 'annotation-box')
        .append('rect');

var boxHold = chartElement.append('g')
        .attr('class', 'annotation-box')
        .append('rect');

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
        .attr('x', function() {
                return xScale(d3.time.format('%Y').parse('2008'))-40
            })
            .attr('y', function(d) {
                return yScale(4000) - 10
            })
            .text(function(d) {
                return "Citywide pickup"
            })
            .attr('class','feb10');

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
        .attr('x', function() {
                return xScale(d3.time.format('%Y').parse('2010'))-30
            })
            .attr('y', function(d) {
                return yScale(2400) - 10
            })
            .text(function(d) {
                return "Scaled down operations"
            })
            .attr('class','feb09');

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
            .attr('x', function() {
                return xScale(d3.time.format('%Y').parse('2012'))-10
            })
            .attr('y', function(d) {
                return yScale(1400) - 10
            })
            .text(function(d) {
                return "No leaf collection"
            })
            .attr('class','feb19');


    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
            .attr('x', function() {
                if (isMobile) {
                    return xScale(d3.time.format('%Y').parse('2014'))-30
                } else {
                    return xScale(d3.time.format('%Y').parse('2014'))-10
                }
            })
            .attr('y', function(d) {
                return yScale(700) - 10
            })
            .text(function(d) {
                return "311 call program launched"
            })
            .attr('class','hold');

   box10bounds = d3.select(".feb10").node().getBBox()
   box11bounds = d3.select(".feb09").node().getBBox()
   box19bounds = d3.select(".feb19").node().getBBox()
   boxHoldBounds = d3.select(".hold").node().getBBox()

    box10
        .attr('x', function() {
                return box10bounds.x -5;
            })
            .attr('y', function(d) {
                return box10bounds.y -5;
            })
            .attr('width', function(d) {
                return box10bounds.width +10;
            })
            .attr('height', function(d) {
                return box10bounds.height +10;
            })

    box11
        .attr('x', function() {
                return box11bounds.x -5;
            })
            .attr('y', function(d) {
                return box11bounds.y -5;
            })
            .attr('width', function(d) {
                return box11bounds.width +10;
            })
            .attr('height', function(d) {
                return box11bounds.height +10;
            })

    boxHold
        .attr('x', function() {
                return boxHoldBounds.x -5;
            })
            .attr('y', function(d) {
                return boxHoldBounds.y -5;
            })
            .attr('width', function(d) {
                return boxHoldBounds.width +10;
            })
            .attr('height', function(d) {
                return boxHoldBounds.height +10;
            })


    box19
        .attr('x', function() {
                return box19bounds.x -5;
            })
            .attr('y', function(d) {
                return box19bounds.y -5;
            })
            .attr('width', function(d) {
                return box19bounds.width +10;
            })
            .attr('height', function(d) {
                return box19bounds.height +10;
            })

    boxHold
        .attr('x', function() {
                return boxHoldBounds.x -5;
            })
            .attr('y', function(d) {
                return boxHoldBounds.y -5;
            })
            .attr('width', function(d) {
                return boxHoldBounds.width +10;
            })
            .attr('height', function(d) {
                return boxHoldBounds.height +10;
            })

    // chartElement.append("line")
    //     .attr('class','arrowline')
    //     .attr("x1", boxHoldBounds.x - 125)
    //     .attr("y1", boxHoldBounds.y - 15)
    //     .attr("x2", xScale(d3.time.format('%Y').parse('2012'))) 
    //     .attr("y2", yScale(80))

    // chartElement.append("line")
    //     .attr('class','arrowline')
    //     .attr("x1", boxHoldBounds.x - 60)
    //     .attr("y1", boxHoldBounds.y - 15)
    //     .attr("x2", xScale(d3.time.format('%Y').parse('2013'))) 
    //     .attr("y2", yScale(80))

    // chartElement.append("line")
    //     .attr('class','arrowline')
    //     .attr("x1", boxHoldBounds.x - 125)
    //     .attr("y1", yScale(1185))
    //     .attr("x2", boxHoldBounds.x - 60) 
    //     .attr("y2", yScale(1185))


    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", box19bounds.x + 35)
        .attr("y1", box19bounds.y + 15)
        .attr("x2", xScale(d3.time.format('%Y').parse('2012'))) 
        .attr("y2", yScale(80))
        .attr("marker-end", "url(#arrow)");

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", box19bounds.x + 53)
        .attr("y1", box19bounds.y + 15)
        .attr("x2", xScale(d3.time.format('%Y').parse('2013'))) 
        .attr("y2", yScale(80))
        .attr("marker-end", "url(#arrow)");

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", boxHoldBounds.x+(boxHoldBounds.width/2))
        .attr("y1", boxHoldBounds.y+(boxHoldBounds.height))
        .attr("x2", xScale(d3.time.format('%Y').parse('2014'))) 
        .attr("y2", yScale(80))
        .attr("marker-end", "url(#arrow)");



    // chartElement.append("line")
    //     .attr('class','arrowline')
    //     .attr("x1", box19Bounds.x+(box19Bounds.width/2))
    //     .attr("y1", box19Bounds.y+(box19Bounds.height))
    //     .attr("x2", xScale(d3.time.format('%Y').parse('2012'))) 
    //     .attr("y2", yScale(50))
    //     .attr("marker-end", "url(#arrow)");

    // chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(config['data'])
    //     .enter().append('text')
    //         .attr('x', function(d, i) {
    //             var last = d['values'][d['values'].length - 1];

    //             return xScale(last[dateColumn]) + 5;
    //         })
    //         .attr('y', function(d) {
    //             var last = d['values'][d['values'].length - 1];

    //             return yScale(last[valueColumn]) + 3;
    //         })
    //         .text(function(d) {
    //             var last = d['values'][d['values'].length - 1];
    //             var value = last[valueColumn];

    //             var label = last[valueColumn].toFixed(1);

    //             if (!isMobile) {
    //                 label = d['name'] + ': ' + label;
    //             }

    //             return label;
    //         });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
