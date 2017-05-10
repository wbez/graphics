// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtYearAbbrev = d3.time.format("%b '%y");
var fmtYearFull = d3.time.format("%b '%y");

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
        console.log(d['date'])
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
    var keyRight = 'Investigative Stop Reports **'
    var keyLeft = "Firearms Recovered *"

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 60,
        bottom: 35,
        left: 50
    };

    var ticksX = 3;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 6;
        ticksY = 5;
        margins.bottom = 25;
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
        .nice(); 

    var yScale = d3.scale.linear()
        .domain([ 0, d3.max(formattedData[keyLeft], function(c) {
                // return c[valueColumn];
                return 700;
            })
        ])
        .range([ chartHeight, 0 ]);

    var yScaleRight = d3.scale.linear()
        .domain([ 0, d3.max(formattedData[keyRight], function(c) {
                // return c[valueColumn];
                return 70000;
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ "#252525", "#888B90", "#F9B816", COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData).filter(function(d,i){
                return i != 1;
            }))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('svg')
        .attr('width','15')
        .attr('height','15')
            .append('line')
            .style('display','inline')
            .attr("x1", 0)
            .attr("y1", 10)
            .attr("x2", 15)
            .attr("y2", 10)
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr("stroke-width", 3)
            .style("stroke-dasharray", function(d,i){
                if (i==2) {
                    return ("3, 3");
                } else {
                    return ("0, 0")
                }
            });

    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['key']);
    //     });

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

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(d3.time.months, ticksX)
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
        .ticks(ticksY);

    var yAxisRight = d3.svg.axis()
        .scale(yScaleRight)
        .orient('right')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .selectAll('text')
        .attr("dx", "0.5em")
        .attr("dy", ".55em")
        .attr("transform", function(d) {
            return "rotate(-0)" 
        });

    chartElement.append('g')
        .attr('class', 'y axis left')
        .call(yAxis);

    chartElement.append('g')
        .attr('class', 'y axis right')
        .attr("transform", "translate(" + chartWidth + ",0)")
        .call(yAxisRight);

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
        .defined(function(d) { return d[valueColumn]!=0; })
        // .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    var lineRight = d3.svg.line()
        .defined(function(d) { return d[valueColumn]!=0; })
        // .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScaleRight(d[valueColumn]);
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
            .style("stroke-dasharray", function(d,i){
                if (i==1) {
                    return ("3, 3");
                } else {
                    return ("0, 0")
                }
            })
            .attr('d', function(d) {
                if (d['key'] == keyRight) {
                    return lineRight(d['value']);
                } else {
                    return line(d['value']);
                };
            });

    chartElement.selectAll('g.circles')
        .data(d3.entries(formattedData))
        .enter()
        .append('g')
        .attr("class", "circles")
        .attr('class', function(d, i) {
                return 'point point-' + i + ' ' + classify(d['key']);
            })
        .selectAll('circle')
        .data(function(d){return d.value})
            .enter()
            .append('circle')
            .style('display',function(d){
                console.log(d)
                if (d[valueColumn] == 0) {
                    return 'none';
                }
            })
            .attr('class', function(d, i) {
                return 'dot'+i;
            })
            .attr("r", 3)
            .attr("cx", function(d) { return xScale(d[dateColumn]); })
            .attr("cy", function(d,i) {
                if (d[valueColumn]>5000) {
                    return yScaleRight(d[valueColumn])
                } else {
                    return yScale(d[valueColumn]); 
                }
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
