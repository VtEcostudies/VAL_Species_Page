import { getGbifTaxonKeyFromName } from "./VAL_Web_Utilities/js/commonUtilities.js";

/*
GBIF occurrence counts by year:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=year&facetLimit=1200000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=year&facetLimit=1200000&limit=0
*/
async function fetchAllByKey(taxonKey) {
    return await fetchAll(`taxonKey=${taxonKey}`);
}
async function fetchAllByName(taxonName) {
    let taxonKey = await getGbifTaxonKeyFromName(taxonName);
    if (taxonKey) {
        return await fetchAll(`taxonKey=${taxonKey}`);
    } else {
        return await fetchAll(`scientificName=${taxonName}`);
    }
}
function fetchAll(searchTerm) {
    let urls = [
        `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&${searchTerm}&facet=year&facetLimit=1200000&limit=0`,
        `https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false&${searchTerm}&facet=year&facetLimit=1200000&limit=0`
        ]
    let all = Promise.all([fetch(encodeURI(urls[0])),fetch(encodeURI(urls[1]))])
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
            //console.log('GBIF counts by month sorted by count:', counts);
            counts.sort((a,b) => {return a.index > b.index;})
            //console.log('GBIF counts by month sorted by month:', counts);
            //return Promise.resolve({total:total, max:max, counts:counts});
            return {total:total, max:max, counts:counts};
        })
        .catch(err => {
            console.log(`ERROR fetchAll ERROR:`, err);
            //return Promise.reject(new Error(err));
            return new Error(err);
        })
    console.log(`fetchAll promise.all`, all);
    return all; //this is how it's done. strange errors when not.
}

export async function gbifCountsByYear(taxonName, htmlId) {
    // set dimensions and margins of the graph
    var margin = {top: 15, right: 30, bottom: 30, left: 40};
    var width = 400 - margin.left - margin.right; var minWidth = width; 
    var height = 300 - margin.top - margin.bottom;

    fetchAllByName(taxonName)
    .then(data => {
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

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([0, data.max*(1.1)])
            .range([ height, 0]);
            svg.append("g")
            .call(d3.axisLeft(y));

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

        svg.append("text")
            //.attr("x", width / 2 )
            .attr("x", 150 )
            .attr("y", 0)
            .style("text-anchor", "middle")
            //.text(`${taxonName} Observations by Year`)
            .text(`GBIF Observations by Year`)
    })
    .catch(err => {
        console.log(`ERROR gbifCountsByYear ERROR: `, err);
    })
}