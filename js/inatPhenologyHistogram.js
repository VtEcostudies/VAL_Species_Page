var baseUrl = 'https://api.inaturalist.org/v1/observations/histogram?';
var project = '&project_id=vermont-atlas-of-life';
var interval = '&interval=week_of_year';
var date_field = '&date_field=observed';

export function inatFreqHistogram(taxonName, htmlId) {
    let phenoFreqQuery = baseUrl + project + "&taxon_name="+ taxonName + date_field + interval;
    let phenoWeeklyData = [];

    Promise.all([fetch(phenoFreqQuery)])
    .then(function (responses) {
        // Get a JSON object from each of the responses
        return Promise.all(responses.map(function (response) {
            return response.json();})
            );
        })
        .then((data) => {
            var data2 = data.map(function (d) {
                return d.results.week_of_year
            })

            // add data to global variable
            phenoWeeklyData = data2[0];

            console.log('phenoWeeklyData', phenoWeeklyData); //, Object.values(phenoWeeklyData));
            // Log the data to the console
            // You would do something with both sets of data here
            // console.log(`data2:`, data2);
        })
        .then(() => {
            makeFreqHistogram (phenoWeeklyData, htmlId);
        })
        .catch((error) => {console.log(error);});
}

function makeFreqHistogram(phenoData, htmlId) {

    // Get the total number of observations
    var total_spp_obs = Object.values(phenoData).reduce((weekobs, a) => weekobs + a, 0);

    // Get the probs
    var weekly_probs = Object.values(phenoData).map((week) => { return week/total_spp_obs});

    //console.log(`weekProbs: ${weekly_probs}`)
    // empty object to store data
    var phenoProcData = [];

    var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // set up loops
    var pv = Object.keys(phenoData);

    //console.log(`pv: ${pv}`)

    for (var key of pv) {
        phenoProcData.push({wk: key,
                        count: phenoData[key],
                        prob: weekly_probs[key],
                        mon: monthNames[new Date(1000 * 60 * 60 * 24 * 7 * key).getMonth()]}
        )
    };

    console.log(`phenoProcData:`, phenoProcData)
    console.log(`Total species obs:`, total_spp_obs);

    //var wkProbData = phenoProcData.reduce((obj, item) => Object.assign(obj, { [item.wk]: item.prob }), {});

    //console.log(`weekly_probs:`, wkProbData);

    // set the dimensions and margins of the graph
    const margin = {top: 10, right: 30, bottom: 30, left: 40},
        width = 300 - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#" + htmlId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Parse the Data
    // X axis
    var x = d3.scaleBand()
        .range([ 0, width ])
        .domain(phenoProcData.map(function(d) { return d.wk; }));
        //.padding(0.01);

        svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        //.call(d3.axisBottom(x))
        //.selectAll("text")
        //  .attr("transform", "translate(+2,0)")
        //  .style("text-anchor", "middle")
        //  .style("font-size", "0.6em");

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([-0.1, 0.1])
        .range([ height, 0]);
        //svg.append("g")
        //  .call(d3.axisLeft(y));

    svg.append("polygon")
        .attr("points", x(1)+","+y(0.1)+" "+x(53)+","+y(0.1)+" "+x(53)+","+y(0.08)+" "+x(1)+","+y(0.08))
        .style("fill", "lightblue")
        .style("stroke", "black")
        .style("strokeWidth", "10px")

    var monLabs = {
        label: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        x: [2,6,10,14,18,22,26,30,34,38,42,44]
    }

    //var yLabLocs = [0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09,0.09]
    //var xLabLocs = [1,5,9,13,17,21,25,29,33,37,41,43]
    var xLabs = [
        {"month":"Jan", xlab: 1, ylab: 0.09},
        {"month":"Feb", xlab: 5, ylab: 0.09},
        {"month":"Mar", xlab: 9, ylab: 0.09},
        {"month":"Apr", xlab: 13, ylab: 0.09},
        {"month":"May", xlab: 17, ylab: 0.09},
        {"month":"Jun", xlab: 21, ylab: 0.09},
        {"month":"Jul", xlab: 25, ylab: 0.09},
        {"month":"Aug", xlab: 29, ylab: 0.09},
        {"month":"Sep", xlab: 33, ylab: 0.09},
        {"month":"Oct", xlab: 37, ylab: 0.09},
        {"month":"Nov", xlab: 41, ylab: 0.09},
        {"month":"Dec", xlab: 43, ylab: 0.09}
    ]

    svg.append("text")
        .datum(xLabs)
        .attr("x", function(d){return x(d.xlab)})
        .attr("y", function(d){return y(d.ylab)})
        //.attr("dy", ".25em")
        //.attr("transform", "translate(+2,0)")
        .style("font-size", "0.6em")
        .style("stroke","none")
        .style("fill","black")
        .style("text-anchor","middle")
        .text(function(d){return x(d.month)});

    // Bars
    svg.selectAll("mybar")
        .data(phenoProcData)
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.wk); })
        .attr("y", function(d) { return y(d.prob); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return y(0)-y(d.prob); })
        .attr("fill", "steelblue")

    svg.selectAll("underbar")
        .data(phenoProcData)
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.wk); })
        .attr("y", function(d) { return y(0); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return y(d.prob*-1)-y(0); })
        .attr("fill", "steelblue")
};
