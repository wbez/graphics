// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'values', 'total', 'certificates', 'total_1', 'total_2', 'year_total'];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
     renderGraphic({
         container: '#y-2015',
         width: containerWidth/2,
         data: GRAPHIC_DATA[0]
     });

     renderGraphic({
        container: '#y-2016',
        width: containerWidth/2,
        data: GRAPHIC_DATA[1]
    });

    renderGraphic({
        container: '#y-2017',
        width: containerWidth/2,
        data: GRAPHIC_DATA[2]
    });

    renderGraphic({
        container: '#y-2018',
        width: containerWidth/2,
        data: GRAPHIC_DATA[3]
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var aspectWidth = 1;
    var aspectHeight = 1.6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create containers
    

    // Draw here!

    var formatData = function() {
        
        GRAPHIC_DATA.forEach( function(d){
            d['Inspection-One'] = [];
            d['Inspection-Two'] = [];
            var year = d['year'];
            var passOne = d['01_pass'];
            var failOne = d['01_fail'];
            var missingOne = d['01_missing'];
            var unclearOne = d['01_unclear'];

            var passTwo = d['02_pass'];
            var failTwo = d['02_fail'];
            var missingTwo = d['02_missing'];
            var unclearTwo = d['02_unclear'];

            var certificates = d['certificates']

            d['Inspection-One'].push({
                'pass': passOne,
                'fail': failOne,
                'missing': missingOne,
                'unclear': unclearOne
                });

            d['Inspection-Two'].push({
                'pass': passTwo,
                'fail': failTwo,
                'missing': missingTwo,
                'unclear': unclearTwo
                });
        });
    };
   formatData();

/* FROM SCRATCH */
    // id vars
    var label = config['data']['label']

    // global chart vars
    var columns = 10;

    //calculate square size
    var squareMargin = 5;
    var square = chartWidth/columns -squareMargin;
    
    // calculate number of rows and columns
    //var squaresRow = total/columns;
    //var squaresColumn = total/10;
    
    //make containers
    var chartOne = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    var chartTwo = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');


    //labels ???


   var drawGrid = function(d, container) {
    /*val = Math.round(d[key])*/
    var runningTotal = 0;
    var xpos = 0;
    var ypos = 0;
    for (var key in d) {
        if (_.contains(skipLabels, key)) {
            continue;
        }
        val = Math.round(d[key]);
        var id;
        if (val != 0) {
            for (var a = 1; a <= val; a++) {
                runningTotal++;
                id = 'year' + '-' + label + '-' + key + '-' + a;
                container.selectAll('rect' + '#' +id)
                    .data(d3.range(1))
                    .enter().append('rect')
                    .attr({
                        class: 'grid',
                        id: id,
                        width: square,
                        height: square,
                        x: xpos,
                        y: ypos,
                        class: key
                        })
                    xpos +=square +squareMargin;
                    if (runningTotal >= columns) {
                        ypos += square +squareMargin; runningTotal = 0; xpos = 0;;
                    } else { continue
                        }
                }
    } else {continue}
    };

    // add year labels
    //var labelContainer = container.append('g')
    /*labelContainer.append('text')
        .attr({
            class: 'labels',
            text: 'WHERE IS THIS WTF',
            x: 285,
            y: 200
        }) */
   } 

    drawGrid(config['data']['Inspection-One'][0], chartOne);
    drawGrid(config['data']['Inspection-Two'][0], chartTwo);

    };
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
