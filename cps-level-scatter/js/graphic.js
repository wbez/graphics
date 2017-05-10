// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

/*
 * Initialize graphic
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
    graphicData = data.filter(function(d){
        if(d.SCORE==null){
            console.log('FALSE')
            return false;
        }
        return true;
    });

    // formatData();

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

        graphicData = graphicData.filter(function(d){
            if(isNaN(d.SCORE)){
                return false;
            }
            return true;
        });

        //formatData();

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
        d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'date') {
                d[key] = +d[key];
            }
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
    renderLineChart({
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
        top: 5,
        right: 20,
        bottom: 40,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        // .domain(d3.map(config['data'], function(d){return d['LEVEL'];}).keys())
        .domain(["Level 1+", "Level 1", "Level 2+", "Level 2", "Level 3"])
        .rangePoints([ 0, chartWidth ])

    console.log(d3.map(config['data'], function(d){return d['LEVEL'];}).keys())
    console.log(xScale.domain())
    
    xScale.domain().forEach( function(item) { console.log(xScale(item)) })
    xScale.domain().forEach( function(item) { console.log(item) })

    var yScale = d3.scale.linear()
        .domain([ 150, d3.max(config['data'], function(d) {
                var n = d['SCORE'];
                return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data']).filter(function(key) {
            return key == 'LEVEL';
        }))
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //         .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item key-' + i + ' ' + classify(d['community']);
    //         });

    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['community']);
    //     });

    // legend.append('label')
    //     .text(function(d) {
    //         return d['community'];
    //     });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'] + 5)
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom');
        // .tickFormat(function(d, i) {
        //     if (isMobile) {
        //         return d
        //     } else {
        //         return d
        //     }
        // });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
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

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    var div = containerElement.append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

    // Append axis names
    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "translate(" + (chartWidth / 2) + " ," + (chartHeight + margins['bottom']) + ")")
        .style("text-anchor", "middle")
        .text("CPS Ratings");

    chartElement.append("text")
        .attr('class','axis-name')
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margins['left'])
        .attr("x",0 - (chartHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("MAP reading test scores");

    /*
     * Render points to chart.
     */

    chartElement.append('g')
        .attr('class', 'circle')
        .selectAll('circles')
        .data(config['data'])
        .enter()
        .append('circle')
        .filter(function(d) { return d['LEVEL'] != 'Inability to Rate'})
            .attr('class', function(d, i) {
                return 'circle circle-' + i + ' ' + classify(d['SCHOOL_NAME']);
            })
            .attr("r", 5)
            .attr('fill',function(d){
                return '#72A2A9'
            })
            .attr('cx', function(d) {
                return xScale(d['LEVEL'])
            })
            .attr('cy', function(d) {
                return yScale(d['SCORE']);
            })
            .on("mouseover", function(d) {
                d3.select(this) 
                    .classed('selected',true)

                div.transition()        
                    .duration(200)      
                    .style("opacity", .9);      
                
                div.html(d['SCHOOL_NAME'] + "<br/>"  + d['SCORE'])  
                    .style("left", function(){
                        if (d['LEVEL']=='Level 3') {
                            return d3.event.pageX - 100 + "px"
                        } else {
                            return d3.event.pageX + "px"
                        }
                        
                    })  
                    .style("top", (d3.event.pageY - 60) + "px");    
                })           
            .on("mouseout", function(d) { 
                d3.select(this)  
                    .classed('selected',false)

                div.transition()        
                    .duration(500)      
                    .style("opacity", 0);  
                }); 

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d['LEVEL'])
            })
            .attr('y', function(d) {
                return yScale(d['SCORE'])
            })
            .text(function(d) {

                var label = '';

                // if (!isMobile) {
                //     label = d['SCHOOL_NAME'];
                // }

                return label;
            });

}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
