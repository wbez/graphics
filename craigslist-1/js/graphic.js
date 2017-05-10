// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var GEO_DATA_URL = 'data/geodata.json';

var LABEL_DEFAULTS = {
    'text-anchor': 'start',
    'dx': '6',
    'dy': '4'
}

var CITY_LABEL_ADJUSTMENTS = {
    'Biratnagar': { 'dy': -3 },
    'Birganj': { 'dy': -3 },
    'Kathmandu': { 'text-anchor': 'end', 'dx': -4, 'dy': -4 },
    'Nepalganj': { 'text-anchor': 'end', 'dx': -4, 'dy': 12 },
    'Pokhara': { 'text-anchor': 'end', 'dx': -6 },
    'Kanpur': { 'dy': 12 }
}

var COUNTRY_LABEL_ADJUSTMENTS = {
    'Nepal': { 'text-anchor': 'end', 'dx': -50, 'dy': -20 },
    'Bangladesh': { 'text-anchor': 'end', 'dx': -10 }
}

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadJSON('data/geodata.json')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function(url) {
    d3.json(url, function(error, data) {
        geoData = data;

        pymChild = new pym.Child({
            renderCallback: render
        });
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
    renderLocatorMap({
        container: '#map',
        width: containerWidth,
        data: geoData,
        primaryCountry: 'Nepal'
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 1;
    var aspectHeight = 1.4;

    var bbox = config['data']['bbox'];
    var defaultScale = 74000
    var cityDotRadius = 3;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var centroid = [-87.729365,41.820675];
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / GRAPHIC_DEFAULT_WIDTH;

    projection = d3.geo.mercator()
        .center(centroid)
        .scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path = d3.geo.path()
        .projection(projection)
        .pointRadius(cityDotRadius * scaleFactor);

    /*
     * Create the root SVG element.
     */
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')

    /*
     * Create SVG filters.
     */
    var filters = chartElement.append('filters');

    var textFilter = filters.append('filter')
        .attr('id', 'textshadow');

    textFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '.25');

    var landFilter = filters.append('filter')
        .attr('id', 'landshadow');

    landFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '10');

    /*
     * Render countries.
     */
    // Land shadow
    // chartElement.append('path')
    //     .attr('class', 'landmass')
    //     .datum(mapData['states'])
    //     .attr('filter', 'url(#landshadow)')
    //     .attr('d', path);

    // Land outlines
    // chartElement.append('g')
    //     .attr('class', 'states')
    //     .selectAll('path')
    //         .data(mapData['states']['features'])
    //     .enter().append('path')
    //         .attr('class', function(d) {
    //             return classify(d['id']);
    //         })
    //         .attr('d', path);

    // Chicago outline
    chartElement.append('g')
        .attr('class', 'chicago')
        .selectAll('path')
            .data(mapData['chicago']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return 'chicago-boundary';
            })
            .attr('d', path);

    // CA outlines
    chartElement.append('g')
        .attr('class', 'community_areas')
        .selectAll('path')
            .data(mapData['community_areas']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return classify(d['id']);
            })
            .attr('d', path);

    // Highlight primary country
    var primaryCountryClass = classify(config['primaryCountry']);

    d3.select('.countries path.' + primaryCountryClass)
        .moveToFront()
        .classed('primary ' + primaryCountryClass, true);

    /*
     * Render points.
     */
    chartElement.append('g')
        .attr('class', 'points')
        .selectAll('path')
            .data(mapData['points']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                if (d['properties']['positive'] == true) {
                    return 'positive'
                } else if (d['properties']['negative'] == true) {
                    return 'negative'
                } else {
                    return 'neutral'
                }
            })
            .attr('d', path);

    d3.select('.points path.negative')
        .moveToFront();

    /*
     * Render lakes.
     */
    chartElement.append('g')
        .attr('class', 'lakes')
        .selectAll('path')
            .data(mapData['lakes']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render primary cities.
     */
    // chartElement.append('g')
    //     .attr('class', 'cities primary')
    //     .selectAll('path')
    //         .data(mapData['cities']['features'])
    //     .enter().append('path')
    //         .attr('d', path)
    //         .attr('class', function(d) {
    //             var c = 'place';

    //             c += ' ' + classify(d['properties']['city']);
    //             c += ' ' + classify(d['properties']['featurecla']);
    //             c += ' scalerank-' + d['properties']['scalerank'];

    //             return c;
    //         });

    /*
     * Render neighboring cities.
     */
    // chartElement.append('g')
    //     .attr('class', 'cities neighbors')
    //     .selectAll('path')
    //         .data(mapData['neighbors']['features'])
    //     .enter().append('path')
    //         .attr('d', path)
    //         .attr('class', function(d) {
    //             var c = 'place';

    //             c += ' ' + classify(d['properties']['city']);
    //             c += ' ' + classify(d['properties']['featurecla']);
    //             c += ' scalerank-' + d['properties']['scalerank'];

    //             return c;
    //         });

    /*
     * Apply adjustments to label positioning.
     */
    var positionLabel = function(adjustments, id, attribute) {
        if (adjustments[id]) {
            if (adjustments[id][attribute]) {
                return adjustments[id][attribute];
            } else {
                return LABEL_DEFAULTS[attribute];
            }
        } else {
            return LABEL_DEFAULTS[attribute];
        }
    }

    /*
     * Render country labels.
     */
    // chartElement.append('g')
    //     .attr('class', 'state-labels')
    //     .selectAll('.label')
    //         .data(mapData['states']['features'])
    //     .enter().append('text')
    //         .attr('class', function(d) {
    //             return 'label ' + classify(d['id']);
    //         })
    //         .attr('transform', function(d) {
    //             return 'translate(' + path.centroid(d) + ')';
    //         })
    //         .attr('text-anchor', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'text-anchor');
    //         })
    //         .attr('dx', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'dx');
    //         })
    //         .attr('dy', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'dy');
    //         })
    //         .text(function(d) {
    //             return COUNTRIES[d['properties']['state']] || d['properties']['state'];
    //         });

    // Highlight primary country
    var primaryCountryClass = classify(config['primaryCountry']);

    d3.select('.country-labels text.' + primaryCountryClass)
        .classed('label primary ' + primaryCountryClass, true);

    /*
     * Render city labels.
     */
    var layers = [
        'city-labels shadow',
        'city-labels',
        'city-labels shadow primary',
        'city-labels primary'
    ];

    // layers.forEach(function(layer) {
    //     var data = [];

    //     if (layer == 'city-labels shadow' || layer == 'city-labels') {
    //         data = mapData['neighbors']['features'];
    //     } else {
    //         data = mapData['cities']['features'];
    //     }

    //     chartElement.append('g')
    //         .attr('class', layer)
    //         .selectAll('.label')
    //             .data(data)
    //         .enter().append('text')
    //             .attr('class', function(d) {
    //                 var c = 'label';

    //                 c += ' ' + classify(d['properties']['city']);
    //                 c += ' ' + classify(d['properties']['featurecla']);
    //                 c += ' scalerank-' + d['properties']['scalerank'];

    //                 return c;
    //             })
    //             .attr('transform', function(d) {
    //                 return 'translate(' + projection(d['geometry']['coordinates']) + ')';
    //             })
    //             .attr('style', function(d) {
    //                 return 'text-anchor: ' + positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'text-anchor');
    //             })
    //             .attr('dx', function(d) {
    //                 return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dx');
    //             })
    //             .attr('dy', function(d) {
    //                 return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dy');
    //             })
    //             .text(function(d) {
    //                 return CITIES[d['properties']['city']] || d['properties']['city'];
    //             });
    // });

    d3.selectAll('.shadow')
        .attr('filter', 'url(#textshadow)');

    /*
     * Render a scale bar.
     */
    var scaleBarDistance = calculateOptimalScaleBarDistance(bbox, 10);
    var scaleBarStart = [10, mapHeight - 20];
    var scaleBarEnd = calculateScaleBarEndPoint(projection, scaleBarStart, scaleBarDistance);

    chartElement.append('g')
        .attr('class', 'scale-bar')
        .append('line')
        .attr('x1', scaleBarStart[0])
        .attr('y1', scaleBarStart[1])
        .attr('x2', scaleBarEnd[0])
        .attr('y2', scaleBarEnd[1]);

    d3.select('.scale-bar')
        .append('text')
        .attr('x', scaleBarEnd[0] + 5)
        .attr('y', scaleBarEnd[1] + 3)
        .text(scaleBarDistance + ' miles');

    chartElement.append('g')
        .attr('class', 'legend')
        .selectAll("circle")
            .data(['positive','negative'])
        .enter().append("circle")
            .attr('class', function(d, i) {return d})
            .attr("cy", function(d, i) { return scaleBarStart[1]-(40-i*20)})
            .attr("cx", 10)
            .attr("r", 4);

    d3.select('.legend')
        .selectAll("text")
            .data(['positive','negative'])
        .enter().append('text')
            .attr('x', 20)
            .attr('y', function(d, i) { return scaleBarStart[1]-(36-i*20)})
            .text(function(d, i) { return d });
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;