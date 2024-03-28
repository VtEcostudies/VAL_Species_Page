import { getDistribution } from './valDistSuitMap.js'
import { gbifCountsByYearByTaxonKey, gbifCountsByYearByTaxonName } from './gbifCountsByYear.js'
import { gbifCountsByMonthByTaxonKey, gbifCountsByMonthByTaxonName } from './gbifCountsByMonth.js'
import { gbifCountsByDateByTaxonKey, gbifCountsByDateByTaxonName } from './gbifCountsByDate.js';
import { getStoredConservationStatus } from '../../VAL_Web_Utilities/js/fetchGoogleSheetsData.js';
import { getGbifSynonymsByHigherTaxonKey, getGbifSynonymsFromKey } from '../../VAL_Web_Utilities/js/fetchGbifSpecies.js';
import { getWikiHtmlPage, getWikiSummary } from '../../VAL_Web_Utilities/js/wikiPageData.js';
import { getInatSpecies } from '../../VAL_Web_Utilities/js/inatSpeciesData.js';
import { loadSpeciesMap } from './valSpeciesMap.js';
import { inatTaxonObsDonut } from '../../VAL_Web_Utilities/js/inatTaxonObservationDonut.js';
import { getGbifTaxonKeyFromName, findListTaxonByNameAndRank, getGbifTaxonFromKey, getGbifVernacularsFromKey, getParentRank, parseNameToRank } from '../../VAL_Web_Utilities/js/fetchGbifSpecies.js';
import { gbifPhenologyByTaxonKeys, gbifPhenologyByTaxonNames } from '../../VAL_Web_Utilities/js/gbifPhenologyModule.js';
import { gbifD3PhenologyByTaxonName, gbifD3PhenologyByTaxonKey } from '../../VAL_Web_Utilities/js/gbifD3PhenologyByWeek.js';
let siteNames = [];
let siteConfig = '../VAL_Data_Explorers/js/gbifSiteConfig.js';
import(siteConfig).then(file => {
    console.log(`Dynamic import ${siteConfig} SUCCESS`, file);
    siteNames = file.siteNames;
}).catch(err => {
    console.log(`Dynamic import ${siteConfig} ERROR`, err);
})

var gbifInfo = false; //gbif occurrence query promise shared to handle in multiple sections
var siteName = false;
var profileUrl = false;
var inatWiki = false;

startUp();

