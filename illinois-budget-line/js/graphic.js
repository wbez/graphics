// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtYearAbbrev = d3.time.format('%m/%d');
var fmtYearFull = d3.time.format('%m/%d');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
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
        right: 5,
        bottom: 20,
        left: 40
    };

    var ticksX = 5;
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

    var formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'date': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d[dateColumn];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0, d3.max(d3.entries(formattedData), function(c) {
                return d3.max(c['value'], function(v) {
                    var n = v[valueColumn];
                    return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
                });
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ COLORS['blue3'], COLORS['red3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
        });

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
                return fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return '$' + d +'M';
        });
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
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

// Render annotations

var offset = 5;
var box10 = chartElement.append('g')
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
                return xScale(d3.time.format('%m/%d/%Y').parse('2/10/2016'))+10
            })
            .attr('y', function(d) {
                return yScale(388.2) + 10
            })
            .text(function(d) {
                return "Teacher Retirement System payment"
            })
            .attr('class','feb10');

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
            .attr('x', function() {
                return xScale(d3.time.format('%m/%d/%Y').parse('2/19/2016'))-20
            })
            .attr('y', function(d) {
                return yScale(240.7) - 20
            })
            .text(function(d) {
                return "Board of Education payment"
            })
            .attr('class','feb19');


    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
            .attr('x', function() {
                if (isMobile) {
                    return xScale(d3.time.format('%m/%d/%Y').parse('2/02/2016'))+10
                } else {
                    return xScale(d3.time.format('%m/%d/%Y').parse('2/02/2016'))+50
                }
            })
            .attr('y', function(d) {
                return yScale(175) + 10
            })
            .text(function(d) {
                return "Payment hold"
            })
            .attr('class','hold');

   box10bounds = d3.select(".feb10").node().getBBox()
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

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", boxHoldBounds.x+(boxHoldBounds.width/2))
        .attr("y1", boxHoldBounds.y+(boxHoldBounds.height))
        .attr("x2", xScale(d3.time.format('%m/%d/%Y').parse('2/02/2016'))) 
        .attr("y2", yScale(50))
        .attr("marker-end", "url(#arrow)");

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", boxHoldBounds.x+(boxHoldBounds.width/2))
        .attr("y1", boxHoldBounds.y+(boxHoldBounds.height))
        .attr("x2", xScale(d3.time.format('%m/%d/%Y').parse('2/04/2016'))) 
        .attr("y2", yScale(50))
        .attr("marker-end", "url(#arrow)");

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", boxHoldBounds.x+(boxHoldBounds.width/2))
        .attr("y1", boxHoldBounds.y+(boxHoldBounds.height))
        .attr("x2", xScale(d3.time.format('%m/%d/%Y').parse('2/08/2016'))) 
        .attr("y2", yScale(40))
        .attr("marker-end", "url(#arrow)");
            

    // chartElement.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //     .data(d3.entries(formattedData))
    //     .enter().append('text')
    //         .attr('x', function(d, i) {
    //             var last = d['value'][d['value'].length - 1];

    //             return xScale(last[dateColumn]) + 5;
    //         })
    //         .attr('y', function(d) {
    //             var last = d['value'][d['value'].length - 1];

    //             return yScale(last[valueColumn]) + 3;
    //         })
    //         .text(function(d) {
    //             var last = d['value'][d['value'].length - 1];
    //             var value = last[valueColumn];

    //             var label = last[valueColumn].toFixed(1);

    //             if (!isMobile) {
    //                 label = d['key'] + ': ' + label;
    //             }

    //             return label;
    //         });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
