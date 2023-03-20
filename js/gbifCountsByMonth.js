/*
GBIF occurrence counts by month:
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=month&facetLimit=1200000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=month&facetLimit=1200000&limit=0
*/

async function fetchData(taxonName) {
    let urls = [
        `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=${taxonName}&facet=month&facetLimit=1200000&limit=0`,
        `https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false&scientificName=${taxonName}&facet=month&facetLimit=1200000&limit=0`
        ]
    let enc = encodeURI(urls[0]);
    try {
        let res = await fetch(enc);
        console.log(`gbifCountsByMonth(${enc}) RAW RESULT:`, res);
        let json = await res.json();
        console.log(`gbifCountsByMonth(${enc}) JSON RESULT:`, json);

        let total = json.count;
        let counts = json.facets[0].counts;
        let max = 0;
        counts = counts.map(data => {
            let i = Number(data.name), c = data.count, m = monthName(i)[0];
            let o = {'index':i, 'name':m, 'count':c};
            max = data.count > max ? data.count : max;
            return o;
        });
        console.log('GBIF counts by month sorted by count:', counts);
        counts.sort((a,b) => {return a.index > b.index;})
        console.log('GBIF counts by month sorted by month:', counts);
        return {total:total, max:max, counts:counts};
    } catch (err) {
        console.log(`gbifCountsByMonth(${enc}) ERROR:`, err);
        return new Error(err);
    }
}

function fetchAll(taxonName) {
    let urls = [
        `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=${taxonName}&facet=month&facetLimit=1200000&limit=0`,
        `https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false&scientificName=${taxonName}&facet=month&facetLimit=1200000&limit=0`
        ]
    let all = Promise.all([fetch(encodeURI(urls[0])),fetch(encodeURI(urls[1]))])
        .then(responses => {
            //console.log(`gbifCountsByMonth::fetchAll(${taxonName}) RAW RESULT:`, responses);
            //Convert each response to json object
            return Promise.all(responses.map(async res => {
                let json = await res.json();
                console.log(`gbifCountsByMonth::fetchAll(${taxonName}) JSON RESULT FOR URL:`, res.url, json);
                return json;
            }));
        })
        .then(arrj => {
            console.log(`gbifCountsByMonth::fetchAll(${taxonName}) ALL JSON RESULT:`, arrj);
            let total = 0, max = 0, sum = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0}, counts = [];
            arrj.forEach(json => {
                //console.log('json', json);
                total += json.count;
                if (json.facets[0]) {
                    json.facets[0].counts.map(count => {
                        let midx = Number(count.name);
                        sum[midx] += count.count;
                    });
                    //console.log('sum', sum);
                } else {
                    console.log(`gbifCountsByMonth::fetchAll NO Facets Returned`, json.facets);
                }
            });
            for (const [key, val] of Object.entries(sum)) {
                //console.log('sum entries', key, val);
                let o = {'index':Number(key), 'name':monthName(Number(key))[0], 'count':val};
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

export async function gbifCountsByMonth(taxonName, htmlId) {
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

    fetchAll(taxonName)
        .then(data => {

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
    
        })
        .catch(err => {
            console.log(`ERROR gbifCountsByMonth ERROR: `, err);
        }) 
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