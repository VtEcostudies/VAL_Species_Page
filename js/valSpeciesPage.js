import { getDistribution } from './valDistMap.js'
import { inatFreqHistogram } from './inatPhenologyHistogram.js';
import { gbifCountsByYear } from './gbifCountsByYear.js'
import { gbifCountsByMonth } from './gbifCountsByMonth.js'
import { getStoredData } from './fetchSpeciesData.js';
import { getWikiHtmlPage, getWikiSummary } from './VAL_Web_Utilities/js/wikiPageData.js';
import { gbifCountsByDate, gbifCountsByDateByTaxonKey } from './gbifCountsByDate.js';
import { getInatSpecies } from './VAL_Web_Utilities/js/inatSpeciesData.js';
import { loadSpeciesMap } from './valSpeciesMap.js';
import { inatTaxonObsDonut } from './inatTaxonObservationDonut.js';
import { getGbifTaxonKeyFromName } from './VAL_Web_Utilities/js/commonUtilities.js';

const nFmt = new Intl.NumberFormat();

const gbifGadmVtOccUrl = `https://gbif.org/occurrence/search?gadmGid=USA.46_1&`;
const gbifStateVtOccUrl = `https://gbif.org/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)`;
const valSpcExpUrl = `https://val.vtecostudies.org/gbif-species-explorer`;
const valOccExpUrl = `https://val.vtecostudies.org/gbif-explorer`;
const inatSpeciesUrl = `https://www.inaturalist.org/taxa/search`;
const wikiPageUrl = `https://www.wikipedia.org/wiki/`

const objUrlParams = new URLSearchParams(window.location.search);

const taxonName = objUrlParams.get('taxonName');
console.log('Query Param taxonName:', taxonName);
const taxonKey = objUrlParams.get('taxonKey');
console.log('Query Param taxonKey:', taxonKey);
var other = ''; var objOther = {};
const wikiName = objUrlParams.get('wikiName');
console.log('Query Param wikiName:', wikiName);

objUrlParams.forEach((val, key) => {
    if ('taxonKey'!=key && 'taxonName'!=key) {
      other += `&${key}=${val}`;
      objOther[key] = val;
    }
  });

