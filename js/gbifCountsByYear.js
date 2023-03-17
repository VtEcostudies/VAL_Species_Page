/*
GBIF occurrence counts by year:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Ambystoma%20maculatum&facet=year&facetLimit=129000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=year&facetLimit=129000&limit=0

GBIF occurrence counts by month:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Ambystoma%20maculatum&facet=month&facetLimit=129000&limit=0
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=month&facetLimit=129000&limit=0
*/

export async function gbifCountsByYear(taxonName) {
// set the dimensions and margins of the graph
const margin = {top: 10, right: 30, bottom: 30, left: 40},
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select(`#speciesCountsByYear`)
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

let url = `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=${taxonName}&facet=year&facetLimit=129000&limit=0`;
let enc = encodeURI(url);
try {
    let res = await fetch(enc);
    console.log(`gbifCountsByYear(${enc}) RAW RESULT:`, res);
    let json = await res.json();
    console.log(`gbifCountsByYear(${enc}) JSON RESULT:`, json);

    let total = json.count;
    let counts = json.facets[0].counts;
    let years = {};
    let max = 0;
    counts = counts.map(year => {
        let y = Number(year.name), c = year.count;
        let o = {'year':y, 'count':c};
        years[y] = c;
        max = year.count > max ? year.count : max;
        return o;
    });
    //console.log('years', years);
    console.log('GBIF counts by year sorted by count:', counts);
    counts.sort((a,b) => {return a.year > b.year;})
    console.log('GBIF counts by year sorted by year:', counts);

    // X axis
    var x = d3.scaleBand()
        .range([ 0, width ])
        .domain(counts.map(function(d) { return d.year; }))
        .padding(0.2);
        svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, max*(1.1)])
        .range([ height, 0]);
        svg.append("g")
        .call(d3.axisLeft(y));

    // Bars
    svg.selectAll("mybar")
        .data(counts)
        .enter()
        .append("rect")
            .attr("x", function(d) { return x(d.year); })
            .attr("y", function(d) { return y(d.count); })
            .attr("width", x.bandwidth())
            .attr("height", function(d) { return height - y(d.count); })
            .attr("fill", "#69b3a2")

} catch (err) {
    console.log(`gbifCountsByYear(${enc}) ERROR:`, err);
}

}