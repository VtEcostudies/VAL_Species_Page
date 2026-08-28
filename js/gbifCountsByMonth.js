import { getListSubTaxonKeys, getNubKey } from "../../VAL_Web_Utilities/js/gbifOccFacetCounts.js";
import { occQuery } from "../../VAL_Web_Utilities/js/gbifOccQuery.js";
import { getGbifTaxonKeyFromName, getGbifTaxonFromKey } from "../../VAL_Web_Utilities/js/fetchGbifSpecies.js";
const FACET_ARGS = 'facetLimit=1200000';
const VT_SCOPE = ['gadmGid=USA.46_1', 'stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false'];


/*
GBIF occurrence counts by month:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=month&facetLimit=1200000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=month&facetLimit=1200000&limit=0
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
    console.log(`gbifCountsByMonthByTaxonKey(${taxonKey}) | self-nubKey:`, nub, 'sub-nubKeys:', subs.keys, 'searchTerm:', srch);
    
    let res = await fetchAll(srch, fileConfig);
    res.keys = subs.keys.push(nub); //add self nubKey to array of keys for species-list key
    res.search = srch; //return our enhanced searchTerm for caller to use
    return res;
}
async function fetchAllByName(taxonName, fileConfig) {
    return await fetchAll(`scientificName=${taxonName}`, fileConfig);
}
/*
    occQuery does the scope expansion, the fetching, the rate-limit handling, the merge across scope
    queries and the daily cache - see gbifOccQuery.js. All that is left here is the month arithmetic.
    dropScopeTaxa because searchTerm IS the taxon: an atlas scoped by taxonomy would otherwise OR
    its own taxon filters with ours and widen the query instead of narrowing it.

    Throwing when a scope query goes unanswered matches what Promise.all did before, and keeps a
    chart from quietly drawing a partial year.
*/
async function fetchAll(searchTerm, fileConfig) {
    const res = await occQuery(fileConfig, {search:searchTerm, facet:'month', facetArgs:FACET_ARGS,
                                            dropScopeTaxa:true, scope: fileConfig ? null : VT_SCOPE});
    if (res.missed) {throw new Error(`gbifCountsByMonth: ${res.missed} of ${res.queries.length} queries unanswered`);}
    let max = 0, counts = [], sum = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0};
    for (const [mon, val] of Object.entries(res.counts)) {
        const midx = Number(mon);
        if (undefined !== sum[midx]) {sum[midx] += val;} //ignore anything GBIF returns that is not a month
    }
    for (const [key, val] of Object.entries(sum)) {
        max = val > max ? val : max;
        counts.push({'index':Number(key), 'name':monthName(Number(key))[0], 'count':val});
    }
    counts.sort((a,b) => {return a.index > b.index;})
    return {total:res.total, max:max, counts:counts};
}
export async function gbifCountsByMonthByTaxonName(taxonName, taxonRank, htmlId, fileConfig) {
    let taxonKey = await getGbifTaxonKeyFromName(taxonName, taxonRank);
    if (taxonKey) {
        gbifCountsByMonthByTaxonKey(taxonKey, htmlId, fileConfig);
    } else {
        fetchAllByName(taxonName, fileConfig)
        .then(data => {
            gbifCountsByMonth(data, htmlId);
        })
        .catch(err => {
            console.log(`ERROR gbifCountsByMonthByTaxonName ERROR: `, err);
        }) 
    }
}
export async function gbifCountsByMonthByTaxonKey(taxonKey, htmlId, fileConfig) {
    fetchAllByKey(taxonKey, fileConfig)
    .then(data => {
        gbifCountsByMonth(data, htmlId);
    })
    .catch(err => {
        console.log(`ERROR export async function gbifCountsByMonthByTaxonKey(taxonKey, htmlId, fileConfig) {
            ERROR: `, err);
    }) 
}
function gbifCountsByMonth(data, htmlId) {
    // set the dimensions and margins of the graph
    const margin = {top: 15, right: 30, bottom: 30, left: 10},
        width = 300 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    const svg = d3.select(`#${htmlId}`)
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // X axis
        var x = d3.scaleBand()
            .range([ 0, width ])
            .domain(data.counts.map(function(d) { return d.name; })) //value here must match attr("x") value below
            .padding(0.02);
            svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([0, data.max*(1.1)])
            //.domain([0, data.max/data.total])
            .range([height, 0]);
            svg.append("g")
            //.call(d3.axisLeft(y)); //Note: this shows the y-axis label

        // Bars
        svg.selectAll("centerBar")
            .data(data.counts)
            .enter()
            .append("rect")
                .attr("x", function(d) { return x(d.name); })
                .attr("y", function(d) { return y(d.count)/2; }) // divide by 2 pushes axis center up half way
                //.attr("y", function(d) { return y(d.count/data.total); })
                .attr("width", x.bandwidth())
                .attr("height", function(d) { return (d.count ? height - y(d.count) : 0); })
                //.attr("height", function(d) { return height - y(d.count/data.total); })
                .attr("fill", "steelblue")

        svg.append("text")
            .attr("x", width / 2 )
            .attr("y", 0)
            .style("text-anchor", "middle")
            //.text(`${taxonName} Phenology`)
            .text(`GBIF Observations by Month`)
    
}

function monthName(i) {
    switch(i) {
        case 1: return ['Jan','January'];
        case 2: return ['Feb','February'];
        case 3: return ['Mar','March'];
        case 4: return ['Apr','April'];
        case 5: return ['May','May'];
        case 6: return ['Jun','June'];
        case 7: return ['Jul','July'];
        case 8: return ['Aug','August'];
        case 9: return ['Sep','September'];
        case 10: return ['Oct','October'];
        case 11: return ['Nov','November'];
        case 12: return ['Dec','December'];
    }
}
