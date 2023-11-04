import { getDistribution } from './valDistSuitMap.js'
import { inatFreqHistogram } from './inatPhenologyHistogram.js';
//import { gbifCountsByYear } from './gbifCountsByYear.js'
//import { gbifCountsByMonth } from './gbifCountsByMonth.js'
import { getStoredData } from './fetchSpeciesData.js';
import { getWikiHtmlPage, getWikiSummary } from '../VAL_Web_Utilities/js/wikiPageData.js';
import { gbifCountsByDate, gbifCountsByDateByTaxonKey, gbifCountsByDateByTaxonName } from './gbifCountsByDate.js';
import { findInatSpecies, getInatSpeciesByKey, findParentNameRank } from '../VAL_Web_Utilities/js/inatSpeciesData.js';
import { loadSpeciesMap } from './valSpeciesMap.js';
import { inatTaxonObsDonut } from './inatTaxonObservationDonut.js';
import { getGbifTaxonObjFromKey, getGbifTaxonObjFromName, getParentRank } from '../VAL_Web_Utilities/js/commonUtilities.js';

import {
    fetchAllGbifCountsByMonthByKey, 
    fetchAllGbifCountsByMonthByName,
    gbifCountsByMonthByTaxonKey,
    gbifCountsByMonthByTaxonName
    } from './gbifCountsByMonth.js'

const nFmt = new Intl.NumberFormat();

test();

function jArrFormat(json) {
    let str = JSON.stringify(json);
    str = str.replaceAll(']','<br>]');
    str = str.replaceAll('[','[<br>');
    str = str.replaceAll(',{',',<br>{');
    return str + '\n';
}
function jsonFormat(json) {
    let str = JSON.stringify(json);
    str = str.replaceAll(']','<br>]');
    str = str.replaceAll('[','[<br>');
    str = str.replaceAll(',{',',<br>{');
    str = str.replaceAll(',"',',<br>"');
    return str + '\n';
}

function test() {
    const objUrlParams = new URLSearchParams(window.location.search);
    var gbifInfo = false;
    var siteName = objUrlParams.get('siteName');
    console.log('Query Param siteName:', siteName);
    siteName = siteName ? siteName : 'val';
    const taxonName = objUrlParams.get('taxonName');
    console.log('Query Param taxonName:', taxonName);
    const taxonRank = objUrlParams.get('taxonRank');
    console.log('Query Param taxonRank:', taxonRank);
    const taxonKey = objUrlParams.get('taxonKey');
    console.log('Query Param taxonKey:', taxonKey);
    const wikiName = objUrlParams.get('wikiName');
    console.log('Query Param wikiName:', wikiName);

    import(`../VAL_Web_Utilities/js/gbifDataConfig.js?siteName=${siteName}`)
        .then(async fileConfig => {
        console.log('valSpeciesPageTest | siteName:', siteName, 'dataConfig:', fileConfig.dataConfig);
        let pre = document.getElementById('pre');
/*
        fetchAllGbifCountsByMonthByKey(taxonKey, fileConfig).then(data => {
            pre.innerHTML = jArrFormat(data);
        })

        getGbifTaxonObjFromName(taxonName, taxonRank).then(data => {
            pre.innerHTML += jsonFormat(data);
        }).catch(err => {
            pre.innerHTML += jsonFormat(err);
        })

        fetchAllGbifCountsByMonthByName(taxonName, fileConfig).then(data => {
            pre.innerHTML += jArrFormat(data);
        }).catch(err => {
            pre.innerHTML += jsonFormat(err);
        })
        getGbifTaxonObjFromName(taxonName, taxonRank).then(taxObj => {
            console.log('gbifTaxonObjFromName:', taxObj);
            findInatSpecies(taxonName, taxonRank.toLowerCase(), taxObj.family, 'family').then(data => {
                pre.innerHTML += jArrFormat(data);
            }).catch(err => {
                pre.innerHTML += jsonFormat(err);
            })
        }).catch(err => {
            pre.innerHTML += jsonFormat(err);
        })

        getGbifTaxonObjFromKey(4849628).then(taxObj => {
            pre.innerHTML += jsonFormat(taxObj);
        })
        let parent = await findParentNameRank('Laridae', 'FAMILY', 373567);
        console.log(`findParentNameRank`, parent)
*/
        pre.innerHTML += getParentRank('family');
    })
}
