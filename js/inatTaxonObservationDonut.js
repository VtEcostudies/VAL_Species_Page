/*
To-do:
- allow for other ways to scope the view of iNat data, other than by project
- possible but unknown options:
  - by geo bounding box
  - by state or other locale name
  - by gadmGid

  https://www.inaturalist.org/pages/api+reference#get-observations

  swlat
      Southwest latitude of a bounding box query.
      Allowed values: -90 to 90 
  swlng
      Southwest longitude of a bounding box query.
      Allowed values: -180 to 180 
  nelat
      Northeast latitude of a bounding box query.
      Allowed values: -90 to 90 
  nelng
      Northeast longitude of a bounding box query.
      Allowed values: -180 to 180 
  list_id
      Restrict results to observations of taxa on the specified list. Limited to lists with 2000 taxa or less.
      Allowed values: iNat list ID 
*/
export function inatTaxonObsDonut(taxonName, htmlId, commonName=false, inatProject=false) {

  console.log('inatTaxonObsDonut', taxonName, htmlId, commonName, inatProject);

  var baseUrl = 'https://api.inaturalist.org/v1/observations';
  var project = inatProject ? `?project_id=${inatProject}` : '?'; //'?project_id=vermont-atlas-of-life';
  var research = '&quality_grade=research';
  var needs_id = '&quality_grade=needs_id';
  var casual = '&quality_grade=casual';
  var taxon = `&taxon_name=${taxonName}`;
  var limit = `&per_page=0`;
  var lrank = '&lrank=species'
  var rank = '&rank=species'

  var inatLink = `https://www.inaturalist.org/observations/identify?taxon_name=${taxonName}&quality_grade=needs_id`;

  console.log('inatTaxonObsDonut | taxonName', taxonName, 'commonName', commonName, 'htmlId', htmlId, 'inatProject', inatProject, 'project', project);

  d3.select(htmlId).remove()

  var qTotalObs = encodeURI(baseUrl + project + taxon + limit);
  var qNeedsID = encodeURI(baseUrl + project + needs_id + taxon + limit);
  var qResearch = encodeURI(baseUrl + project + research + taxon + limit);
  var qCasual = encodeURI(baseUrl + project + casual + taxon + limit);
  var qSppCount = encodeURI(baseUrl + '/species_counts' + project + taxon + lrank + rank);

  var obsData = {
    "totalObs": 0,
    "totalSpp": 0};

  var idsData = {
        "NeedsID": 0,
        "Research": 0,
        "Casual": 0 };

  console.log(`idsData names: ${Object.getOwnPropertyNames(idsData)}`);

  Promise.all([fetch(qTotalObs),
              fetch(qResearch),
              fetch(qNeedsID),
              fetch(qCasual),
              fetch(qSppCount)]
    )
    .then(function (responses) {
      // Get a JSON object from each response
      return Promise.all(responses.map(async res => {
        let json = await res.json();
        console.log(`inatTaxonObsDonut::fetchAll(${taxonName  }) JSON RESULT FOR URL:`, res.url, json);
        return json;
      }));
    })
    .then(function (data) {
      var data2 = data.map(function (d) {return d.total_results})
      
      // add data to objects
      obsData.totalObs = data2[0];
      idsData.Research = data2[1];
      idsData.NeedsID = data2[2];
      idsData.Casual = data2[3];
      obsData.totalSpp = data2[4];
    })
    .then(() => {
      makeDonut(idsData, obsData, htmlId, taxonName, commonName);
    })
    .catch(err => {
      console.log('ERROR inatTaxonObsDonut ERROR', err);
    });
}

