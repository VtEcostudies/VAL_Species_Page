import { getListSubTaxonKeys, getNubKey } from "../../VAL_Web_Utilities/js/gbifOccFacetCounts.js";
import { occQuery } from "../../VAL_Web_Utilities/js/gbifOccQuery.js";
import { getGbifTaxonKeyFromName, getGbifTaxonFromKey } from "../../VAL_Web_Utilities/js/fetchGbifSpecies.js";
import { getStoredData, setStoredData, getSetStoredData } from "../../VAL_Web_Utilities/js/storedData.js";
const FACET_ARGS = 'facetLimit=1190000';
const VT_SCOPE = ['gadmGid=USA.46_1', 'stateProvince=vermont&stateProvince=vermont (State)&hasCoordinate=false'];

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
/*
    occQuery does the scope expansion, the fetching, the rate-limit handling, the merge across scope
    queries and the daily cache - see gbifOccQuery.js. All that is left here is the date arithmetic.
    dropScopeTaxa because searchTerm IS the taxon: an atlas scoped by taxonomy would otherwise OR
    its own taxon filters with ours and widen the query instead of narrowing it.

    Throwing when a scope query goes unanswered matches what Promise.all did before, and keeps a
    chart from quietly drawing a partial year.
*/
async function fetchAll(searchTerm, fileConfig) {
    const res = await occQuery(fileConfig, {search:searchTerm, facet:'eventDate', facetArgs:FACET_ARGS,
                                            dropScopeTaxa:true, scope: fileConfig ? null : VT_SCOPE});
    if (res.missed) {throw new Error(`gbifCountsByDate: ${res.missed} of ${res.queries.length} queries unanswered`);}
    let max = 0, min = 7000000000000, counts = [], sum = {};
    for (const [name, val] of Object.entries(res.counts)) {
        const date = Date.parse(name); //facet name is an eventDate
        sum[date] = sum[date] ? sum[date] + val : val;
    }
    for (const [key, val] of Object.entries(sum)) {
        const d = Number(key);
        max = d > max ? d : max;
        min = d < min ? d : min;
        counts.push({'date':d, 'count':val});
    }
    counts.sort((a,b) => {return a.date > b.date;})
    return {total:res.total, max:max, min:min, counts:counts};
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