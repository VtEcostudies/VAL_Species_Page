import { getListSubTaxonKeys, getNubKey } from "../../VAL_Web_Utilities/js/gbifOccFacetCounts.js";
import { gbifFetchJson } from "../../VAL_Web_Utilities/js/gbifFetch.js";
import { getGbifTaxonKeyFromName, getGbifTaxonFromKey } from "../../VAL_Web_Utilities/js/fetchGbifSpecies.js";
import { getStoredData, setStoredData, getSetStoredData } from "../../VAL_Web_Utilities/js/storedData.js";
const facetQuery = '&facet=eventDate&facetLimit=1190000&limit=0';
const drillRanks = ['GENUS','SPECIES','SUBSPECIES','VARIETY'];

/*
Fetch GBIF occurrence counts by eventDate
https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&scientificName=Danaus%20plexippus&facet=eventDate&facetLimit=1200000&limit=0
https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&hasCoordinate=false&scientificName=Danaus%20plexippus&facet=eventDate&facetLimit=1200000&limit=0
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
    console.log(`gbifCountsByDateByTaxonKey(${taxonKey}) | self-nubKey:`, nub, 'sub-nubKeys:', subs.keys, 'searchTerm:', srch);
    
    let res = await fetchAll(srch, fileConfig);
    console.log(res);
    res.nubKey = nub;
    res.keys = subs.keys.push(nub); //add self nubKey to array of keys for species-list key
    res.names = subs.names;
    res.search = srch; //return our enhanced searchTerm for caller to use
    return res;
}
async function fetchAllByName(taxonName, fileConfig) {
    return await fetchAll(`scientificName=${taxonName}`, fileConfig);
}
async function fetchAll(searchTerm, fileConfig) {
    //For Atlas query filters defined by taxa, since searchTerm is a taxon, remove Atlas query taxon filters
    let qrys = fileConfig.predicateToQueries(fileConfig.dataConfig.rootPredicate, true);
    let urls = [];
    if (qrys.length) {
        for (const qry of qrys) {
            urls.push(`${fileConfig.dataConfig.gbifApi}/occurrence/search?${qry}&${searchTerm}${facetQuery}`);
        }
        console.log(`gbifCountsByDate.js | ${fileConfig.dataConfig.atlasAbbrev} api urls:`, urls);
    } else {
        urls = [
        `https://api.gbif.org/v1/occurrence/search?gadmGid=USA.46_1&${searchTerm}&facet=eventDate&facetLimit=1200000&limit=0`,
        `https://api.gbif.org/v1/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false&${searchTerm}&facet=eventDate&facetLimit=1200000&limit=0`
        ]
    }
    /*
    all = await getStoredData('gbifOccsByDate', searchTerm, urls);
    console.log('gbifCountsByDate=>fetchAll | All: ', all)
    if (all && null != all) {return Promise.resolve(all);} else {
    */
    //gbifFetchJson queues behind the shared limiter and retries GBIF's 429s, handing back parsed
    //JSON only for a genuinely OK response. Reading a rate-limit body as data is what produced NaN.
    let all = Promise.all(urls.map(url => gbifFetchJson(encodeURI(url))))
        .then(arrj => {
            console.log(`gbifCountsByDate=>fetchAll(${searchTerm}) ALL JSON RESULT:`, arrj);
            let total = 0, max = 0, min = 7000000000000, sum = {}, counts = [];
            arrj.forEach(json => {
                //console.log('json', json);
                if (Number.isFinite(json.count)) {total += json.count;}
                if (json.facets && json.facets[0]) {
                    json.facets[0].counts.map(count => {
                        let date = Date.parse(count.name); //convert facet name (eventDate) to date
                        sum[date] = sum[date] ? sum[date] + count.count : count.count;
                    });
                    //console.log('sum', sum);
                } else {
                    console.log(`gbifCountsByDate=>fetchAll NO Facets Returned`, json.facets);
                }
            });
            for (const [key, val] of Object.entries(sum)) {
                //console.log('gbifCountsByDate=>fetchAll | sum entries', key, val);
                let d = Number(key);
                let o = {'date':d, 'count':val};
                max = d > max ? d : max;
                min = d < min ? d : min;
                counts.push(o);
            }
            //console.log('GBIF counts by date sorted by count:', counts);
            counts.sort((a,b) => {return a.date > b.date;})
            //console.log('GBIF counts by date sorted by date:', counts);
            let res = {total:total, max:max, min:min, counts:counts};
            //setStoredData('gbifOccsByDate', searchTerm, qrys, res);
            return res;
        })
        .catch(err => {
            console.log(`gbifCountsByDate=>fetchAll Raw Response ERROR:`, err);
            throw new Error(err);
            //return Promise.reject(new Error(err)); //this works too, but not needed
            //return new Error(err);
        })
    console.log(`gbifCountsByDate=>fetchAll promise.all`, all);
    return all; //this is how it's done. strange errors when not.
}

export async function gbifCountsByDateByTaxonKey(taxonKey, fileConfig) {
    return await fetchAllByKey(taxonKey, fileConfig);
}

export async function gbifCountsByDateByTaxonName(taxonName, fileConfig) {

    let taxonKey = await getGbifTaxonKeyFromName(taxonName, fileConfig);
    
    if (taxonKey) {
        return await fetchAllByKey(taxonKey, fileConfig);
    } else {
        return await fetchAllByName(taxonName, fileConfig);
    }
}