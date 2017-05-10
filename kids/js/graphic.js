// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
var graphicData = null;

formatK = d3.format(".2s")

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
    graphicData.forEach(function(d) {
        d['start'] = +d['start'];
        d['end'] = +d['end'];
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

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderSlopegraph({
        container: '#graphic',
        width: containerWidth,
        data: graphicData,
        metadata: GRAPHIC_METADATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderSlopegraph = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var startColumn = 'start';
    var endColumn = 'end';

    var startLabel = config['metadata']['start_label'];
    var endLabel = config['metadata']['end_label'];

    var aspectWidth = 16;
    var aspectHeight = 16;

    // var highlighted = ['AUSTIN','LOGAN SQUARE','SOUTH LAWNDALE','LAKE VIEW','NORTH CENTER','LINCOLN PARK']
    var highlighted = []
    var margins = {
        top: 20,
        right: 185,
        bottom: 20,
        left: 40
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;

    // Mobile
    if (isSidebar) {
        aspectWidth = 2;
        aspectHeight = 3;
        margins['left'] = 30;
        margins['right'] = 105;
        labelGap = 32;
    } else if (isMobile) {
        aspectWidth = 2.5
        aspectHeight = 3;
        margins['right'] = 145;
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
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var yScale = d3.scale.linear()
        .domain([
            d3.min(config['data'], function(d) {
                return Math.floor(d[endColumn] / roundTicksFactor) * roundTicksFactor;
            }),
            d3.max(config['data'], function(d) {
                return Math.ceil(d[startColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.quantize()
        .domain([-30000,0,30000])
        .range(['#EC0101','#72A2A9']);

    // Create dropdown
    var select = containerElement.append('div')
        .attr('class','dropdown')
            .append("select")
            .on("change", change);
    
    options = select.selectAll('option')
        .data(config['data'].sort(function(a,b){
            return d3.ascending(a[labelColumn], b[labelColumn])
        }));

    // Enter selection
    options.enter().append("option").text(function(d) { 
        if (d[labelColumn] == 'OHARE') {
            return "O'Hare"
        } else if (d[labelColumn] == 'MCKINLEY PARK') {
            return "McKinley Park"
        } else {
            return titleCase(d[labelColumn]); 
        }
    });

    function change(s) {

        if (s === undefined) {
            s = classify(select.property('value'));
        }
        
        selects = chartElement.selectAll('.selected').classed("selected", false)
        
        community = chartElement.selectAll('.'+s)

        bgBox.moveToFront();

        community
            .classed('selected',true)
            .moveToFront()

        bgBoxBounds = d3.selectAll('.label').select("text."+s).node().getBBox()

        bgBox
            .attr('x', function() {
                    return bgBoxBounds.x -5;
                })
                .attr('y', function(d) {
                    return bgBoxBounds.y -5;
                })
                .attr('width', function(d) {
                    return bgBoxBounds.width +10;
                })
                .attr('height', function(d) {
                    return bgBoxBounds.height +10;
                })
    }

    /*
     * Create D3 axes.
     */
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    var bgBox = chartElement.append('g')
        .attr('class', 'annotation-box')
        .append('rect')
            .attr('rx',2)
            .attr('ry',2);

    /*
     * Render axes to chart.
     */
     chartElement.append('g')
         .attr('class', 'x axis')
         .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                var pos_neg

                if (d['change'] >= 0) {
                    pos_neg = 'positive'
                } else {
                    pos_neg = 'negative'
                }

                return 'line ' + classify(d[labelColumn]) + ' ' + pos_neg;
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
            })
            // .on('click',function(){
            //     var comm_name = classify(d3.select(this).data()[0][labelColumn])

            //     change(comm_name)
            // })
            // .on('mouseover', function(d){
            //     var community = d3.select(this);

            //     console.log(community);
                
            //     community.classed('selected',!community.classed("selected"));

            // })
            // .on('mouseout', function(d){
            //     var community = d3.select(this);

            //     console.log(community);
                
            //     community.classed('selected',community.classed("selected"));

            // })
            // .style('stroke', function(d) {
            //     return colorScale(d['change'])
            // })

    chartElement.append('g')
        .attr('class', 'buffer')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
            })
            .on('click',function(){
                var comm_name = classify(d3.select(this).data()[0][labelColumn])
                console.log(comm_name)
                change(comm_name)
            })
            // .on('mouseover', function(d){
            //     var community = d3.select(this);

            //     console.log(community);
                
            //     community.classed('selected',!community.classed("selected"));

            // })
            // .on('mouseout', function(d){
            //     var community = d3.select(this);

            //     console.log(community);
                
            //     community.classed('selected',community.classed("selected"));

            // })

    /*
     * Uncomment if needed:
     * Move a particular line to the front of the stack
     */
    // svg.select('line.unaffiliated').moveToFront();


    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots start')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(startLabel))
            .attr('cy', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('class', function(d, i) {
                var pos_neg

                if (d['change'] >= 0) {
                    pos_neg = 'positive'
                } else {
                    pos_neg = 'negative'
                }

                return classify(d[labelColumn]) + ' ' + pos_neg;
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .attr('r', dotRadius)
            // .style('fill', function(d) {
            //     return colorScale(d['change'])
            // });

    chartElement.append('g')
        .attr('class', 'dots end')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(endLabel))
            .attr('cy', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('class', function(d, i) {
                var pos_neg

                if (d['change'] >= 0) {
                    pos_neg = 'positive'
                } else {
                    pos_neg = 'negative'
                }

                return classify(d[labelColumn]) + ' ' + pos_neg;
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .attr('r', dotRadius)
            // .style('fill', function(d) {
            //     return colorScale(d['change'])
            // });

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value start')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(startLabel))
            .attr('y', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .text(function(d) {
                if (isSidebar) {
                    return formatK(d[startColumn].toFixed(0));
                }

                return formatK(d[startColumn].toFixed(0));
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .text(function(d) {
                if (isSidebar) {
                    return formatK(d[endColumn].toFixed(0));
                }

                return formatK(d[endColumn].toFixed(0));
            });

    /*
     * Render labels.
     */

    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', function(d) {
                return labelGap;
            })
            .attr('dy', function(d) {
                return 3;
            })
            .attr('class', function(d, i) {
                return classify(d[labelColumn]);
            })
            .classed('highlighted', function(d){return _.contains(highlighted, d[labelColumn]) })
            .text(function(d) {
                if (d[labelColumn] == 'OHARE') {
                    return "O'Hare"
                } else if (d[labelColumn] == 'MCKINLEY PARK') {
                    return "McKinley Park"
                } else {
                    return titleCase(d[labelColumn]); 
                }
            })
            .call(wrapText, (margins['right'] - labelGap), 16)
            .on('click',function(){
                var comm_name = classify(d3.select(this).data()[0][labelColumn])
                console.log(comm_name)
                change(comm_name)
            })

    chartElement
        .selectAll('.lake-view, .austin')
        .moveToFront()
    
}

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

var titleCase = function(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

/*
 * Select an element and move it to the front of the stack
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
