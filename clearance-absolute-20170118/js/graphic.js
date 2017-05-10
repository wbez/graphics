// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

var BAR_HEIGHT = 10;
var BAR_GAP = 4;
var BAR_GAP_INNER = 0;
var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 30;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 25;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var color;
var graphicData;
var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */


 /*
 * Load graphic data from a local source.
 */
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

    color = d3.scale.ordinal()
        .range([colors['blue3'], colors['orange3']])
        .domain(d3.keys(graphicData[0]).filter(function(key) { return key !== 'Group'; }));

    graphicData.forEach(function(d) {
        d['key'] = d['Group'];
        d['value'] = [];
        color.domain().map(function(name) {
            d['value'].push({ 'label': name, 'amt': +d[name], 'year': d['Group']});
            delete d[name];
        });
        delete d['Group'];
    });

    pymChild = new pym.Child({
        renderCallback: render
    });
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
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
    // $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


var drawGraph = function(graphicWidth) {

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var graph = d3.select('#graphic');
    var margin = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (LABEL_WIDTH + LABEL_MARGIN)
    };
    var numGroups = graphicData.length;
    var numGroupBars = graphicData[0]['value'].length;
    var ticksX = 1;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    // var width = (((((BAR_HEIGHT + BAR_GAP_INNER) * numGroupBars) - BAR_GAP_INNER) + BAR_GAP) * numGroups) - BAR_GAP + BAR_GAP_INNER;
    // var width = 600
    var bar_total = width/(numGroups-1)
    BAR_HEIGHT = bar_total*0.40
    BAR_GAP = bar_total*0.165

    if (isMobile) {
        BAR_HEIGHT = bar_total*0.5
        BAR_GAP = 0;
    }

    console.log(bar_total, numGroups, width, BAR_HEIGHT)

    var groupHeight = (BAR_HEIGHT * numGroupBars) + (BAR_GAP_INNER * (numGroupBars - 1));
    var height = 300;

    var x = d3.scale.ordinal()
        .domain(graphicData.map(function(d) { return d['key']; }))
        .rangeBands([0, width]);

    var y = d3.scale.linear()
        .domain([ 0, d3.max(graphicData, function(c) {
                return d3.max(c['value'], function(v) {
                    var n = v['amt'];
                    return Math.ceil(n/10) * 10; // round to next 10
                });
            })
        ])
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([1991,1995,2000,2005,2010,2016])
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var yAxisGrid = function() {
        return yAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(graphicData[0]['value'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['label']);
            });
    legend.append('b')
        .style('background-color', function(d) {
            return color(d['label']);
        });
    legend.append('label')
        .text(function(d) {
            return d['label'];
        });

    // draw the chart
    var chart = graph.append('div')
        .attr('class', 'chart');

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (bottom)
    svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(0,0)')
        .call(yAxis);

    // y-axis gridlines
    svg.append('g')
        .attr('class', 'y grid')
        .attr('transform', 'translate('+width + ',0)')
        .call(yAxisGrid()
            .tickSize(width, 0, 0)
            .tickFormat('')
        );

    // draw the bars
    var barGroup = svg.selectAll('.bar-group')
        .data(graphicData)
        .enter().append('g')
            .attr('class', 'g')
            .attr('transform', function(d,i) {
                if (i == 0) {
                    return 'translate(0,0)';
                } else {
                    return 'translate(' + ((groupHeight + BAR_GAP) * i) + ',0)';
                }
            });

    barGroup.selectAll('rect')
        .data(function(d) { return d['value']; })
        .enter().append('rect')
            .attr('width', BAR_HEIGHT)
            .attr('y', function(d, i) {
                return y(d['amt']);
            })
            .attr('x', function(d, i) {
                if (i == 0) {
                    return 0;
                } else {
                    return (BAR_HEIGHT * i) + (BAR_GAP_INNER * i);
                }
            })
            .attr('height', function(d) {
                return height-y(d['amt']);
            })
            .style('fill', function(d) {
                return color(d['label']);
            })
            .attr('class', function(d) {
                return 'y-' + d['label'];
            })
            .on("mouseover", function (d) {
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .select("h4")
                        .text(d['label'] + ': ' + d['year']);
                d3.select("#tooltip")        
                    .select("#value")
                        .text(d['amt']);
            })
            .on("mouseout", function () {
                // Hide the tooltip
                d3.select("#tooltip")
                    .style("opacity", 0);;
            });

}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;