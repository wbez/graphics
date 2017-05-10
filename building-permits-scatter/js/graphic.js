// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

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

    // formatData();

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

        //formatData();

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
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

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
        right: 20,
        bottom: 40,
        left: 50
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
    var xScale = d3.scale.linear()
        .domain([ 0, d3.max(config['data'], function(d) {
                var n = d['demo'];
                return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0, d3.max(config['data'], function(d) {
                var n = d['new'];
                return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data']).filter(function(key) {
            return key == 'community';
        }))
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //         .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item key-' + i + ' ' + classify(d['community']);
    //         });

    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['community']);
    //     });

    // legend.append('label')
    //     .text(function(d) {
    //         return d['community'];
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

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return d
            } else {
                return d
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

    // SVG for arrow
    chartElement.append("svg:defs").selectAll("marker")
        .data(["arrow"])
      .enter().append("svg:marker")
        .attr('class','arrow')
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    // Append center line
    chartElement.append("line")
        .attr('class','centerline')
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", xScale(1200)) 
        .attr("y2", yScale(1200));

    // Append lines and arrows
    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", xScale(400))
        .attr("y1", yScale(400))
        .attr("x2", xScale(400)) 
        .attr("y2", yScale(300))
        .attr("marker-end", "url(#arrow)");

    chartElement.append("line")
        .attr('class','arrowline')
        .attr("x1", xScale(400))
        .attr("y1", yScale(400))
        .attr("x2", xScale(400)) 
        .attr("y2", yScale(500))
        .attr("marker-end", "url(#arrow)");

    // Append axis names
    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "translate(" + (chartWidth / 2) + " ," + (chartHeight + margins['bottom']) + ")")
        .style("text-anchor", "middle")
        .text("Demolitions");

    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margins['left'])
        .attr("x",0 - (chartHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("New construction");

    /*
     * Render points to chart.
     */

    chartElement.append('g')
        .attr('class', 'circle')
        .selectAll('circles')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('class', function(d, i) {
                return 'circle circle-' + i + ' ' + classify(d['community']);
            })
            .attr("r", 3.5)
            .attr('fill',function(d){
                if (d['community'] == 'NORTH CENTER') {
                    return '#F9BA16'
                } else {
                    return '#72A2A9'
                }
            })
            .attr('cx', function(d) {
                return xScale(d['demo'])
            })
            .attr('cy', function(d) {
                return yScale(d['new']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
        .filter(function(d){
            // return d['community'] == 'NORTH CENTER'
            return d['new'] > 600 || d['demo'] > 500
        })
            .attr('x', function(d, i) {
                if (d['community'] == 'WEST TOWN'){
                    return xScale(d['demo']) - 75
                } else {
                    return xScale(d['demo']) - 20
                }
            })
            .attr('y', function(d) {
                if (d['community'] == 'WEST TOWN'){
                    return yScale(d['new']) + 16
                } else if (d['community'] == 'WEST ENGLEWOOD'){
                    return yScale(d['new']) + 15
                } else {
                    return yScale(d['new']) - 8
                }
            })
            .text(function(d) {

                var label = '';

                if (!isMobile) {
                    label = d['community'];
                } else if (d['community'] == "NORTH CENTER") {
                    label = d['community'];
                }

                return label;
            });

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
        .attr('x', function() {
                console.log('x')
                return xScale(400)
            })
            .attr('y', function(d) {
                return yScale(500) - 5
            })
            .text(function(d) {
                return "More new construction"
            });

    chartElement.append('g')
        .attr('class', 'annotation')
        .append('text')
        .attr('x', function() {
                console.log('x')
                return xScale(400)
            })
            .attr('y', function(d) {
                return yScale(300) + 10
            })
            .text(function(d) {
                return "More demolitions"
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
