import { getListSubTaxonKeys, getNubKey } from "../../VAL_Web_Utilities/js/gbifOccFacetCounts.js";
import { occQuery } from "../../VAL_Web_Utilities/js/gbifOccQuery.js";
import { getGbifTaxonKeyFromName, getGbifTaxonFromKey } from "../../VAL_Web_Utilities/js/fetchGbifSpecies.js";
const FACET_ARGS = 'facetLimit=1200000';
const VT_SCOPE = ['gadmGid=USA.46_1', 'stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false'];

let searchTerm;
let exploreUrl;
let target = '_self'; //window.open setting, see https://developer.mozilla.org/en-US/docs/Web/API/Window/open

/*
GBIF occurrence counts by year:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=year&facetLimit=1200000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=year&facetLimit=1200000&limit=0
*/
async function fetchAllByKey(taxonKey, fileConfig) {
    let self = await getGbifTaxonFromKey(taxonKey); //retrieve species info for species-list taxonKey - to get nubKey for below
    let nub = await getNubKey(self); //WORKAROUND: self.nubKey is null for most kingdoms since the COL XR republication. See gbifOccFacetCounts.js.
    let srch = `taxonKey=${nub ? nub : taxonKey}`;
    let subs = {keys:[]};
    if (fileConfig.dataConfig.drillRanks.includes(self.rank)) { //only drill-down lower ranks
        subs = await getListSubTaxonKeys(fileConfig, taxonKey); //get sub-nubKeys of species-list key
        for (const key of subs.keys) {
            srch += `&taxonKey=${key}`; //add sub-nubKeys to searchTerm to be used by fetchAll
        }
    }
    console.log(`gbifCountsByYearByTaxonKey(${taxonKey}) | self-nubKey:`, nub, 'sub-nubKeys:', subs.keys, 'searchTerm:', srch);
    
    searchTerm = srch; exploreUrl = fileConfig.dataConfig.exploreUrl;
    let res = await fetchAll(srch, fileConfig);
    res.keys = subs.keys.push(nub); //add self nubKey to array of keys for species-list key
    res.search = srch; //return our enhanced searchTerm for caller to use
    return res;
}
async function fetchAllByName(taxonName, fileConfig) {
    searchTerm = `scientificName=${taxonName}`; exploreUrl = fileConfig.dataConfig.exploreUrl;
    return await fetchAll(`scientificName=${taxonName}`, fileConfig);
}
/*
    occQuery does the scope expansion, the fetching, the rate-limit handling, the merge across scope
    queries and the daily cache - see gbifOccQuery.js. All that is left here is the year arithmetic.
    dropScopeTaxa because searchTerm IS the taxon: an atlas scoped by taxonomy would otherwise OR
    its own taxon filters with ours and widen the query instead of narrowing it.

    Throwing when a scope query goes unanswered matches what Promise.all did before, and keeps a
    chart from quietly drawing a partial year.
*/
async function fetchAll(searchTerm, fileConfig) {
    const res = await occQuery(fileConfig, {search:searchTerm, facet:'year', facetArgs:FACET_ARGS,
                                            dropScopeTaxa:true, scope: fileConfig ? null : VT_SCOPE});
    if (res.missed) {throw new Error(`gbifCountsByYear: ${res.missed} of ${res.queries.length} queries unanswered`);}
    let max = 0, counts = [];
    for (const [year, val] of Object.entries(res.counts)) {
        max = val > max ? val : max;
        counts.push({'name':Number(year), 'count':val});
    }
    counts.sort((a,b) => {return a.index > b.index;})
    return {total:res.total, max:max, counts:counts};
}
export async function gbifCountsByYearByTaxonName(taxonName, taxonRank, htmlId, fileConfig, siteName) {
    let taxonKey = await getGbifTaxonKeyFromName(taxonName, taxonRank);
    if (taxonKey) {
        gbifCountsByYearByTaxonKey(taxonKey, htmlId, fileConfig, siteName);
    } else {
        fetchAllByName(taxonName, fileConfig)
        .then(data => {
            gbifCountsByYear(data, htmlId, siteName);
        })
        .catch(err => {
            console.log(`ERROR gbifCountsByYearByTaxonName: `, err);
        }) 
    }
}
export async function gbifCountsByYearByTaxonKey(taxonKey, htmlId, fileConfig, siteName) {
    fetchAllByKey(taxonKey, fileConfig)
    .then(data => {
        gbifCountsByYear(data, htmlId, siteName);
    })
    .catch(err => {
        console.log(`ERROR gbifCountsByYearByTaxonKey:`, err);
    }) 
}
function gbifCountsByYear(data, htmlId, siteName) {
    // set dimensions and margins of the graph
    let yMax = d3.max(data.counts, d => d.count);
    var margin = {top: 15, right: 30, bottom: 30, left: 30 + (String(yMax).length-3)*7};
    var width = 400 - margin.left - margin.right; var minWidth = width; 
    var height = 250 - margin.top - margin.bottom;

    console.log(`gbifCountsByYear data`, data);
    width = data.counts.length * 10 - margin.left - margin.right;
    width = width >= minWidth ? width : minWidth;

    // append the svg object to the body of the page
    const svg = d3.select(`#${htmlId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Chart title
    svg.append("text")
        //.attr("x", width / 2 )
        .attr("x", 150 )
        .attr("y", 0)
        .style("text-anchor", "middle")
        //.text(`${taxonName} Observations by Year`)
        .text(`GBIF Observations by Year`)

    // X axis
    var x = d3.scaleBand()
        //.range([ 0, width ])
        .range([ width, 0 ])
        .domain(data.counts.map(function(d) { return d.name; }))
        .padding(0.2);
        svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        //.attr("transform", "translate(-10, 0)rotate(-45)")
        .attr("transform", "translate(-12, 5)rotate(-90)")
        .style("text-anchor", "end");

    // Scale Y axis range
    var y = d3.scaleLinear()
        .domain([0, data.max*(1.1)])
        .range([height, 0]);
    // Create Y Axis with only whole number tickmarks
    let yAxis;
    if (yMax > 10) {
        yAxis = d3.axisLeft(y); //auto-range tick values, auto-format large numbers
    } else {
        yAxis = d3.axisLeft(y)
            .tickValues(d3.range(yMax+1)) //only allow tick divisions at whole numbers
            .tickFormat(d3.format(".0f")); //specify whole number values at ticks w/o decimals
    }
    svg.append("g").call(yAxis);

    // Bars
    svg.selectAll("mybar")
        .data(data.counts)
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.name); })
        .attr("y", function(d) { return y(d.count); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return height - y(d.count); })
        .attr("fill", "#69b3a2")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("click", handleClick)
        .style("cursor", "pointer");
        
    let tooltip = d3.select(`#${htmlId}`).append("div").attr("class", "d3tooltip");;

    // Mouseover event handler
    function handleMouseOver(event, d) {
        d3.select(this)
            .attr("fill", "orange"); // Change color or add other effects on mouseover

        // Display data in the console or update a tooltip
        //console.log("Mouseover: ", d);

        tooltip
            .html(`Year: ${d.name}<br>Count: ${d.count}`)
            .style("left", (event.pageX-50) + "px")
            .style("top", (event.pageY-50) + "px")
            .style("display", "block");
    }
    // Mouseout event handler
    function handleMouseOut(event, d) {
        d3.select(this)
            .attr("fill", "#69b3a2"); // Change back to the original color on mouseout
        
        tooltip.style("display", "none");
    }
    // Click event handler
    function handleClick(event, d) {
        //recall that Wordpress reserves the query parameter 'year'. We end-run around that by using param gbif-year
        //which is converted to 'year' within our gbif data widget implementation.
        let url = `${exploreUrl}?siteName=${siteName}&${searchTerm}&gbif-year=${d.name}&view=TABLE`;
        console.log('gbifCountsByYear=>handleClick', url);
        if (exploreUrl && searchTerm) {
            window.open(url, target); //https://developer.mozilla.org/en-US/docs/Web/API/Window/open
        }
    }
}