import { getListSubTaxonKeys } from "../../VAL_Web_Utilities/js/gbifOccFacetCounts.js";
import { getGbifTaxonKeyFromName, getGbifTaxonFromKey } from "../../VAL_Web_Utilities/js/fetchGbifSpecies.js";
const facetQuery = '&facet=year&facetLimit=1200000&limit=0';
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
    let srch = `taxonKey=${self.nubKey ? self.nubKey : taxonKey}`;
    let subs = {keys:[]};
    if (fileConfig.dataConfig.drillRanks.includes(self.rank)) { //only drill-down lower ranks
        subs = await getListSubTaxonKeys(fileConfig, taxonKey); //get sub-nubKeys of species-list key
        for (const key of subs.keys) {
            srch += `&taxonKey=${key}`; //add sub-nubKeys to searchTerm to be used by fetchAll
        }
    }
    console.log(`gbifCountsByYearByTaxonKey(${taxonKey}) | self-nubKey:`, self.nubKey, 'sub-nubKeys:', subs.keys, 'searchTerm:', srch);
    
    searchTerm = srch; exploreUrl = fileConfig.dataConfig.exploreUrl;
    let res = await fetchAll(srch, fileConfig);
    res.keys = subs.keys.push(self.nubKey); //add self nubKey to array of keys for species-list key
    res.search = srch; //return our enhanced searchTerm for caller to use
    return res;
}
async function fetchAllByName(taxonName, fileConfig) {
    searchTerm = `scientificName=${taxonName}`; exploreUrl = fileConfig.dataConfig.exploreUrl;
    return await fetchAll(`scientificName=${taxonName}`, fileConfig);
}
function fetchAll(searchTerm, fileConfig) {
    let qrys = [];
    if (fileConfig) {
        //For Atlas query filters defined by taxa, since searchTerm is a taxon, remove Atlas query taxon filters
        qrys = fileConfig.predicateToQueries(fileConfig.dataConfig.rootPredicate, true);
    }
    let urls = [];
    if (qrys.length) {
        for (const qry of qrys) {
            urls.push(`${fileConfig.dataConfig.gbifApi}/occurrence/search?${qry}&${searchTerm}${facetQuery}`);
        }
        console.log(`gbifCountsByYear.js | ${fileConfig.dataConfig.atlasAbbrev} api urls:`, urls);
    } else {
        urls = [
        `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&${searchTerm}&facet=year&facetLimit=1200000&limit=0`,
        `https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false&${searchTerm}&facet=year&facetLimit=1200000&limit=0`
        ]
    }
    let all = Promise.all(urls.map(url => fetch(encodeURI(url))))
        .then(responses => {
            //console.log(`gbifCountsByYear::fetchAll(${searchTerm}) RAW RESULT:`, responses);
            //Convert each response to json object
            return Promise.all(responses.map(async res => {
                let json = await res.json();
                console.log(`gbifCountsByYear::fetchAll(${searchTerm}) JSON RESULT FOR URL:`, res.url, json);
                return json;
            }));
        })
        .then(arrj => {
            //console.log(`gbifCountsByYear::fetchAll(${searchTerm}) ALL JSON RESULT:`, arrj);
            let total = 0, max = 0, sum={}, counts = [];
            arrj.forEach(json => {
                //console.log('json', json);
                total += json.count;
                if (json.facets[0]) {
                    json.facets[0].counts.map(count => {
                        let midx = Number(count.name); //convert facet name (year) to number
                        sum[midx] = sum[midx] ? sum[midx] + count.count : count.count;
                    });
                    //console.log('sum', sum);
                } else {
                    console.log(`gbifCountsByYear::fetchAll NO Facets Returned`, json.facets);
                }
            });
            for (const [key, val] of Object.entries(sum)) {
                //console.log('gbifCountsByYear::fetchAll | sum entries', key, val);
                let o = {'name':Number(key), 'count':val};
                max = val > max ? val : max;
                counts.push(o);
            }
            //console.log('GBIF counts by year sorted by count:', counts);
            counts.sort((a,b) => {return a.index > b.index;})
            //console.log('GBIF counts by year sorted by year:', counts);
            return {total:total, max:max, counts:counts};
        })
        .catch(err => {
            console.log(`ERROR fetchAll ERROR:`, err);
            return Promise.reject({'message':err.message});
        })
    console.log(`fetchAll promise.all`, all);
    return all; //this is how it's done. strange errors when not.
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