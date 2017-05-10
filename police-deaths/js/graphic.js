// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

/*
 * Initialize the graphic.
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
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
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
    renderStackedBarChart({
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
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var noDecimals = d3.format("f0");
    var line = d3.svg.line()
        .interpolate('cardinal');

    var barHeight = 3;
    var barGap = 1;
    var labelWidth = 60;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 20,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 5;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var min = d3.min(config['data'], function(d) {
         var lastValue = d['values'][d['values'].length - 1];
         return Math.floor(lastValue['x1']);
     });

     if (min > 0) {
         min = 0;
     }

     var xScale = d3.scale.linear()
         .domain([
             min,
             d3.max(config['data'], function(d) {
                 var lastValue = d['values'][d['values'].length - 1];

                 return Math.ceil(lastValue['x1']);
             })
         ])
         .rangeRound([0, chartWidth]);

    var yScale = d3.scale.linear()
        .domain([1853,2015])
        .range([chartHeight, 0]);

     var colorScale = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != labelColumn && d != 'values';
         }))
         .range(["#72A2A9","#F9B816"]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
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
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var xAxisBottom = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .tickValues(d3.range(1853, 2015, 5));

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisBottom);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxisBottom;
    };

    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .attr('transform', makeTranslate(0, 0))
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );


     /*
      * Render prohibition annotation.
      */
     chartElement.append('rect')
         .attr('class', 'prohibition')
         .attr('height', ((1934-1920) * (barHeight + barGap)))
         .attr('width', chartWidth)
         .attr('transform', function(d,i) {
             return 'translate(0,' + ((1920-1853) * (barHeight + barGap)) + ')';
         })
         .style('fill','#C5C5C5')
         .style('opacity',0.25);

    chartElement.append('text')
         .attr('class', 'prohibition-text')
         .attr('x', function() {
                return xScale(12);
            })
         .attr('transform', function(d,i) {
             return 'translate(0,' + ((1923-1853) * (barHeight + barGap)) + ')';
         })
         .text('Prohibition');

    /*
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                if (d['val'] != 0) {
                    // return d['val'];
                    return '';
                }
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
 				return xScale(d['x1']);
            })
            .attr('dx', function(d) {
                var textWidth = this.getComputedTextLength();
                var barWidth = Math.abs(xScale(d['x1']) - xScale(d['x0']));

                // Hide labels that don't fit
                if (textWidth + valueGap * 2 > barWidth) {
                    d3.select(this).classed('hidden', true)
                }

                if (d['x1'] < 0) {
                    return valueGap;
                }

                return -(valueGap + textWidth);
            })
            .attr('dy', (barHeight / 2) + 4)

     /*
      * Render 0-line.
      */
     chartElement.append('line')
         .attr('class', 'zero-line')
         .attr('x1', xScale(0))
         .attr('x2', xScale(0))
         .attr('y1', 0)
         .attr('y2', chartHeight);

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap) - 5) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    if (d[labelColumn] % 5 == 0) {
                        return noDecimals(d[labelColumn])
                    } else {
                        return '';
                    }
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
