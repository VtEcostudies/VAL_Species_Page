import { getDistribution } from './valDistMap.js'
import { inatFreqHistogram } from './phenologyHistogram.js';
import { gbifCountsByYear } from './gbifCountsByYear.js'
import { gbifCountsByMonth } from './gbifCountsByMonth.js'
import { getStoredData } from './fetchSpeciesData.js';
import { getWikiPage } from './VAL_Web_Utilities/js/wikiPageData.js';
import { gbifCountsByDate } from './gbifCountsByDate.js';
import { getInatSpecies } from './VAL_Web_Utilities/js/inatSpeciesData.js';

const nFmt = new Intl.NumberFormat();

const gbifVTOccUrl = `https://gbif.org/occurrence/search?gadmGid=USA.46_1&`;
const valOccUrl = `https://val.vtecostudies.org/gbif-species-explorer`;
const inatSpeciesUrl = `https://www.inaturalist.org/taxa/search`;

const objUrlParams = new URLSearchParams(window.location.search);

const taxonName = objUrlParams.get('taxonName');
console.log('Query Param taxonName:', taxonName);
const taxonKey = objUrlParams.get('taxonKey');
console.log('Query Param taxonKey:', taxonKey);
var other = ''; var objOther = {};

objUrlParams.forEach((val, key) => {
    if ('taxonKey'!=key && 'taxonName'!=key) {
      other += `&${key}=${val}`;
      objOther[key] = val;
    }
  });

async function fillTaxonStats(taxonName) {
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
    gbifCountsByDate(taxonName)
        .then(data => {
            let Frst = (data.min < 7000000000000) ? moment(data.min).format("DD MMM YYYY") : 'N/A';
            let Last = (data.max > 0) ? moment(data.max).format("DD MMM YYYY") : 'N/A';
            eleFrst.innerHTML = `&nbsp${Frst}`;
            eleLast.innerHTML = `&nbsp${Last}`;
            eleRecs.innerHTML = `&nbsp${nFmt.format(data.total)}`;
        })
    let wiki = await getWikiPage(taxonName);
    let inat = await getInatSpecies(taxonName);
    if (eleWiki && wiki.extract_html) {
        eleWiki.innerHTML = wiki.extract_html;
    }
    if (eleImag && wiki.thumbnail) {
        eleImag.src = wiki.thumbnail.source;
        eleImag.addEventListener("click", (e) => {location.assign(wiki.content_urls.desktop.page)});
        eleImag.classList.add("pointer");
    } else if (eleImag && inat.name == taxonName) {
        eleImag.src = inat.default_photo.medium_url;
        eleImag.addEventListener("click", (e) => {location.assign(inat.wikipedia_url)});
        eleImag.classList.add("pointer");
        eleAttr.innerHTML = inat.default_photo.attribution;
    }
    if (inat.preferred_common_name) {
        if (eleComn) eleComn.innerHTML = inat.preferred_common_name;
    }
    if (eleIucn) {
        eleIucn.innerHTML = '&nbspN/A';
        if (inat.conservation_status) {
            eleIucn.innerHTML = `&nbsp${inat.conservation_status.status_name}`;
        }
    }
}

if (taxonName) {
    fillTaxonStats(taxonName);
    gbifCountsByMonth(taxonName, 'speciesCountsByMonth'); //inatFreqHistogram(taxonName, 'speciesPhenoHisto');
    gbifCountsByYear(taxonName, 'speciesCountsByYear');
    getDistribution(taxonName, 'speciesDistribution');
} else {
    console.log(`Call page with one query parameter, a single taxon or binomial 'Genus species' like '?taxonName=Rattus norvegicus'`)
}
