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
        // loadLocalData(GRAPHIC_DATA);
        loadJSON('build/chicago.json')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function(url) {
    d3.json(url, function(error, data) {
        graphicData = data;
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
        d['key'] = d['Group'];
        d['values'] = [];

        _.each(d, function(v, k) {
            if (_.contains(['Group', 'key', 'values'], k)) {
                return;
            }

            d['values'].push({ 'label': k, 'amt': +v });
            delete d[k];
        });

        delete d['Group'];
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
    renderMap({
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
 * Render a bar chart.
 */
var renderMap = function(config) {
    /*
     * Setup chart container.
     */

    chicago = config['data']

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var ratio = 0.75
    var radiusRange = 255;

    if (isMobile) {
        radiusRange = 155;
    }

    var radius = d3.scale.sqrt()
        .domain([0, 100000])
        .range([0, radiusRange]);

    var formatNumber = d3.format(",.0f");

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = chartWidth*ratio

    var projection = d3.geo.transverseMercator()
        .rotate([88 + 20 / 60, -36 - 40 / 60]);

    var path = d3.geo.path()
        .projection(projection)
        .pointRadius(1.5);

    var cas = topojson.feature(chicago, chicago.objects.cas);

    projection
        .scale(1)
        .translate([0, 0]);

    var b = path.bounds(cas),
        s = .95 / Math.max((b[1][0] - b[0][0]) / chartWidth, (b[1][1] - b[0][1]) / chartHeight),
        t = [(chartHeight - s * (b[1][0] + b[0][0])) / 2, (chartHeight - s * (b[1][1] + b[0][1])) / 2];

    projection
      .scale(s)
      .translate(t);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g');
        // .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    chartElement.append("path")
      .datum(topojson.feature(chicago, chicago.objects.chicago))
      .attr("class", "land")
      .attr("d", path);

    chartElement.append("path")
      .datum(topojson.mesh(chicago, chicago.objects.cas, function(a, b) { return a !== b; }))
      .attr("class", "border border--state")
      .attr("d", path);

    chartElement.append("g")
          .attr("class", "bubble")
        .selectAll("circle")
          .data(topojson.feature(chicago, chicago.objects.schools).features
            .sort(function(a, b) { return Math.abs(b.properties.arrests) - Math.abs(a.properties.arrests); }))
        .enter().append("circle")
          .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
          .attr("r", function(d) { return radius(Math.abs(d.properties.arrests)); });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
