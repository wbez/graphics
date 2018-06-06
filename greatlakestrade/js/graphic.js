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
var fmtThousands = d3.format("s");

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
        d['date'] = d3.time.format('%Y').parse(d['date']);

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
        right: 25,
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
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var button1 = containerElement.append("div")
            .attr("class", "button1")
            .html('<button class="btn btn-default btn-sm" type="submit">Early 20th Century (1900-1938)</button>');
        
    var button2 = containerElement.append("div")
            .attr("class", "button2")
            .html('<button class="btn btn-default btn-sm" type="submit">Glory Days (1939-1981)</button>');
    var formattedData = {};

    var button3 = containerElement.append("div")
            .attr("class", "button3")
            .html('<button class="btn btn-default btn-sm" type="submit">Rough Waters (1982-today)</button>');

    button1.on('click', function(){
        d3.select('.box1')
            .classed("show",true);
        d3.select('.box2')
            .classed("show",false);
        d3.select('.box3')
            .classed("show",false);    
        d3.select('.text p')
            .html('Shortly after its creation in 1901, the United States Steel Corporation began building massive, integrated steel mills around the Great Lakes. Iron ore from Minnesota and coal from Pennsylvania flowed freely to mills in Cleveland, Ohio; Gary, Indiana; and Chicago — until the Great Depression ground traffic to a halt. In the early 1930s, many shipping vessels sat empty in ports.');
        pymChild.sendHeight();
    })

    button2.on('click', function(){
        d3.select('.box1')
            .classed("show",false);
        d3.select('.box2')
            .classed("show",true);
        d3.select('.box3')
            .classed("show",false);  
        d3.select('.text p')
            .html('The onset of World War II jump-started Great Lakes shipping, as nearby steel mills cranked out steel for weapons and vehicles. After the war, the U.S. remained the top provider of steel to Europe and the rest of the world, sustaining iron ore shipments on the lakes. Meanwhile, the new roads and buildings that sprung up in the post-war boom helped sustain stone shipments.');  
        pymChild.sendHeight();
    })

    button3.on('click', function(){
        d3.select('.box1')
            .classed("show",false);
        d3.select('.box2')
            .classed("show",false);
        d3.select('.box3')
            .classed("show",true);    
        d3.select('.text p')
            .html('By the early ’80s, Europe and Japan had built up their steelmaking capacity to compete with the U.S. The surge in imported steel — combined with a major recession in 1981 — led to a sharp fall in iron ore and stone shipments. Both commodities recovered somewhat in the ’90s, before dropping drastically again around 2008 during the Great Recession.');
        pymChild.sendHeight();
    })

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
        .range([ '#EC0101', '#F9B816', '#72A2A9', '#64686E', COLORS['teal3'] ]);

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

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return fmtThousands(d);
            } else {
                return fmtThousands(d);
            }
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
            .attr('class', 'box box1 show')
            .append('rect')
                .attr('x', function() {
                    return xScale(d3.time.format('%Y').parse('1900'))                
                })
                .attr('y', function() {
                    return yScale.domain()[0];
                })
                .attr('width', function() {
                    var start=xScale(d3.time.format('%Y').parse('1900'))
                    var end=xScale(d3.time.format('%Y').parse('1938'))
                    return end-start
                })

                .attr('height', chartHeight);

    chartElement.append('g')
            .attr('class', 'box box2')
            .append('rect')
                .attr('x', function() {
                    return xScale(d3.time.format('%Y').parse('1939'))                
                })
                .attr('y', function() {
                    return yScale.domain()[0];
                })
                .attr('width', function() {
                    var start=xScale(d3.time.format('%Y').parse('1939'))
                    var end=xScale(d3.time.format('%Y').parse('1981'))
                    return end-start
                })

                .attr('height', chartHeight);

    chartElement.append('g')
            .attr('class', 'box box3')
            .append('rect')
                .attr('x', function() {
                    return xScale(d3.time.format('%Y').parse('1982'))                
                })
                .attr('y', function() {
                    return yScale.domain()[0];
                })
                .attr('width', function() {
                    var start=xScale(d3.time.format('%Y').parse('1982'))
                    var end=xScale(d3.time.format('%Y').parse('2014'))
                    return end-start
                })

                .attr('height', chartHeight);


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
        .defined(function(d) { return d[valueColumn]; })
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
        .text("Short tons");




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