function makeDonut(idsData, obsData, htmlId, taxonName, commonName=false) {
  var width = 300, height = 300, margin = 10;

  // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
  var radius = Math.min(width, height)/1.75 - margin; //Math.min(width, height) / 2 - margin;

  // append the svg object to the div called '#htmlId'
  var svg = d3.select("#" + htmlId)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    //.attr("transform", "translate(" + 3*width/4 + "," + height/2 + ")");

  // set the color scale
  var color = d3.scaleOrdinal()
    .domain(Object.keys(idsData))
    .range([d3.interpolateViridis(0.2),
      d3.interpolateViridis(0.5),
      d3.interpolateViridis(0.8)]);

  // Compute the position of each group on the pie:
  var pie = d3.pie()
    .sort(null) // Do not sort group by size
    .value(function(d) {return d.value; })

  // The arc generator
  var arc = d3.arc()
    .innerRadius(radius * 0.7) // This is the size of the donut hole
    .outerRadius(radius * 0.8)

  // Another arc that won't be drawn. Just for labels positioning
  var outerArc = d3.arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9)

  //console.log('idsData', idsData);
  let d3entries = [];
  for (const [key, val] of Object.entries(idsData)) {
    //console.log('my.entries', key, val);
    d3entries.push({'key':key, 'value':val});
  }

  //let obe = Object.entries(idsData); console.log('Object.entries', obe);
  //let d3e = d3.entries(idsData); console.log('d3.entries', d3e);
  console.log('my.entries', d3entries);

  //var data_ready = pie(Object.entries(idsData))
  //console.log('pie(Ojbect.entries)', data_ready);
  //var data_ready = pie(d3.entries(idsData))
  //console.log('pie(d3.entries)', data_ready)
  var data_ready = pie(d3entries)

  // Build the pie chart: Basically, each part of the pie is
  // a path that we build using the arc function.
  var path = svg.selectAll('allSlices').data(data_ready)

  //this is the "update" selection:
  var pathUpdate = path.attr("d", arc);

  // add text to center of the donut plot above a count
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr('font-size', '2em')
    .attr('y', -40)
    //.text(`Species:`);
    .text(`Observations:`);

  // add text to center of the donut plot below a label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr('font-size', '4em')
    .attr('y', 20)
    .text(obsData.totalObs.toLocaleString());
/*
  // add taxonName text outside the donut plot
  svg.append("text")
    .append("text")
    .attr("x", 0)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .style("font-size", "4em")
    .text(commonName ? commonName : taxonName);
*/
  // Add one dot in the legend for each name.
  svg.selectAll("mydots")
    .data(data_ready)
    .enter()
    .append("circle")
    .attr("cx", -10)
    .attr("cy", function(d,i){ return 50 + i*15}) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 5)
    .style("fill", function(d){ return color(d.data.key)})

  // Add one dot in the legend for each name.
  svg.selectAll("mylabels")
    .data(data_ready)
    .enter()
    .append("text")
    .attr("x", -5)
    // 100 is where the first dot appears. 25 is the distance between dots
    .attr("y", function(d,i){ return 55 + i*15})
    .style("fill", function(d){ return color(d.data.key)})
    .text(function(d){ return d.data.key})
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle")

  var pathEnter = path.enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', function(d){ return(color(d.data.key)) })
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .style("opacity", 0.7)
/*

  var tooltip = d3.select(`#htmlId`)
    .append('div')
    .attr('class', 'activeTOOL');

  tooltip.append('div')
    .attr('class', 'label')
    .style('font-weight','bold');

  tooltip.append('div')
    .attr('class', 'count');

  tooltip.append('div')
    .attr('class', 'percent');

  pathEnter.on('mouseover', function(d) {               
    var total = d3.sum(data_ready.map(function(d) {   
      return d.value;                              
    }));                                           
    var percent = Math.round(1000 * d.data.value / total) / 10;
    tooltip.select('.label').html(d.data.key);   
    tooltip.select('.count').html(d.data.value.toLocaleString());   
    tooltip.select('.percent').html(percent + '%');
    tooltip.style('display', 'block');             
  });

  pathEnter.on('mouseout', function() {                 
    tooltip.style('display', 'none');              
  });

  pathEnter.on('mousemove', function(d) {               
    let pos = d3.select(this).node().getBoundingClientRect();
    d3.select('#'+htmlId)
      .style('left', `${pos['x']}px`)
      .style('top', `${(window.pageYOffset  + pos['y'] - 100)}px`);
  });
*/
}
