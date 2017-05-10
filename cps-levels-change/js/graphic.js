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
    // graphicData.forEach(function(d) {
    //     d['key'] = d['Group'];
    //     d['values'] = [];

    //     _.each(d, function(v, k) {
    //         if (_.contains(['Group', 'key', 'values'], k)) {
    //             return;
    //         }

    //         d['values'].push({ 'label': k, 'amt': +v });
    //         delete d[k];
    //     });

    //     delete d['Group'];
    // });

    graphicData.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'year') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'year': d['year'],
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
    var comma = d3.format(",");

    var barHeight = 30;
    var barGap = 5;
    var barAdjust = 3;
    var labelWidth = 60;
    var labelMargin = 6;
    var valueGap = 6;
    var labels = ['2010-2011','2015-2016'];

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = (((barHeight + barGap) * config['data'].length)-(barAdjust/2)*config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var min = d3.min(config['data'], function(d) {
         var lastValue = d['values'][d['values'].length - 1];

         return Math.floor(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
     });

     if (min > 0) {
         min = 0;
     }

     var xScale = d3.scale.linear()
         .domain([
             min,
             d3.max(config['data'], function(d) {
                 var lastValue = d['values'][d['values'].length - 1];

                 return Math.ceil(lastValue['x1'] / roundTicksFactor) * roundTicksFactor;
             })
         ])
         .rangeRound([0, chartWidth]);

     var colorScale = d3.scale.ordinal()
         .domain(["2010-2011Level 1+","2010-2011Level 2","2010-2011Level 3","2015-2016Level 1+","2015-2016Level 1","2015-2016Level 2+","2015-2016Level 2","2015-2016Level 3"])
         .range([ COLORS['teal3'], COLORS['teal3'],COLORS['teal3'],COLORS['orange3'],COLORS['orange4'], COLORS['orange3'],COLORS['orange3'],COLORS['orange4'] ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(labels)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend
        .append('b')
        .style('background-color', function(d) {
            return colorScale(d+'Level 2');
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
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return comma(d);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

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
                if (i % 2 == 1) {
                    console.log(i,i % 2);
                    barAdjust = 3;
                } else {
                    barAdjust = 0;
                }
                 return 'translate(0,' + ((i * (barHeight + barGap))-barAdjust) + ')';
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
                 console.log(d['year']+d['name']);
                 return colorScale(d['year']+d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['year']);
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
                    return d['name'];
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
                    d3.select(this).classed('outside', true)
                    return (valueGap)
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
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d,i) {
                    if (i == 0 || i==2 || i==4) {
                        return d[labelColumn];
                    } else {
                        return ''
                    }
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
