import { addDistribution } from './valDistMap.js'
import { inatFreqHistogram } from './phenologyHistogram.js';
import { gbifCountsByYear } from './gbifCountsByYear.js'
import { gbifCountsByMonth } from './gbifCountsByMonth.js'
import { getStoredData } from './fetchSpeciesData.js';
import { getWikiPage } from './VAL_Web_Utilities/js/wikiPageData.js';
import { gbifCountsByDate } from './gbifCountsByDate.js';
import { getInatSpecies } from './VAL_Web_Utilities/js/inatSpeciesData.js';

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

function fillTaxonStats(taxonName) {
    let eleCom = document.getElementById("common");
    let eleTax = document.getElementById("taxon");
    let eleSrnk = document.getElementById("srank");
    let eleVern = document.getElementById("vName");
    let eleImg = document.getElementById("iconicImage");
    let eleAtt = document.getElementById("iconicImageAttrib");
    let eleFrs = document.getElementById("fsRec");
    let eleLas = document.getElementById("lsRec");
    let eleVtR = document.getElementById("vtRec");
    eleTax.innerText = `(${taxonName})`;
    eleSrnk.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;
    if (eleVern) {eleVern.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;}
    getStoredData("sheetSranks")
        .then(sheetSranks => {
            let ssr = sheetSranks[taxonName] ? sheetSranks[taxonName] : false;
            eleSrnk.innerHTML = '&nbsp' + (ssr ? ssr.S_RANK : 'N/A');
            if (eleVern) eleVern.innerHTML = '&nbsp' + (ssr ? ssr.COMMON_NAME : '{missing}');
            if (eleCom) eleCom.innerHTML = (ssr ? ssr.COMMON_NAME : '');
        })
    gbifCountsByDate(taxonName)
        .then(data => {
            eleFrs.innerHTML = `&nbsp${moment(data.min).format("DD MMM, YYYY")}`;
            eleLas.innerHTML = `&nbsp${moment(data.max).format("DD MMM, YYYY")}`;
            eleVtR.innerHTML = `&nbsp${data.total}`;
            //eleVtR.innerHTML = `&nbsp<a href="${valOccUrl}?q=${taxonName}">${data.total}</a>`;
        })
    getWikiPage(taxonName)
        .then(wik => {
            if (wik.thumbnail) {
                eleImg.src = wik.thumbnail.source;
                eleImg.addEventListener("click", (e) => {location.assign(wik.content_urls.desktop.page)});
                eleImg.classList.add("pointer");
            } else {
                getInatSpecies(taxonName)
                    .then(inat => {
                        if (inat.results[0].name == taxonName) {
                            eleImg.src = inat.results[0].default_photo.medium_url;
                            //eleImg.addEventListener("click", (e) => {location.assign(`${inatSpeciesUrl}?q=${taxonName}`)});
                            eleImg.addEventListener("click", (e) => {location.assign(inat.results[0].wikipedia_url)});
                            eleImg.classList.add("pointer");
                            eleAtt.innerHTML = inat.results[0].default_photo.attribution;
                        }
                    })
            }
        })
}

if (taxonName) {
    fillTaxonStats(taxonName);
    //gbifCountsByDate(taxonName);
    gbifCountsByMonth(taxonName, 'speciesCountsByMonth');
    //inatFreqHistogram(taxonName, 'speciesPhenoHisto');
    gbifCountsByYear(taxonName, 'speciesCountsByYear');
    //addDistribution(taxonName, 'speciesDistribution');
} else {
    console.log(`Call page with the query parameter '?taxonName=Rattus norvegicus'`)
}
