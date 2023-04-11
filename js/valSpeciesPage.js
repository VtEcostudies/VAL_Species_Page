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
import { dataConfig } from './VAL_Web_Utilities/js/gbifDataConfig.js';

const nFmt = new Intl.NumberFormat();
var gbifInfo = false;

const gbifGadmVtOccUrl = `https://gbif.org/occurrence/search?gadmGid=USA.46_1`;
const gbifStateVtOccUrl = `https://gbif.org/occurrence/search?stateProvince=vermont&stateProvince=vermont (State)`;
//const valSpcExpUrl = `https://val.vtecostudies.org/gbif-species-explorer`;
//const valOccExpUrl = `https://val.vtecostudies.org/gbif-explorer`;
const altOccExpUrl = `https://vtatlasoflife.org/VAL_Data_Explorers/occurrences.html`;
const exploreUrl = dataConfig.exploreUrl;
const resultsUrl = dataConfig.resultsUrl;
const profileUrl = dataConfig.profileUrl;
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
            let tne = (ssr ? (ssr.TandE ? ssr.TandE : false) : false);
            eleSrnk.innerHTML = '&nbsp' + (ssr ? ssr.S_RANK : 'N/A');
            eleSgcn.innerHTML = (ssr ? (ssr.SGCN ? `&nbsp~&nbsp${ssr.SGCN}` : '') : '');
            eleTndE.innerHTML = '&nbsp' + (tne ? ('T'==tne ? 'Threatened' : ('E'==tne ? 'Endangered' : 'N/A')) : 'N/A');
            if (eleVern) eleVern.innerHTML = '&nbsp' + (ssr ? ssr.COMMON_NAME : '');
            if (eleComn) eleComn.innerHTML = (ssr ? ssr.COMMON_NAME : '');
        })
    let taxonKey = getGbifTaxonKeyFromName(taxonName);
    let gbif = new Promise((resolve,reject) => { //wrap 2 calls in a Promise to pull branching result outside and handle singly, below, with gbif.then...
        taxonKey.then(taxonKey => {
            resolve(gbif = gbifCountsByDateByTaxonKey(taxonKey));
        });
        taxonKey.catch(err => {
            resolve(gbif = gbifCountsByDate(taxonName));
        });
    });
    gbifInfo = gbif;
    gbif.then(gbif => {
        let Frst = (gbif.min < 7000000000000) ? moment(gbif.min).format("DD MMM YYYY") : 'N/A';
        let Fmon = (gbif.min < 7000000000000) ? moment(gbif.min).format("M") : false;
        let Fyer = (gbif.min < 7000000000000) ? moment(gbif.min).format("YYYY") : false;
        let Fdat = (gbif.min < 7000000000000) ? moment(gbif.min).format("YYYY-MM-DD") : false;
        let Last = (gbif.max > 0) ? moment(gbif.max).format("DD MMM YYYY") : 'N/A';
        let Lmon = (gbif.max > 0) ? moment(gbif.max).format("M") : false;
        let Lyer = (gbif.max > 0) ? moment(gbif.max).format("YYYY") : false;
        let Ldat = (gbif.max > 0) ? moment(gbif.max).format("YYYY-MM-DD") : false;
        //eleFrst.innerHTML = `&nbsp${Frst}`;
        //eleLast.innerHTML = `&nbsp${Last}`;
        taxonKey.then(taxonKey => {
            eleRecs.innerHTML = `&nbsp<a href="${exploreUrl}?taxonKey=${taxonKey}&view=MAP">${nFmt.format(gbif.total)}</a>`;
            eleFrst.innerHTML = `&nbsp<a href="${altOccExpUrl}?taxonKey=${taxonKey}&year=${Fyer}&month=${Fmon}&view=TABLE">${Frst}</a>`
            //eleFrst.innerHTML = `&nbsp<a href="${gbifGadmVtOccUrl}&taxonKey=${taxonKey}&event_date=${Fdat}">${Frst}</a>`
            eleLast.innerHTML = `&nbsp<a href="${altOccExpUrl}?taxonKey=${taxonKey}&year=${Lyer}&month=${Lmon}&view=TABLE">${Last}</a>`
            //eleLast.innerHTML = `&nbsp<a href="${gbifGadmVtOccUrl}&taxonKey=${taxonKey}&event_date=${Ldat}">${Last}</a>`
        });
        taxonKey.catch(err => {
            eleRecs.innerHTML = `&nbsp<a href="${resultsUrl}?q=${taxonName}">${nFmt.format(gbif.total)}</a>`;
            eleFrst.innerHTML = `&nbsp<a href="${altOccExpUrl}?q=${taxonName}&year=${Fyer}&month=${Fmon}&view=TABLE">${Frst}</a>`
            //eleFrst.innerHTML = `&nbsp<a href="${gbifGadmVtOccUrl}&q=${taxonName}&event_date=${Fdat}">${Frst}</a>`
            eleLast.innerHTML = `&nbsp<a href="${altOccExpUrl}?q=${taxonName}&year=${Lyer}&month=${Lmon}&view=TABLE">${Last}</a>`
            //eleLast.innerHTML = `&nbsp<a href="${gbifGadmVtOccUrl}&taxonKey=${taxonKey}&event_date=${Ldat}">${Last}</a>`
        })
    });
    let inat = await getInatSpecies(taxonName);
    if (!wikiName && inat.wikipedia_url) {
        wikiName = inat.wikipedia_url.split('/').slice(-1);
    }
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
        taxonKey.then(taxonKey => {
            let imagLink = `${exploreUrl}?taxonKey=${taxonKey}&view=GALLERY`;
            eleImag.addEventListener("click", (e) => {location.assign(imagLink)});
            eleImag.classList.add("pointer");
        });
        if (inat.default_photo) {
            eleImag.src = inat.default_photo.medium_url;
            eleAttr.innerHTML = inat.default_photo.attribution;
        } else if (wiki.thumbnail) {
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
            let iucn = inat.conservation_status.status_name;
            iucn = iucn.charAt(0).toUpperCase() + iucn.slice(1);
            eleIucn.innerHTML = `&nbsp${iucn}`;
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
        console.log(`getTaxonStats::getWikiHtmlPage(${wikiName ? wikiName : taxonName}) RESULT`, more.status, more.ok, more); //shows pending, then fulfilled
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
            You may create one at <a href="${wikiLink}">${wikiLink}</a>`;
        })
    }
}

if (taxonName) {   
    fillTaxonStats(taxonName, wikiName);
    gbifCountsByMonth(taxonName, 'speciesCountsByMonth'); //inatFreqHistogram(taxonName, 'speciesPhenoHisto');
    gbifCountsByYear(taxonName, 'speciesCountsByYear');
    getDistribution(taxonName, 'speciesDistribution', 'speciesDistMissing');
    inatTaxonObsDonut(taxonName, 'inatTaxonObsDonut')
    gbifInfo.then(info => {
        if (info.total < 9900) {
            showObsTab(1);
            loadSpeciesMap(`{"${taxonName}":"red","clusterMarkers":true}`, 'occMap');
        } else {
            showObsTab(0);
            console.log(`Can't load observations. Too many to plot. (${info.total})`);
        }
    })
} else {
    let qryMsg = `Call page with one query parameter - a single taxon or binomial 'Genus species' like '?taxonName=Rattus norvegicus'` 
    console.log(qryMsg);
    alert(qryMsg);
}

function showObsTab(show=1) {
    let eleTab = document.getElementById('occMapTab');
    let eleObs = document.getElementById('occMap');
    eleTab.style.display = show ? 'block' : 'none';
    eleObs.style.display = show ? 'block' : 'none';
}