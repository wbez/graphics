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
        loadJSON('counties.json')
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

    illinois = config['data']

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var ratio = 0.56
    var radiusRange = 255;

    if (isMobile) {
        radiusRange = 155;
    }

    var radius = d3.scale.sqrt()
        .domain([0, 100000])
        .range([0, radiusRange]);

    var formatNumber = d3.format(",.0f");

    var color = d3.scale.linear()
        .domain([-0.4, 0, 0.70])
        .range(['#a50026','white','#313695']);

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = chartWidth*ratio

    var projection = d3.geo.mercator()
      .center([-89, 40])
      .scale(chartWidth*4)
      .translate([chartWidth / 4, chartHeight / 2]);

     var projection2 = d3.geo.mercator()
      .center([-89, 40])
      .scale(chartWidth*4)
      .translate([chartWidth / 1.25, chartHeight / 2]);

    var path = d3.geo.path()
        .projection(projection);

    var path2 = d3.geo.path()
        .projection(projection2);

    var counties = topojson.feature(illinois, illinois.objects.counties);

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

    chartElement.append("g")
      .attr("class", "counties")
    .selectAll("path")
    .data(topojson.feature(illinois, illinois.objects.counties).features)
    .enter().append("path")
      .attr("fill", function(d) { return color(d.properties.diff_2010); })
      .attr("d", path);

    chartElement.append("g")
      .attr("class", "counties")
    .selectAll("path")
    .data(topojson.feature(illinois, illinois.objects.counties).features)
    .enter().append("path")
      .attr("fill", function(d) { return color(d.properties.diff_2016); })
      .attr("d", path2);

    chartElement.append("path")
      .datum(topojson.mesh(illinois, illinois.objects.counties, function(a, b) { return a !== b; }))
      .attr("class", "border border--state")
      .attr("d", path);

    chartElement.append("path")
      .datum(topojson.mesh(illinois, illinois.objects.counties, function(a, b) { return a !== b; }))
      .attr("class", "border border--state")
      .attr("d", path2);

    // chartElement.append("g")
    //       .attr("class", "bubble")
    //     .selectAll("circle")
    //       .data(topojson.feature(chicago, chicago.objects.schools).features
    //         .sort(function(a, b) { return Math.abs(b.properties.arrests) - Math.abs(a.properties.arrests); }))
    //     .enter().append("circle")
    //       .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
    //       .attr("r", function(d) { return radius(Math.abs(d.properties.arrests)); });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
