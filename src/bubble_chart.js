/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */

function bubbleChart() {  
  // Constants for sizing
  var width = 960;
  var height = 600;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var points = {
    "gas": { x: width / 3, y: height / 2 },
    "diesel": { x: 2 * width / 3, y: height / 2 },
    "hardtop": { x: (width) / 5 + 50, y: height / 2},
    "sedan": { x: 1.8 * (width) / 5, y: height / 2},
    "convertible": { x: 2.3 * (width) / 5, y: height / 2},
    "wagon": { x: 3*(width) / 5, y: height / 2},
    "hatchback": { x: 3.5*(width) / 5, y: height / 2},
   
    "two": { x: width / 3, y: height / 2 },
    "four": { x: 2 * width / 3, y: height / 2 },

    "mpfi": { x: 1.2 * (width) / 5 , y: height / 2},
    "idi": { x:  0 * (width) / 5, y: height / 2},
    "spdi": { x: 1.6 * (width) / 5, y: height / 2},
    "4bbl": { x: 2.0*(width) / 5, y: height / 2},
    "mfi": { x:  2.5*(width) / 5, y: height / 2},
    "2bbl": { x: 3.0*(width) / 5, y: height / 2},
    "1bbl": { x: 3.3*(width) / 5, y: height / 2},
    "spfi": { x: 3.8*(width) / 5, y: height / 2},
  };

  var widthOffset = 50;
  // X locations of the year titles.
  var pointsTitleX = {
    "fuel":{
      "gas" : 160,
      "diesel" : width - 160,
    },
    "bodyStyle":{
      "hardtop":  width / 5 * 0 + widthOffset,
      "sedan":  width / 5 * 1.2 + widthOffset,
      "convertible":  width / 5 * 2.4 + widthOffset,
      "wagon":  width / 5 * 3.1 + widthOffset,
      "hatchback":  width / 5 * 3.8 + widthOffset
    },
    "doors":{
      "two" : 160,
      "four" : width - 160,
    },
    "fuel-system": {
      "mpfi": width / 5 * 1 + widthOffset,
      "idi" : width / 5 * -1 + widthOffset,  
      "spdi": width / 5 * 2 + widthOffset,
      "4bbl":width / 5 * 2.3+ widthOffset,
      "mfi" : width / 5 * 2.6 + widthOffset,
      "2bbl":width / 5 * 3.2+ widthOffset,
      "1bbl":width / 5 * 4+ widthOffset,
      "spfi":width / 5 * 4.5 + widthOffset,
    }
  };

  // @v4 strength to apply to the position forces
  var forceStrength = 0.03;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.13) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme

  var car_make = ["ALL","alfa-romero", "audi", "bmw", "chevrolet", "dodge", "honda", 
  "isuzu", "jaguar", "mazda", "mercedes-benz", "mercury", 
  "mitsubishi", "nissan", "peugot", "plymouth", "porsche", 
  "renault", "saab", "subaru", "toyota", "volkswagen", "volvo" ]


  var fillColor = d3.scaleOrdinal()
    .domain(car_make)
    .range(d3.schemeCategory20);

    // creating Ledgend

    function createLedgend() {
      console.log('called');
      d3.select(".ledgend__wrapper").select(".list").selectAll('li')
      .data(car_make)
      .enter()
      .append('li')
      .attr("class", d => 'list__items ' + d)
      .style("color", d => fillColor(d) )
      .on('click', handleLedgendClick)
      .text( d => d );
    }

    function handleLedgendClick(d,i) {
     
      d3.selectAll('.list__items').style('text-transform','lowercase')
      .style('list-style-type', 'circle')
      .style('text-shadow', 'none');


      d3.selectAll('.bubble').style('visibility', 'visible')
      .filter( c => c.org !== d && d !== 'ALL')
      .style('visibility', 'hidden');

      d3.select(this).style('text-transform',' uppercase')
      .style('list-style' ,'none')
      .style('text-shadow', '0.5px 0.5px 0.5px white')
    }
   

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number.
    var maxAmount = d3.max(rawData, function (d) { return +d.total_amount; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 30])
      .domain([0, maxAmount]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.

    var myNodes = rawData.map(function (d, i) {
      return {
        id: i,
        radius: radiusScale(+d.total_amount) * 0.001 * width,
        value: +d.total_amount,
        name: d.group,
        org: d.group,
        group: d.group,
        fuel: d.fuel,
        doors: d.doors,
        ['fuel-system']: d['fuel-system'],
        bodyStyle: d.bodyStyle,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });
   
  //  get specified values of a property
    // var s = new Set();
    // myNodes.forEach(e => s.add(e['fuel-system']));
    // console.log([...s])



    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);


    legend = createLedgend();

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesE = bubbles.enter().append('circle')
      .classed('bubble', true)
      .attr('r', 0)
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
    bubbles
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });
  } 


  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hidePointsTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles(type) {
    showPointsTitles(type);

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('x', d3.forceX().strength(forceStrength).x((d) => points[d[type]].x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Hides Year title displays.
   */
  function hidePointsTitles() {
    svg.selectAll('.points').remove();
  }

  /*
   * Shows Year title displays.
   */
  function showPointsTitles(type) {
    // remove previous titles
    console.log(type);
    hidePointsTitles();

    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var pointsData = d3.keys(pointsTitleX[type]);
    var pointsE = svg.selectAll('.points')
      .data(pointsData);

    pointsE.enter().append('text')
      .attr('class', 'points')
      .attr('x', function (d) { return pointsTitleX[type][d];})
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">Brand Name: </span><span class="value">' +
                  d.name +
                  '</span><br/>' +
                  '<span class="name">Amount: </span><span class="value">$' +
                  addCommas(d.value) +
                  '</span><br/>' +
                  '<span class="name">Fuel-type: </span><span class="value">' +
                  d.fuel +
                  '</span>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.group)).darker());

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName !== 'all') {
      splitBubbles(displayName);
    } else {
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2' + ',000');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('data/cars.csv', display);

// setup the buttons.
setupButtons();
