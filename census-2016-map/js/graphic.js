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
        loadJSON('build/us.json')
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
    console.log(url);
    d3.json(url, function(error, data) {
        graphicData = data;

        console.log(graphicData)

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

    us = config['data']

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var ratio = 0.5
    var radiusRange = 20;

    if (isMobile) {
        radiusRange = 10;
    }

    var radius = d3.scale.sqrt()
        .domain([0, 100000])
        .range([0, radiusRange]);

    var formatNumber = d3.format(",.0f");

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = chartWidth*ratio

    var projection = d3.geo.albersUsa()
        .scale(chartWidth)
        .translate([chartWidth / 2, chartHeight / 2]);

    var path = d3.geo.path()
        .projection(projection);

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
      .datum(topojson.feature(us, us.objects.nation))
      .attr("class", "land")
      .attr("d", path);

    chartElement.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "border border--state")
      .attr("d", path);

    chartElement.append("g")
          .attr("class", "bubble")
        .selectAll("circle")
          .data(topojson.feature(us, us.objects.counties).features
            .sort(function(a, b) { return Math.abs(b.properties.population) - Math.abs(a.properties.population); }))
        .enter().append("circle")
          .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
          .attr("r", function(d) { return radius(Math.abs(d.properties.population)); })
          .attr("class", function(d){
            if (d.properties.population >= 0){
                return 'positive';
            } else {
                return 'negative';
            }
          })
        .append("title")
          .text(function(d) {
            return d.properties.name
                + "\nPopulation " + formatNumber(d.properties.population);
          });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
