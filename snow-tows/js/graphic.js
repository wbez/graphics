// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var state = 0;

// D3 formatters
var fmtYear = d3.time.format('%m/%d');
var fmtMonth= d3.time.format("%b");
var fmtMonthDisplay= d3.time.format("%b '%y");
var fmtDay = d3.time.format("%A")

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
    graphicData.forEach(function(d) {
        var y0 = 0;

        d['label'] = d3.time.format('%m/%d/%Y').parse(d['label']);

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'total') {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];

            if (key != 'SNOW PLOWS ACTIVE') {
                d['total'] += d[key];
            } else {
                y0 = 0;
            }

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key],
                'date': d['label']
            })

            y0 = y1;
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
    renderStackedColumnChart({
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
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = 16;
    var aspectHeight = 6;
    var valueGap = 1;
    var durationLength = 500;
    var delayLength = 10;

    var margins = {
        top: 5,
        right: 5,
        bottom: 20,
        left: 30
    };

    var ticksY = 5;
    var roundTicksFactor = 50;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
    }

    d3.selection.prototype.moveToBack = function() { 
        return this.each(function() { 
            var firstChild = this.parentNode.firstChild; 
            if (firstChild) { 
                this.parentNode.insertBefore(this, firstChild); 
            } 
        }); 
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var barWidth = (chartWidth/graphicData.length+1);

    /*
     * Create D3 scale objects.
     */
    // var xScale = d3.scale.ordinal()
    //     .domain(_.pluck(config['data'], labelColumn))
    //     .rangeRoundBands([0, chartWidth], .1)

    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d[labelColumn];
        }))
        .range([ 0, chartWidth-barWidth ])

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var yScale = d3.scale.linear()
        .domain([
            min,
            d3.max(config['data'], function(d) {
                return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d != labelColumn && d != 'values' && d != 'total';
        }))
        .range([ COLORS['teal4'], COLORS['red4'] , COLORS['blue4'] ]);

    /*
     * Render the legend.
     */
    var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
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
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    chartElement
        .style("opacity", 0.25)

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(6)
        .tickFormat(function(d) {
            return fmtMonthDisplay(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        });

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
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('y', function(d) {
                return chartHeight;
            })
            .attr('class', function(d) {
                return classify(d['name'])+' '+classify(fmtMonth(d['date']))+' '+classify(fmtDay(d['date']));
            })
            .attr('width', barWidth)
            .attr("height", 0)
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            });
            


    // Set up controls for arrows

    var resetBars = function() {
        d3.selectAll('.tows-during-overnight-parking-ban')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            });

        d3.selectAll('.tickets-from-2-snow-rule')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            });

        d3.selectAll('.snow-plows-active')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            });
    }

    var first = function(){

        resetBars()

        chartElement
            .transition()
            .duration(durationLength)
            .style("opacity", 0.25);

        // d3.selectAll('rect')
        //     .transition()
        //     .duration(durationLength)
        //     .attr('height', function(d) {
        //         return 0
        //     })
        //     .attr('y', function(d) {
        //         return chartHeight;
        //     });

    }

    var tows = function(){

        chartElement
            .transition()
            .duration(durationLength)
            .style("opacity", 1);

        d3.selectAll('rect')
            .transition()
            .duration(durationLength)
            .attr('height', function(d) {
                return 0
            })
            .attr('y', function(d) {
                return chartHeight;
            });

        d3.selectAll('.tows-during-overnight-parking-ban')
            .transition()
            .delay(function(d, i) { return durationLength+(i*delayLength); })
            .duration(durationLength)
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })

        d3.selectAll('.tickets-from-2-snow-rule')
            .transition()
            .duration(durationLength)
            .attr('height', function(d) {
                return 0
            })
            .attr('y', function(d) {
                return chartHeight;
            })

        d3.selectAll('.snow-plows-active')
            .transition()
            .duration(durationLength)
            .attr('height', function(d) {
                return 0
            })
            .attr('y', function(d) {
                return chartHeight;
            })

    }

    var tickets = function(){

        chartElement
            .style("opacity", 1);

        d3.selectAll('.tows-during-overnight-parking-ban')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })

        d3.selectAll('.tickets-from-2-snow-rule')
            .transition()
            .duration(durationLength)
            .delay(function(d, i) { return i*delayLength; })
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })

        d3.selectAll('.snow-plows-active')
            .transition()
            .duration(durationLength)
            .attr('height', function(d) {
                return 0
            })
            .attr('y', function(d) {
                return chartHeight;
            })
    }

    var plows = function(){

        chartElement
            .style("opacity", 1);

        bars.selectAll('.tows-during-overnight-parking-ban.dec')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return colorScale(d['name']);
            });

        d3.selectAll('.tows-during-overnight-parking-ban')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })

        d3.selectAll('.tickets-from-2-snow-rule')
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })

        d3.selectAll('.snow-plows-active')
            .transition()
            .duration(durationLength)
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
    }

    var december = function(){

        resetBars();

        chartElement
            .style("opacity", 1);

        bars.selectAll('.tows-during-overnight-parking-ban.dec')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return COLORS['teal2'];
            });
    }

    var january = function(){

        resetBars();

        chartElement
            .style("opacity", 1);

        bars.selectAll('.tows-during-overnight-parking-ban.jan')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return COLORS['teal2']
            });
    }

    var weekends = function(){

        chartElement
            .style("opacity", 1);

        bars.selectAll('.tows-during-overnight-parking-ban.jan')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return colorScale(d['name']);
            });

        bars.selectAll('.tows-during-overnight-parking-ban.saturday')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return COLORS['teal2']
            });

        bars.selectAll('.tows-during-overnight-parking-ban.sunday')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return COLORS['teal2']
            });
    }

    var reset = function(){
        
        bars.selectAll('rect')
            .transition()
            .duration(durationLength)
            .style('fill', function(d) {
                return colorScale(d['name']);
            });
    }

    var hold = function(){

        chartElement
            .style("opacity", 1);

        obj[slides[state-1].changes]()
    }

    // var slides = [
    //     {'text':'text for the first one','changes':first},
    //     {'text':'text for the second one','changes':second},
    //     {'text':'text for the third one','changes':third},
    //     {'text':'text for the fourth one','changes':fourth}
    // ];

    var obj = {
        'tows':tows,
        'tickets':tickets,
        'plows':plows,
        'weekends':weekends,
        'hold':hold,
        'first':first,
        'december':december,
        'january':january,
        'reset':reset
    }

    var slides = SLIDE_DATA;
    var total = slides.length-1;

    d3.select('.arrowRight')
        .on('click',function(){
            if (state < total) {
                state++
            }
            obj[slides[state].changes]()
            d3.select('.text>p').html(slides[state].text)

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
            obj[slides[state].changes]()
            d3.select('.text>p').html(slides[state].text)

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

    obj[slides[state].changes]()
    d3.select('.text>p').html(slides[state].text)
    d3.select('.arrowLeft').style("opacity", 0);;
    d3.selectAll('.snow-plows-active').moveToBack();

    /*
     * Render values to chart.
     */
    // bars.selectAll('text')
    //     .data(function(d) {
    //         return d['values'];
    //     })
    //     .enter().append('text')
    //         .text(function(d) {
    //             return d['val'];
    //         })
    //         .attr('class', function(d) {
    //             return classify(d['name']);
    //         })
    //         .attr('x', function(d) {
    //             return xScale.rangeBand() / 2;
    //         })
    //         .attr('y', function(d) {
    //             var textHeight = d3.select(this).node().getBBox().height;
    //             var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

    //             if (textHeight + valueGap * 2 > barHeight) {
    //                 d3.select(this).classed('hidden', true);
    //             }

    //             var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);

    //             return barCenter + textHeight / 2;
    //         })
    //         .attr('text-anchor', 'middle');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
