// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var textData = null;
var durationLength = 500;
var introTimeout;
var state = 0;
var pct = d3.format(".0f");


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        loadJSON('build/chicago.json')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    textData = data;

    // pymChild = new pym.Child({
    //     renderCallback: render
    // });
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
        data: graphicData,
        textData: textData
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
    var properties = topojson.feature(chicago, chicago.objects.zips).features;
    var cta_properties = topojson.feature(chicago, chicago.objects.cta).features;
    var cta_lines = d3.map(cta_properties,function(d) {
                        return d.properties.LEGEND; 
                    })


    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var ratio = 1.1
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

    var zips = topojson.feature(chicago, chicago.objects.zips);

    projection
        .scale(1)
        .translate([0, 0]);

    var b = path.bounds(zips),
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


    // Create the text box
    var textBox = d3.select('.textBox');
    var textBoxHead = d3.select('.textBoxHead');
    var textBoxBody = d3.select('.textBoxBody');
    textBoxHead.html(textData[0].head);
    textBoxBody.html(textData[0].text);


    // chartElement.append("path")
    //   .datum(topojson.mesh(chicago, chicago.objects.zips, function(a, b) { return a !== b; }))
    //   .attr("class", "border border--state")
    //   .attr("d", path);

    var color = d3.scale.quantize()
        .domain([0, 11])
        .range(['#f7f4f9','#e7e1ef','#d4b9da','#c994c7','#df65b0','#e7298a','#ce1256','#980043','#67001f']);

    var colorTotal = d3.scale.quantize()
        .domain([0, 360000])
        .range(['#fff7fb','#ece7f2','#d0d1e6','#a6bddb','#74a9cf','#3690c0','#0570b0','#045a8d','#023858']);

    var colorCTA = d3.scale.ordinal()
        .domain(cta_lines.keys())
        .range(['#00a1de','#c60c30','#522398','#565a5c','#62361b','#f9e300','#009b3a','#f9461c','#e27ea6']);

    chartElement.append("g")
      .attr("class", "zips")
    .selectAll("path")
    .data(topojson.feature(chicago, chicago.objects.zips).features)
    .enter().append("path")
        .attr("fill", '#c5c5c5')
        .attr("d", path)
        .attr('class',function(d){
            return 'zip'+d.properties.recv_zip;
        })
    // .on("mouseover", function(d) {
    //     new_id = d.id
    //     d3.selectAll('.zips > path')
    //         .attr("fill", function(d) { 
    //             if (d.properties[new_id] == null) {
    //                     return d3.select(this).attr('fill');
    //                 } else {
    //                     return color(d.properties[new_id]);
    //                 }
    //         })
    // });

    // chartElement.append("g")
    //       .attr("class", "bubble")
    //     .selectAll("circle")
    //       .data(topojson.feature(chicago, chicago.objects.schools).features
    //         .sort(function(a, b) { return Math.abs(b.properties.arrests) - Math.abs(a.properties.arrests); }))
    //     .enter().append("circle")
    //       .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
    //       .attr("r", function(d) { return radius(Math.abs(d.properties.arrests)); });

    chartElement.append("g")
      .attr("class", "cta")
    .selectAll("path")
    .data(topojson.feature(chicago, chicago.objects.cta).features)
    .enter().append("path")
        .attr("stroke", function(d){
            return colorCTA(d.properties.LEGEND);
        })
        .attr('fill','none')
        .attr("d", path)
        .attr('class',function(d){
            return 'zip'+d.properties.recv_zip;
        });

    console.log(cta_properties)
    console.log(cta_lines.keys())

    // var legend = containerElement.append('div')
    //     .attr('class','legend');
    
    // var legendul = legend    
    //     .append('ul')
    //         .attr('class', 'list-inline');

    // var legendHead = legend
    //     .append('h3');

    // var keys = legendul.selectAll('li.key');

    var zipBox = containerElement.append('div')
        .classed('zip-box',true)
        .classed('show',false);

    var zipBoxHead = zipBox.append('h2');
    var zipBoxText = zipBox.append('p');

    var total = textData.length-1;

    d3.select('.arrowRight')
        .on('click',function(){
            if (state < total) {
                state++
            }
            obj[textData[state].slide]()
            d3.select('.text>p').html(textData[state].text)
            console.log(state)
            console.log(textData[state])

            if (state >= total) {
              d3.select(this).style("opacity", 0);
              d3.select('.arrowLeft').style("opacity", 1);
            } else if (state <= 0) {
              d3.select(this).style("opacity", 1);
              d3.select('.arrowLeft').style("opacity", 0);;
            } else {
              d3.select(this).style("opacity", 1);
              d3.select('.arrowLeft').style("opacity", 1);
            }

        })

    d3.select('.arrowLeft')
        .on('click',function(){
            if (state > 0) {
                state--
            }
            obj[textData[state].slide]()
            d3.select('.text>p').html(textData[state].text)

            if (state == 0){ 
              d3.select('.arrowRight').style("opacity", 1);
              d3.select(this).style("opacity", 0);;
            } else if (state >= total) {
              d3.select('.arrowRight').style("opacity", 0);;
              d3.select(this).style("opacity", 1);
            } else if (state <= 0) {
              d3.select('.arrowRight').style("opacity", 1);
              d3.select(this).style("opacity", 0);;
            } else {
              d3.select('.arrowRight').style("opacity", 1);
              d3.select(this).style("opacity", 1);
            }

        })

    var switchZip = function(zip) {
        d3.selectAll('.zips > path')
            .classed('highlight',false)
        d3.select('.zip'+zip)
            .classed('highlight',true)
            .moveToFront();

        d3.selectAll('.zips > path')
            .transition()
            .duration(durationLength)
            .attr("fill", function(d) { 
                if (d.properties[zip] == null) {
                        return d3.select(this).attr('fill');
                    } else {
                        return color(d.properties[zip]);
                    }
            })
    }


    var intro = function() {
        // introTimeout = setInterval(function () {
        //     zips = topojson.feature(chicago, chicago.objects.zips).features
        //     var random = zips[Math.floor(Math.random() * zips.length)];
        //     console.log(random.id)

        //     switchZip(random.id)
        //             }, 2000);

        d3.selectAll('.zips > path')
            .classed('highlight',false)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var howto = function() {
        // introTimeout = setInterval(function () {
        //     zips = topojson.feature(chicago, chicago.objects.zips).features
        //     var random = zips[Math.floor(Math.random() * zips.length)];
        //     console.log(random.id)

        //     switchZip(random.id)
        //             }, 2000);

        switchZip(60615)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);

        // legendul.empty();
        // legendHead.empty()

        // legendHead.html('% of messages to zip code')
        
        // keys
        //     .data(color.range()).enter()
        //     .append('li')
        //         .style('background-color', function(d){
        //             return d
        //         })
        //         .html(function(d){
        //             r = color.invertExtent(d);
        //             return pct(r[0])+ '%';
        //         });

        // keys.exit().remove();
    }

    var users = function() {
        clearTimeout(introTimeout);

        d3.selectAll('.zips > path')
            .classed('highlight',false)

        d3.selectAll('.zips > path')
            .transition()
            .duration(durationLength)
            .attr("fill", function(d) { 
                console.log(d)
                if (d.properties['total'] == null) {
                        return d3.select(this).attr('fill');
                    } else {
                        return colorTotal(d.properties['total']);
                    }
            })

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var logan = function() {
        switchZip(60647)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var lincoln = function() {
        switchZip(60657)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var southside = function() {
        switchZip(60621)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var race = function() {

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);
    }

    var hydepark = function() {
        switchZip(60615)

        d3.selectAll('.zips > path')
            .on('click',null)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);

        zipBox.classed('show',false);
    }

    var hydepark2 = function() {
        switchZip(60615)

        d3.selectAll('.zips > path')
            .on('click',null)

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);

        zipBox.classed('show',false);
    }

    var explore = function() {
        d3.selectAll('.zips > path')
            .classed('highlight',false)

        d3.selectAll('.zips > path')
            .classed('highlight-light',false)

        d3.selectAll('.zips > path')
            .on("click", function(d) {
                new_id = d.id

                d3.selectAll('.zips > path')
                    .classed('highlight-small',false)

                // gets top five zips for messages
                pm = d3.map(properties,function(d) {
                        return d.properties[new_id]; 
                    })
                    .entries()
                    .sort(function(a,b){
                        return b.key - a.key
                    })
                    .slice(0,5);

                console.log(pm)

                var topZips = '<h3>Top Five Crushes</h3>'

                pm.forEach(function(d, i){
                    if (d.key === "undefined"){
                        topZips = topZips+'<p>No data</p>'
                    } else {
                        console.log(d.key,d.value.id)
                        topZips = topZips+'<p>'+d.value.id+'</p>'

                        d3.select('.zip'+d.value.id)
                            .classed('highlight-small',true)
                            .moveToFront();
                    }
                });

                switchZip(new_id)

                zipBoxHead.html(new_id)
                zipBoxText.html(topZips)


                // properties.sort(function(x, y){
                //    return d3.ascending(x.index, y.index);
                // })

            });

        textBoxHead.html(textData[state].head);
        textBoxBody.html(textData[state].text);

        zipBox.classed('show',true);
    }

    var obj = {
        'intro':intro,
        'users':users,
        'howto':howto,
        'logan':logan,
        'lincoln':lincoln,
        'southside':southside,
        'race':race,
        'hydepark':hydepark,
        'hydepark2':hydepark2,
        'explore':explore
    }

    obj[textData[state].slide]()
    d3.select('.arrowLeft').style("opacity", 0);

    d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };



}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
