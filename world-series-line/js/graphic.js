// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DATA_URL = 'world_series_data_transpose.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var GRAPHIC_MARGIN = {
    top: 5,
    right: 15,
    bottom: 30,
    left: 80
};

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// Globals
var $graphic = null;
var pymChild = null;
var graphicData = null;
var isMobile = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    $graphic = $(GRAPHIC_ID);

    if (Modernizr.svg) {
        d3.csv(GRAPHIC_DATA_URL, onDataLoaded);
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * CSV loaded
 */
var onDataLoaded = function(error, data) {
    graphicData = data;
    graphicData.forEach(function(d) {
        d['date'] = fmtYearFull.parse(d['year']);
    });

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Render the graphic(s)
 */
var render = function(containerWidth) {
    // Fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear out existing graphic (for re-drawing)
    $graphic.empty();

    drawGraph(containerWidth, GRAPHIC_ID, graphicData);

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id, data) {
    var graph = d3.select(id);

    var color = d3.scale.ordinal()
        .range(['#B71234','#A71930','#002F5F','#ED4C09','#C60C30','#003279','#000000','#C6011F','#003366','#333366','#001742','#F9423A','#FF7F00','#74B4FA','#083C6B','#92754C','#072754','#FB4F14','#1C2841','#003831','#BA0C2F','#FDB829','#B4A76C','#005C5C','#F2552C','#C41E3A','#9ECEEE','#003279','#003DA5','#BA122B']);

    // Desktop / default
    var aspectWidth = 4;
    var aspectHeight = 3;
    var ticksX = 10;
    var ticksY = 10;

    // Mobile
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
    }

    // define chart dimensions
    var width = graphicWidth - GRAPHIC_MARGIN['left'] - GRAPHIC_MARGIN['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - GRAPHIC_MARGIN['top'] - GRAPHIC_MARGIN['bottom'];

    var x = d3.time.scale()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY);

    var yAxisGrid = function() {
        return yAxis;
    }

    // define the line(s)
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    var area = d3.svg.area()
        .x(function(d) { return x(d['date']); })
        .y0(height)
        .y1(function(d) { return y(d['amt']); });

    // assign a color to each line
    color.domain(d3.keys(graphicData[0]).filter(function(key) {
        return key !== 'year';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == 'date') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    // set the data domain
    x.domain(d3.extent(graphicData, function(d) {
        return d['date'];
    }));

    y.domain([ 0, d3.max(d3.entries(formattedData), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                return Math.ceil(n/5) * 5; // round to next 5
            });
        })
    ]);

    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + GRAPHIC_MARGIN['left'] + GRAPHIC_MARGIN['right'])
		.attr('height', height + GRAPHIC_MARGIN['top'] + GRAPHIC_MARGIN['bottom'])
        .append('g')
            .attr('transform', 'translate(' + GRAPHIC_MARGIN['left'] + ',' + GRAPHIC_MARGIN['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // y-axis gridlines
    svg.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    // draw the area
    svg.append('g')
        .attr('class', 'areas')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'area area-' + i + ' ' + classify(d['key']);
            })
            .attr("d", function(d) {
                return area(d['value']);
            })
            .style("opacity", 0.1)
            .style("fill", function(d) { return color(d['key']);});

    // draw the line(s)
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return color(d['key']);
            })
            //.attr('stroke-width',6)
            .attr('d', function(d) {
                return line(d['value']);
            })
            .style("stroke-opacity", 0.1)
            .on("mouseover",function(d,i){
              var sel = d3.select(this);
              sel.moveToFront();
              sel.transition().style("stroke-opacity", 1)
              var area = d3.select('.area-'+i)
              area.transition().style("opacity", 0.75)
              area.moveToFront()
            })
            .on("mouseout",function(d,i){
              var sel = d3.select(this);
              sel.transition().style("stroke-opacity", 0.1)
              var area = d3.select('.area-'+i)
              area.transition().style("opacity", 0.1)
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