async function fillTaxonStats(fileConfig, taxonKey, taxonName, taxonObj, wikiName=false) {
    let dataConfig = fileConfig.dataConfig;
    const exploreUrl = dataConfig.exploreUrl;
    const resultsUrl = dataConfig.resultsUrl;
    const wikiPageUrl = `https://www.wikipedia.org/wiki/`
    const nFmt = new Intl.NumberFormat();

    let eleTtl = document.getElementById("pageTitle");
    let eleVtL = document.getElementById("vtLbl");
    let eleFsL = document.getElementById("fsLbl");
    let eleLsL = document.getElementById("lsLbl");
    if (eleTtl) {eleTtl.innerHTML = `<a href="${dataConfig.homeUrl}">${dataConfig.atlasName}</a>`;}
    eleVtL.innerText = `${dataConfig.atlasPlace} Records:`;
    eleFsL.innerText = `First ${dataConfig.atlasAbbrev} Record:`;
    eleLsL.innerText = `Last ${dataConfig.atlasAbbrev} Record:`;

    let eleComn = document.getElementById("common");
    let eleTaxn = document.getElementById("taxon");
    let eleSrnk = document.getElementById("srank");
    let eleSgcn = document.getElementById("sgcn");
    let eleIucn = document.getElementById("iucn");
    let elelTnE = document.getElementById("teLbl"); //regional Threatened and Endangered listings label
    let eleTndE = document.getElementById("TndE"); //regional Threatened and Endangered listings value
    let eleImag = document.getElementById("iconicImage");
    let eleAttr = document.getElementById("iconicImageAttrib");
    let eleFrst = document.getElementById("fsRec");
    let eleLast = document.getElementById("lsRec");
    let eleRecs = document.getElementById("vtRec");
    let eleWiki = document.getElementById("wikiText");
    let eleMore = document.getElementById("wikiPageHtml");
    let htmlWait = `&nbsp<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;
    eleTaxn.innerHTML = `${taxonObj.rank ? taxonObj.rank : ''} <u>${taxonName}</u> (${taxonObj.taxonomicStatus})`;
    eleSrnk.innerHTML = htmlWait;
    eleIucn.innerHTML = htmlWait;
    eleTndE.innerHTML = htmlWait;
    eleFrst.innerHTML = htmlWait;
    eleLast.innerHTML = htmlWait;
    eleRecs.innerHTML = htmlWait;
    //let vern = getGbifVernacularsFromKey(taxonObj.key);
    if (taxonObj.vernacularName) {
        console.log('taxonObj.vernacularName', taxonObj.vernacularName);
        eleComn.innerHTML = taxonObj.vernacularName.replace(`'S`,`'s`);
        eleComn.title = `Vernacular Name from GBIF species/key`;
    } else {
        let vern = getGbifVernacularsFromKey(taxonObj.key);
        vern.then(vern => {
            if (vern.length) {
                let vObj = false;
                for (var i=0; i<vern.length; i++) {
                    console.log(`getGbifVernacularsFromKey(${taxonObj.key})`, vern[i]);
                    if (vern[i].preferred) {vObj = vern[i]; break;}
                }
                if (!vObj) {vObj = vern[0];} //no preferred name found. use first value.
                eleComn.innerHTML = vObj.vernacularName.replace(`’`,`'`).replace(`'S`,`'s`);
                eleComn.title = `Vernacular Name from GBIF species/key/vernacularNames`;
            }
        })
        .catch(err => {console.log('valSpeciesPage=>fillTaxonStats=>getGbifVernacularsFromKey ERROR', err)})    
    }
    elelTnE.style.display = fileConfig.dataConfig.atlasAdmin ? elelTnE.style.display : 'none'; //label
    eleTndE.style.display = fileConfig.dataConfig.atlasAdmin ? eleTndE.style.display : 'none'; //value
    elelTnE.innerText = `${fileConfig.dataConfig.atlasAdmin} List:`;
    console.log('conservationStatusName', dataConfig.conservationStatusName, dataConfig);
    let shtInfo = getStoredConservationStatus(dataConfig.conservationStatusName);
    shtInfo.then(sheetSranks => {
            let ssr = sheetSranks[taxonName] ? sheetSranks[taxonName] : false;
            console.log('conservationStatus result', taxonName, ssr);
            let tne = (ssr ? (ssr.TandE ? ssr.TandE : false) : false);
            eleSrnk.innerHTML = '&nbsp' + (ssr ? (ssr.S_RANK ? ssr.S_RANK : 'N/A') : 'N/A');
            eleSrnk.innerHTML = (ssr ? ('SC' == ssr.TandE ? ssr.TandE : 'N/A') : 'N/A'); //this is a hack for the MVAL site - MESA puts 'SC' with State T & E
            eleSgcn.innerHTML = (ssr ? (ssr.SGCN ? `&nbsp~&nbsp${ssr.SGCN}` : '') : '');
            eleTndE.innerHTML = '&nbsp' + (tne ? ('T'==tne ? 'Threatened' : ('E'==tne ? 'Endangered' : 'N/A')) : 'N/A');
        })
    if (taxonObj.accepted) { //there is an 'accepted' value, so we're showing a synonym
        eleTaxn.innerHTML += ` => <a href="${profileUrl}?siteName=${siteName}&taxonKey=${taxonObj.acceptedKey}">${taxonObj.accepted}</a> (ACCEPTED)`;
    }
    let synRank = taxonObj.rank;
    if ('SPECIES' == taxonObj.rank || 'SUBSPECIES' == taxonObj.rank) {synRank = 0;} //this allows SUBSPECIES synonyms to be list for SPECIES
    //let syns = getGbifSynonymsByHigherTaxonKey(taxonKey, synRank, fileConfig); //O'E, only list same-rank synonyms (too messy to include for higher ranks)
    let syns = getGbifSynonymsFromKey(taxonKey);
    syns.then(syns => {
        //syns.synonyms.forEach(syn => {
        syns.forEach(syn => {
            eleTaxn.innerHTML += ` <= ${syn.rank} <a href="${profileUrl}?siteName=${siteName}&taxonKey=${syn.key}&taxonName=${syn.canonicalName}">${syn.canonicalName}</a> (${syn.taxonomicStatus})`;
        })
    })
    let gbif = gbifCountsByDateByTaxonKey(taxonKey, fileConfig);
    gbifInfo = gbif;
    gbif.then(gbif => {
        let Frst = (gbif.min < 7000000000000) ? moment.utc(gbif.min).format("DD MMM YYYY") : 'N/A';
        let Fmon = (gbif.min < 7000000000000) ? moment.utc(gbif.min).format("M") : '';
        let Fyer = (gbif.min < 7000000000000) ? moment.utc(gbif.min).format("YYYY") : '';
        let Fdat = (gbif.min < 7000000000000) ? moment.utc(gbif.min).format("YYYY-MM-DD") : '';
        let Last = (gbif.max > 0) ? moment.utc(gbif.max).format("DD MMM YYYY") : 'N/A';
        let Lmon = (gbif.max > 0) ? moment.utc(gbif.max).format("M") : '';
        let Lyer = (gbif.max > 0) ? moment.utc(gbif.max).format("YYYY") : '';
        let Ldat = (gbif.max > 0) ? moment.utc(gbif.max).format("YYYY-MM-DD") : '';
        eleRecs.innerHTML = `&nbsp<a href="${exploreUrl}?${gbif.search}&view=MAP">${nFmt.format(gbif.total)}</a>`;
        eleFrst.innerHTML = `&nbsp<a href="${exploreUrl}?${gbif.search}&gbif-year=${Fyer}&month=${Fmon}&view=TABLE">${Frst}</a>`
        eleLast.innerHTML = `&nbsp<a href="${exploreUrl}?${gbif.search}&gbif-year=${Lyer}&month=${Lmon}&view=TABLE">${Last}</a>`
    });
    let inat; try {inat = await getInatSpecies(taxonName, taxonObj.rank, taxonObj.parent, getParentRank(taxonObj.rank));} catch(err) {inat={};}
    if (!wikiName && inat.wikipedia_url) {
        wikiName = inat.wikipedia_url.split('/').slice(-1);
    }
    let wiki = await getWikiSummary(wikiName ? wikiName : taxonName);
    if (wikiName && !wiki.extract_html) { //sometimes an inat common name fails (eg. Cerma cora). try taxonName.
        console.log(`fillTaxonStats | getWikiSummary(${wikiName ? wikiName : taxonName}) failed. Trying getWikiSummary(${taxonName}).`)
        //wikiName = false; //remove this bad value for 2nd wiki html page call below.
        inatWiki = true; //BS klugey flag...
        wiki = await getWikiSummary(taxonName);
    }
    if (eleWiki && wiki.extract_html) {
        eleWiki.innerHTML = wiki.extract_html;
    }
    if (eleWiki) {
        //Use Synonyms to look for wikipedia alternate content:
        syns.then(syns => {
            //syns.synonyms.forEach(syn => {
            syns.forEach(syn => {
                if (syn.canonicalName != wikiName) {
                    eleWiki.innerHTML += `Wikipedia for synonym <a href="${profileUrl}?siteName=${siteName}&taxonKey=${taxonKey}&taxonName=${taxonName}&wikiName=${syn.canonicalName}">${syn.canonicalName}</a><br>`
                }
            })
        })
    }
    if (eleImag) {
        gbif.then(gbif => {
            let imagLink = `${exploreUrl}?${gbif.search}&view=GALLERY`;
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
    if (!eleComn.innerHTML && inat.preferred_common_name) {
        eleComn.innerHTML = inat.preferred_common_name;
        eleComn.title = `Vernacular Name from iNat API - preferred_common_name`;
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
        let page = getWikiHtmlPage(wikiName ? wikiName : taxonName); //without await, async return is a promise
        console.log(`getTaxonStats::getWikiHtmlPage(${wikiName ? wikiName : taxonName}) RESULT`, page.status, page.ok, page); //shows pending, then fulfilled
        page.then(more => {
            var hDom = parser.parseFromString(more, 'text/html');
            let ambiguous = more.includes('disambiguation') && more.includes('_disambigbox') && more.includes('dmbox-disambig');
            if (ambiguous) {
                console.log('*****************WIKIPEDIA DISAMBIGUATION******************');
                eleWiki.innerHTML = `Wikipedia search for "${taxonName}" produced ambiguous results.`
                let atags = hDom.querySelectorAll('a');
                atags.forEach((ele, idx) => {
                    if (ele.href.includes(url.origin)) {
                        ele.href = ele.href.replace(url.origin + rout, url.origin + url.pathname + `?siteName=${siteName}&taxonKey=${taxonKey}&taxonName=${taxonName}&wikiName=`);
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
            console.log(`fillTaxonStats ERROR:`,err);
            //alert(`wikiName:${wikiName}, taxonName:${taxonName}`)
            let wikiLink = `${wikiPageUrl}${wikiName ? wikiName : taxonName}`;
            row1Col1.innerHTML = `No wikipedia page for <i>${wikiName ? wikiName : taxonName}</i>. 
            You may create one at <a href="${wikiLink}">${wikiLink}</a><br>`;
        })
    }
}

/*
There's specific failures to handle:
- taxonName doesn't match when it should (eg. Sterna, Sternaspis)
- 
 */
function startUp() {
    const objUrlParams = new URLSearchParams(window.location.search);
    siteName = objUrlParams.get('siteName');
    console.log('Query Param siteName:', siteName);
    siteName = siteName ? siteName : 'val';
    var taxonName = objUrlParams.get('taxonName');
    console.log('Query Param taxonName:', taxonName);
    var taxonRank = objUrlParams.get('taxonRank');
    console.log('Query Param taxonRank:', taxonRank);
    var taxonKey = objUrlParams.get('taxonKey');
    console.log('Query Param taxonKey:', taxonKey);
    var wikiName = objUrlParams.get('wikiName');
    console.log('Query Param wikiName:', wikiName);
    inatWiki = objUrlParams.get('inatWiki');
    console.log('Query Param inatWiki:', inatWiki);

    import(`../../VAL_Web_Utilities/js/gbifDataConfig.js?siteName=${siteName}`)
        .then(async fileConfig => {
        console.log('valSpeciesPage | siteName:', siteName, 'dataConfig:', fileConfig.dataConfig);
        if (!fileConfig.dataConfig) {
            let msg = `Living Atlas site named '${siteName}' does not exist.`;
            if (siteNames.length) {msg += `\nUse one of: \n\t\t${siteNames.join('\n\t\t')}`;}
            alert(msg);
        } else {
            profileUrl = fileConfig.dataConfig.profileUrl;        
            if (taxonKey) {
                let taxonObj = await getGbifTaxonFromKey(taxonKey);
                if (!taxonName) {taxonName = taxonObj.canonicalName;}
                fillPageItems(fileConfig, taxonKey, taxonName, taxonObj, wikiName);
            } else if (taxonName) {
                if (!taxonRank) {taxonRank = parseNameToRank(taxonName);}
                //let taxonKey = await getGbifTaxonKeyFromName(taxonName, taxonRank);
                //if (taxonKey) {
                    //let taxonObj = await getGbifTaxonFromKey(taxonKey);
                findListTaxonByNameAndRank(fileConfig, taxonName, taxonRank).then(taxonObj => {
                    if (taxonObj.key) {
                        taxonKey = taxonObj.key;
                        fillPageItems(fileConfig, taxonKey, taxonName, taxonObj, wikiName);
                    }
                    else {
                        notFound(fileConfig, taxonKey, taxonName, taxonRank);
                    }
                }).catch(err => {
                    notFound(fileConfig, taxonKey, taxonName, taxonRank, err.message);
                })
            } else {
                notFound(fileConfig, taxonKey, taxonName, taxonRank);
            }
        }
    })
}
function notFound(fileConfig, taxonKey, taxonName, taxonRank, message='') {
    let eleTtl = document.getElementById("pageTitle");
    if (eleTtl) {eleTtl.innerHTML = `<a href="${fileConfig.dataConfig.homeUrl}">${fileConfig.dataConfig.atlasName}</a>`;}
    let qryMsg = `<h3>${message?message:taxonName+' with rank '+taxonRank+' Not Found'}</h3>`; 
    qryMsg += '<p>To query a taxon within a species list there are 2 options:</p>';
    qryMsg += `<ol>`;
    qryMsg += `<li>Use a GBIF taxonKey from within a species list, or</li>`
    qryMsg += `<li>Use a siteName and taxonName (and taxonRank)</li>`
    qryMsg += `</ol>`;
    qryMsg += '<p>Some example query parameters:</p>';
    qryMsg += `<ul>`;
    qryMsg += `<li>With eg. <a href="${profileUrl}?taxonKey=160795823">?taxonKey=160795823</a></li>`
    qryMsg += `<li>With eg. <a href="${profileUrl}?siteName=vtButterflies&taxonKey=210595558">?siteName=vtButterflies&taxonKey=210595558</a></li>`
    qryMsg += `<li>A single taxonName or binomial 'Genus species' like <a href="${profileUrl}?siteName=vtButterflies&taxonName=Danaus plexippus">'?siteName=vtButterflies&taxonName=Danaus plexippus'</a></li>`;
    qryMsg += `<li>Include taxonRank eg. <a href="${profileUrl}?siteName=mval&taxonName=Sterna&taxonRank=GENUS">?siteName=mval&taxonName=Sterna&taxonRank=GENUS</a> to resolve name ambiguities</li>`
    qryMsg += `</ul>`;
    console.log(qryMsg);
    document.getElementById("common").innerHTML = qryMsg;
    document.getElementById("rowTopContent").style.display = 'none';
    document.getElementById("rowMidContent").style.display = 'none';
    document.getElementById("rowBotContent").style.display = 'none';
}

function fillPageItems(fileConfig, taxonKey, taxonName, taxonObj, wikiName) {
    fillTaxonStats(fileConfig, taxonKey, taxonName, taxonObj, wikiName);
    //gbifCountsByMonthByTaxonKey(taxonKey, 'speciesCountsByMonth', fileConfig);
    //gbifPhenologyByTaxonKeys(taxonKeyA=[], columnA=[], geoSearchA=[], objHtmlIds={tblId:false, ttlId:false}, objSort, objTitle
    //gbifPhenologyByTaxonNames([taxonName], [], fileConfig.predicateToQueries(fileConfig.dataConfig.rootPredicate, true));
    //gbifD3PhenologyByTaxonName(taxonName, 'speciesCountsByWeek', fileConfig);
    gbifD3PhenologyByTaxonKey(taxonKey, 'speciesCountsByWeek', fileConfig);
    gbifCountsByYearByTaxonKey(taxonKey, 'speciesCountsByYear', fileConfig);
    inatTaxonObsDonut(taxonName, taxonObj.rank, taxonObj.parent, 'inatTaxonObsDonut', fileConfig.dataConfig.inatProject);
    if ('val' == siteName) {
        getDistribution(taxonName, 'speciesDistribution', 'speciesDistMissing', fileConfig);
        gbifInfo.then(info => {
            if (info.total < 9900) {
                if (initObsTab(1)) {
                    loadSpeciesMap(`{"${taxonName}":"red","clusterMarkers":true}`, 'occMap', fileConfig);
                }
            } else {
                initObsTab(0);
                console.log(`Can't load observations. Too many to plot. (${info.total})`);
            }
        })
    } else {
        initObsTab(0);
        initDisTab(0);
    }
}

//This just initializes the occurrence map tab. The map is shown by clicking its tab, handled with inline script in html.
function initObsTab(show=1) {
    let eleTab = document.getElementById('occMapTab');
    if (eleTab) {
        eleTab.style.display = show ? 'block' : 'none';
    }
    return (eleTab && show);
}

//This just initializes the suitability/distribution tab. Shown by clicking its tab, handled with inline script in html.
function initDisTab(show=1) {
    let eleTab = document.getElementById('distrTab');
    if (eleTab) {
        eleTab.style.display = show ? 'block' : 'none';
    }
    return (eleTab && show);
}