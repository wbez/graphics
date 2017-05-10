// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var comma = d3.format(",");
var pct = d3.format("%");
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
        right: 100,
        bottom: 0,
        left: 0
    };

    var ratio = 1.1
    var radiusRange = 50;
    var offset = 0.5;
    if (isMobile) {
        radiusRange = 50;
        margins['right'] = 50;
        offset=0.25;
    }

    var wards = topojson.feature(chicago, chicago.objects.wards);

    console.log(wards)

    var min = function(attribute){
        return d3.min(topojson.feature(chicago, chicago.objects.wards).features, function(d) {
            return +d.properties[attribute];
         })
    }

    var max = function(attribute){
        return d3.max(topojson.feature(chicago, chicago.objects.wards).features, function(d) {
            return +d.properties[attribute];
         })
    }

    var color = d3.scale.linear()
        .domain([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        .range(['#a50026','#d73027','#f46d43','#fdae61','#fee090','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695']);

    var color_romney = d3.scale.linear()
        .domain([0, 100])
        .range(['white','#a50026']);

    var color_obama = d3.scale.linear()
        .domain([0, 100])
        .range(['white','#313695']);

    var color_diff = d3.scale.linear()
        .domain([min('obama_clinton'), 0, max('obama_clinton')])
        .range(['#7b3294','#f7f7f7','#008837']);

    var radius = d3.scale.sqrt()
        .domain([0, 100])
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

    projection
        .scale(1)
        .translate([0, 0]);

    var b = path.bounds(wards),
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

    var div = containerElement.append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

    chartElement.append("path")
      .datum(topojson.feature(chicago, chicago.objects.chicago))
      .attr("class", "land")
      .attr("d", path)

    chartElement.append("g")
      .attr("class", "wards")
    .selectAll("path")
    .data(topojson.feature(chicago, chicago.objects.wards).features)
    .enter().append("path")
        .attr("fill", function(d) { return color_diff(d.properties.obama_clinton); })
        .attr("d", path)
        .on("mouseover", function(d) {
            d3.select(this) 
                .classed('selected',true)
            div.transition()        
                .duration(200)
                .style("z-index", 1)
                .style("opacity", .9);
            div.html("Ward: "+d.properties['WARD'] + "<br/>Change in Democratic vote: "  + comma(d.properties.obama_clinton) + "<br/>Change in Republican vote: "  + comma(d.properties.romney_trump)+ "<br/>Change in turnout: "  + pct(d.properties.turnout_diff))  
                .style("left", function(){
                    return d3.event.pageX + "px"
                })  
                .style("top", (d3.event.pageY)*offset + "px");    
            })           
        .on("mouseout", function(d) { 
            d3.select(this)  
                .classed('selected',false)
            div.transition()        
                .duration(500)     
                .style("z-index", -99)
                .style("opacity", 0);  
            }); 

    chartElement.append("path")
      .datum(topojson.mesh(chicago, chicago.objects.wards, function(a, b) { return a !== b; }))
      .attr("class", "border border--state")
      .attr("d", path);

    // chartElement.append("g")
    //       .attr("class", "bubble")
    //     .selectAll("circle")
    //       .data(topojson.feature(chicago, chicago.objects.wards).features)
    //         // .sort(function(a, b) { return Math.abs(b.properties.arrests) - Math.abs(a.properties.arrests); }))
    //     .enter().append("circle")
    //       .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
    //       .attr("r", function(d) { 
    //         var v = d.properties['barack_obama_&_joe_biden_pct'];
    //         if (v == undefined) {
    //             v=0;
    //         }
    //         return radius(Math.abs(v)); 
    //     });

    d3.select('.rep')
        .on("click", function(){
            color_diff
                .domain([min('obama_clinton'),0,max('obama_clinton')])
            
            d3.selectAll('.button').classed('selected',false)
            d3.select(this).classed('selected',true)

            chartElement.selectAll('.wards>path')
                .transition()
                .attr("fill", function(d) { return color_diff(d.properties.romney_trump); })
        })

    d3.select('.dem')
        .on("click", function(){
            color_diff
                .domain([min('obama_clinton'),0,max('obama_clinton')])

            d3.selectAll('.button').classed('selected',false)
            d3.select(this).classed('selected',true)

            chartElement.selectAll('.wards>path')
                .transition()
                .attr("fill", function(d) { return color_diff(d.properties.obama_clinton); })
        })

    d3.select('.turnout_diff')
        .on("click", function(){
            color_diff
                .domain([min('turnout_diff'),0,max('turnout_diff')])

            d3.selectAll('.button').classed('selected',false)
            d3.select(this).classed('selected',true)
            
            chartElement.selectAll('.wards>path')
                .transition()
                .attr("fill", function(d) { return color_diff(d.properties.turnout_diff); })
        })

    d3.select('.total_vote')
        .on("click", function(){
            color_diff
                .domain([min('vote_diff'),0,max('vote_diff')])

            d3.selectAll('.button').classed('selected',false)
            d3.select(this).classed('selected',true)
            
            chartElement.selectAll('.wards>path')
                .transition()
                .attr("fill", function(d) { return color_diff(d.properties.vote_diff); })
        })

    d3.select('.dem_pct')
        .on("click", function(){
            color_diff
                .domain([min('obama_clinton_pct'),0,max('obama_clinton_pct')])

            d3.selectAll('.button').classed('selected',false)
            d3.select(this).classed('selected',true)
            
            chartElement.selectAll('.wards>path')
                .transition()
                .attr("fill", function(d) { return color_diff(d.properties.obama_clinton_pct); })
        })

}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