async function fillTaxonStats(taxonName, wikiName=false) {
    let eleComn = document.getElementById("common");
    let eleTaxn = document.getElementById("taxon");
    let eleSrnk = document.getElementById("srank");
    let eleSgcn = document.getElementById("sgcn");
    let eleIucn = document.getElementById("iucn");
    let eleTndE = document.getElementById("TndE");
    let eleVern = document.getElementById("vName");
    let eleImag = document.getElementById("iconicImage");
    let eleAttr = document.getElementById("iconicImageAttrib");
    let eleFrst = document.getElementById("fsRec");
    let eleLast = document.getElementById("lsRec");
    let eleRecs = document.getElementById("vtRec");
    let eleWiki = document.getElementById("wikiText");
    let eleMore = document.getElementById("wikiPageHtml");
    let htmlWait = `&nbsp<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;
    eleTaxn.innerText = `(${taxonName})`;
    eleSrnk.innerHTML = htmlWait;
    eleIucn.innerHTML = htmlWait;
    eleTndE.innerHTML = htmlWait;
    eleFrst.innerHTML = htmlWait;
    eleLast.innerHTML = htmlWait;
    eleRecs.innerHTML = htmlWait;
    if (eleVern) {eleVern.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;}
    getStoredData("sheetSranks")
        .then(sheetSranks => {
            let ssr = sheetSranks[taxonName] ? sheetSranks[taxonName] : false;
            eleSrnk.innerHTML = '&nbsp' + (ssr ? ssr.S_RANK : 'N/A');
            eleSgcn.innerHTML = (ssr ? (ssr.SGCN ? `&nbsp~&nbsp${ssr.SGCN}` : '') : '');
            eleTndE.innerHTML = '&nbsp' + (ssr ? (ssr.TandE ? ssr.TandE : 'N/A') : 'N/A');
            if (eleVern) eleVern.innerHTML = '&nbsp' + (ssr ? ssr.COMMON_NAME : '');
            if (eleComn) eleComn.innerHTML = (ssr ? ssr.COMMON_NAME : '');
        })
    //let taxonKey = await getGbifTaxonKeyFromName(taxonName);
    let taxonKey =  false;
    getGbifTaxonKeyFromName(taxonName)
        .then(taxKey => {
            taxonKey = taxKey; //set this for use elsewhere
            gbifCountsByDateByTaxonKey(taxonKey)
                .then(data => {
                    let Frst = (data.min < 7000000000000) ? moment(data.min).format("DD MMM YYYY") : 'N/A';
                    let Last = (data.max > 0) ? moment(data.max).format("DD MMM YYYY") : 'N/A';
                    eleFrst.innerHTML = `&nbsp${Frst}`;
                    eleLast.innerHTML = `&nbsp${Last}`;
                    //eleRecs.innerHTML = `&nbsp<a href="${valSpcExpUrl}?q=${taxonName}">${nFmt.format(data.total)}</a>`;
                    eleRecs.innerHTML = `&nbsp<a href="${valOccExpUrl}?taxonKey=${taxonKey}&view=MAP">${nFmt.format(data.total)}</a>`;
                })
        })
        .catch(err => { //taxonKey for taxonName not found at GBIF!?
            // here we can call gbifCountsByDate(taxonName) and repeat the sets above. Hm, or we can use async/await to remain DRY.
        })
    let inat = await getInatSpecies(taxonName);
    if (!wikiName && inat.preferred_common_name) {wikiName = inat.preferred_common_name;}
    let wiki = await getWikiSummary(wikiName ? wikiName : taxonName);
    if (wikiName && !wiki.extract_html) { //sometimes an inat common name fails (eg. Cerma cora). try taxonName.
        console.log(`fillTaxonStats | getWikiSummary(${wikiName ? wikiName : taxonName}) failed. Trying getWikiSummary(${taxonName}).`)
        wikiName = false; //remove this bad value for 2nd wiki html page call below.
        wiki = await getWikiSummary(taxonName);
    }
    if (eleWiki && wiki.extract_html) {
        eleWiki.innerHTML = wiki.extract_html;
    }
    if (eleImag) {
        if (inat.default_photo) {
            let wikiLink = inat.wikipedia_url ? inat.wikipedia_url : `${wikiPageUrl}${wikiName ? wikiName : taxonName}`;
            eleImag.src = inat.default_photo.medium_url;
            eleImag.addEventListener("click", (e) => {location.assign(wikiLink)});
            eleImag.classList.add("pointer");
            eleAttr.innerHTML = inat.default_photo.attribution;
        } else if (wiki.thumbnail) {
            let wikiLink = wiki.content_urls.desktop.page ? wiki.content_urls.desktop.page : `${wikiPageUrl}${wikiName ? wikiName : taxonName}`;
            eleImag.src = wiki.thumbnail.source;
            eleImag.addEventListener("click", (e) => {location.assign(wikiLink)});
            eleImag.classList.add("pointer");
        }
    } 
    if (inat.preferred_common_name) {
        console.log('fillTaxonStats | Common Name from inat preferred_common_name:', inat.preferred_common_name);
        if (eleVern) eleVern.innerHTML = inat.preferred_common_name;
        if (eleComn) eleComn.innerHTML = inat.preferred_common_name;
    }
    if (eleIucn) {
        eleIucn.innerHTML = '&nbspN/A';
        if (inat.conservation_status) {
            eleIucn.innerHTML = `&nbsp${inat.conservation_status.status_name}`;
        }
    }
    if (eleMore) {
        let url = new URL(document.URL);
        console.log('URL origin:', url.origin);
        console.log('URL pathname:', url.pathname);
        let path = url.pathname.split('/');
        delete path[path.length-1]; //remove the terminal html file from pathname to make its URL route
        let rout = path.join('/');
        console.log('URL route:', rout);

        let row1Col1 = document.getElementById("wikiPageRow1Col1");
        let row2Col1 = document.getElementById("wikiPageRow2Col1");
        let row2Col2 = document.getElementById("wikiPageRow2Col2");
        let row3Col1 = document.getElementById("wikiPageRow3Col1");
        let rowLast1 = document.getElementById("wikiPageRowLastCol1");

        const parser = new DOMParser();
        let more = getWikiHtmlPage(wikiName ? wikiName : taxonName); //without await, async return is a promise
        console.log(`getTaxonStats::getWikiHtmlPage RESULT`, more.status, more.ok, more); //shows pending, then fulfilled
        more.then(more => {
            var hDom = parser.parseFromString(more, 'text/html');
            let ambiguous = more.includes('disambiguation') && more.includes('_disambigbox') && more.includes('dmbox-disambig');
            if (ambiguous) {
                console.log('*****************WIKIPEDIA DISAMBIGUATION******************');
                eleWiki.innerHTML = `Wikipedia search for "${taxonName}" produced ambiguous results.`
                let atags = hDom.querySelectorAll('a');
                atags.forEach((ele, idx) => {
                    if (ele.href.includes(url.origin)) {
                        ele.href = ele.href.replace(url.origin + rout, url.origin + url.pathname + `?taxonName=${taxonName}&wikiName=`);
                    }
                })
                let sections = hDom.querySelectorAll('section');
                sections.forEach((ele, idx) => {
                    row1Col1.appendChild(ele);
                })
            } else { // !ambiguous
                let atags = hDom.querySelectorAll('a');
                atags.forEach((ele, idx) => {
                    if (ele.href.includes(url.origin)) {
                        //console.log('before', idx, ele.href);
                        ele.href = ele.href.replace(url.origin+rout, 'https://en.wikipedia.org/wiki/');
                        //console.log('after', idx, ele.href);
                    }
                })
                let sections = hDom.querySelectorAll('section');
                //console.log(sections);
                sections.forEach((ele,idx) => {
                    //console.log('section', idx, ele);
                    if (0==idx) {
                        let ptags = ele.querySelectorAll('p');
                        //console.log('<p> tags in first section:', ptags);
                        ptags.forEach(ptag => {
                            //console.log('remove ptag:', ptag);
                            ptag.remove();
                        })
                        row2Col2.appendChild(ele);
                    }
                    /*
                    if (1==idx) {
                        row1Col1.appendChild(ele);
                    }
                    */
                    if (1<=idx && 4>=idx) {
                        row2Col1.appendChild(ele);
                    }
                    if (5<=idx) {
                        row3Col1.appendChild(ele);
                    }
                })
                rowLast1.innerHTML = `
                    This article includes material from the Wikipedia article "${taxonName}", 
                    which is released under the Creative Commons Attribution-Share-Alike License 3.0. 
                    `;
            } //end !ambiguous
        })
        .catch(err => {
            let wikiLink = `${wikiPageUrl}${wikiName ? wikiName : taxonName}`;
            row1Col1.innerHTML = `No wikipedia page for <i>${wikiName ? wikiName : taxonName}</i>. 
            Try adding one at <a href="${wikiLink}">${wikiLink}</a>`;
        })
    }
}

if (taxonName) {
    fillTaxonStats(taxonName, wikiName);
    gbifCountsByMonth(taxonName, 'speciesCountsByMonth'); //inatFreqHistogram(taxonName, 'speciesPhenoHisto');
    gbifCountsByYear(taxonName, 'speciesCountsByYear');
    getDistribution(taxonName, 'speciesDistribution');
    //loadSpeciesMap(`{"${taxonName}":"red","clusterMarkers":true}`);
   inatTaxonObsDonut(taxonName, 'inatTaxonObsDonut')
} else {
    console.log(`Call page with one query parameter, a single taxon, ' or binomial 'Genus species' like '?taxonName=Rattus norvegicus'`)
}
