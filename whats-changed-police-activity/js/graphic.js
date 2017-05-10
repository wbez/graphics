// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries;

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
        d['date'] = d3.time.format('%b %Y').parse(d['date']);
        d['amt'] = +d['amt']
    });

    // Nest data by symbol.
    var categories = d3.nest()
      .key(function(d) { return d.type; })
      .entries(DATA);

    // Compute the maximum price per symbol, needed for the y-domain.
    categories.forEach(function(c) {
        c.maxPrice = d3.max(c.values, function(d) { return d['amt']; });
    });

    dataSeries = categories;
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
        top: 35,
        right: 15,
        bottom: 20,
        left: 45
    };

    var ticksX = 6;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    var singleChartWidth = chartWidth/3 - margins['left'];
    var singleChartHeight = chartHeight/3;

    // Mobile
    if (isMobile) {
        ticksX = 6;
        ticksY = 3;
        margins['right'] = 25;
        singleChartWidth = chartWidth;
        singleChartHeight = chartHeight/3;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');


    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .range([ 0, singleChartWidth ]);

    // var min = d3.min(config['data'], function(d) {
    //     return d3.min(d['values'], function(v) {
    //         return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    //     })
    // });

    // if (min > 0) {
    //     min = 0;
    // }

    // var max = d3.max(config['data'], function(d) {
    //     return d3.max(d['values'], function(v) {
    //         return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
    //     })
    // });

    // Compute the minimum and maximum date across symbols.
    // We assume values are sorted by date.
    xScale.domain([
        d3.min(dataSeries, function(c) { return c.values[0].date; }),
        d3.max(dataSeries, function(c) { return c.values[c.values.length - 1].date; })
    ]);

    var yScale = d3.scale.linear()
        .range([singleChartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(dataSeries, 'key'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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

    // var chartElement = chartWrapper.append('svg')
    //     .attr('width', chartWidth + margins['left'] + margins['right'])
    //     .attr('height', chartHeight + margins['top'] + margins['bottom'])
    //     .append('g')
    //     .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');


    // Add an SVG element for each symbol, with the desired dimensions and margin.
    var charts = chartWrapper.selectAll("svg")
            .data(dataSeries)
        .enter().append("svg")
          .attr("width", singleChartWidth + margins.left + margins.right)
          .attr("height", singleChartHeight + margins.top + margins.bottom)
        .append("g")
          .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

    chartWrapper.selectAll("svg")
        .append("text")
            .attr("x", margins['left'])             
            .attr("y", margins['top']-margins['bottom'])
            .text(function(d){
                return d['key']
            });

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(d3.time.months, ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return fmtDateAbbrev(d);
            } else {
                return fmtDateAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    charts.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, singleChartHeight))
        .call(xAxis);

    charts.append('g')
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

    charts.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, singleChartHeight))
        .call(xAxisGrid()
            .tickSize(-singleChartHeight, 0, 0)
            .tickFormat('')
        );

    charts.append('g')
        .attr('class', 'y grid');
        // .call(yAxisGrid()
        //     .tickSize(-singleChartWidth, 0, 0)
        //     .tickFormat('')
        // );

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

    charts.append('path')
        .attr('class', function(d, i) {
            return 'lines line ' + classify(d['key']);
        })
        .attr('stroke', function(d) {
            return colorScale(d['key']);
        })
        .attr("d", function(d) {
            yScale.domain([0, d.maxPrice])
            // var parent = d3.select(this.parentNode.parentNode);
            
            // parent.selectAll('.axis').filter('.y')
            //     .call(yAxis);

            // parent.selectAll('.grid').filter('.y')
            //     .call(yAxisGrid()
            //         .tickSize(-singleChartWidth, 0, 0)
            //         .tickFormat('')
            //     );

            return line(d.values); 
        });

    charts.each(function(d){
        yScale.domain([0, d.maxPrice])
        d3.select(this)
            .selectAll('.axis').filter('.y')
                .call(yAxis);

    })

    charts.each(function(d){
        yScale.domain([0, d.maxPrice])
        
        d3.select(this)
            .selectAll('.grid').filter('.y')
                .call(yAxisGrid()
                    .tickSize(-singleChartWidth, 0, 0)
                    .tickFormat('')
                );
    })

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
