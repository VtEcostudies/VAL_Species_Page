import { getOccsByFilters } from '../../VAL_Web_Utilities/js/fetchGbifOccs.js';
import { getWikiPage } from '../../VAL_Web_Utilities/js/wikiPageData.js';
import { parseCanonicalFromScientific } from '../../VAL_Web_Utilities/js/commonUtilities.js';
  
const eleTbl = document.getElementById("speciesListTable");

/*
geometry=POLYGON((-73.0 44.0,-72.75 44.0,-72.75 44.2,-73.0 44.2,-73.0 44.0))
coordinates: Array (1)
  coordinates[0]: Array(5)
    0: Array [ -72.56200954781823, 44.291742756710484 ]
    1: Array [ -72.56205261876526, 44.25007688817722 ]
    2: Array [ -72.62455517288059, 44.2500594469373 ]
    3: Array [ -72.6245558831222, 44.2917251487992 ]
    4: Array [ -72.56200954781823, 44.291742756710484 ]
*/
export async function getBlockSpeciesList(block='block_name', dataset=false, gWkt=false, tKeys=false) {

    let occs = await getOccsByFilters(0,300,dataset,gWkt,false,tKeys);
    //console.log('getBlockSpeciesList', occs);
    let hedSpcs = 'Species List for ' + block + (dataset ? ` and dataset ${dataset}` : '')
    let objSpcs = {};
    let arrOccs = occs.results;
    for (var i=0; i<arrOccs.length; i++) {
        let sciName = arrOccs[i].scientificName;
        let canName = parseCanonicalFromScientific(arrOccs[i]);
        if (objSpcs[canName]) { //check to replace name with more recent observation
            if (arrOccs[i].eventDate > objSpcs[canName].eventDate) {
                console.log('getOccsByFilters FOUND MORE RECENT OBSERVATION for', sciName, arrOccs[i].eventDate, '>',objSpcs[canName].eventDate);
                objSpcs[canName] = {
                    'acceptedTaxonKey':  arrOccs[i].acceptedTaxonKey,
                    'scientificName': arrOccs[i].scientificName,
                    'taxonRank': arrOccs[i].taxonRank,
                    'vernacularName': arrOccs[i].vernacularName,
                    'image': false,
                    'eventDate':  arrOccs[i].eventDate
                }
            }
      } else { //add new name
        objSpcs[canName] = {
            'acceptedTaxonKey':  arrOccs[i].acceptedTaxonKey,
            'scientificName': arrOccs[i].scientificName,
            'taxonRank': arrOccs[i].taxonRank,
            'vernacularName': arrOccs[i].vernacularName,
            'image': false,
            'eventDate':  arrOccs[i].eventDate
        }
      }
    }
    return {
        'head': hedSpcs, 
        cols:['Taxon Key','Scientific Name','Taxon Rank','Common Name','Image','Last Observed'], 
        'array': objSpcs, 
        'query': occs.query
    };
  }

var waitRow; var waitObj;

async function addTableWait() {
    waitRow = eleTbl.insertRow(0);
    waitObj = waitRow.insertCell(0);
    waitObj.style = 'text-align: center;';
    waitObj.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:60px;"></i>`;
}

async function delTableWait() {
    waitObj.remove();
    waitRow.remove();
}

async function addGBIFLink(geometry, taxonKeys) {
    let eleGBIF = document.getElementById("gbifLink");
    eleGBIF.href = `https://www.gbif.org/occurrence/search?${taxonKeys}&geometry=${geometry}`;
    eleGBIF.target = "_blank";
    eleGBIF.innerText = 'GBIF Occurrences';
}
  
//put one row in the header for column names
async function addTableHead(headCols=['Taxon Key','Scientific Name','Taxon Rank','Common Name','Image','Last Observed']) {
    let objHed = eleTbl.createTHead();
    let hedRow = objHed.insertRow(0);
    let colObj;
    for (var i=0; i<headCols.length; i++) {
        colObj = hedRow.insertCell(i);
        colObj.innerText = headCols[i];
    }
}
  
//Create table row for each array element, then fill row of cells
async function addTaxaFromArr(objArr) {
    //console.log('addTaxaFromArr', objArr);
    let rowIdx=0;
    for (const [spcKey, objSpc] of Object.entries(objArr)) {
        //console.log(objSpc, rowIdx)
        let objRow = await eleTbl.insertRow(rowIdx);
        await fillRow(spcKey, objSpc, objRow, rowIdx++);
    }
  }

//Create cells for each object element
async function fillRow(spcKey, objSpc, objRow, rowIdx) {
    let colIdx = 0;
    //let colObj = objRow.insertCell(colIdx++);
    //colObj.innerHTML += rowIdx+1;
    for (const [key, val] of Object.entries(objSpc)) {
        let colObj = objRow.insertCell(colIdx++);
        //console.log('key:', key);
        switch(key) {
            case 'image': case 'Image':
                colObj.innerHTML = `<i class="fa fa-spinner fa-spin" style="font-size:18px"></i>`;
                let wik = getWikiPage(spcKey);
                colObj.innerHTML = '';
                wik.then(wik => {
                    if (wik.thumbnail) {
                        let iconImg = document.createElement("img");
                        iconImg.src = wik.thumbnail.source;
                        iconImg.alt = spcKey;
                        iconImg.className = "icon-image";
                        iconImg.width = "30"; 
                        iconImg.height = "30";
                        let hrefImg = document.createElement("a");
                        hrefImg.href = wik.originalimage.source;
                        hrefImg.target = "_blank";
                        colObj.appendChild(hrefImg);
                        hrefImg.appendChild(iconImg);
                    }
                })
                break;
            case 'scientificName':
                colObj.innerHTML = `<a title="Wikipedia: ${spcKey}" href="https://en.wikipedia.org/wiki/${spcKey}">${val}</a>`;
                break;
            case 'eventDate':
                colObj.innerHTML = val ? moment(val).format('YYYY-MM-DD') : '';
                break;
            case 'vernacularName': //don't use GBIF occurrence value for vernacularName, use VAL checklist or VAL google sheet
                let key = objSpc.acceptedTaxonKey;
                //colObj.innerHTML = val ? val : (checklistVernacularNames[key] ? checklistVernacularNames[key][0].vernacularName : '');
                //colObj.innerHTML = val ? val : (sheetVernacularNames[key] ? sheetVernacularNames[key][0].vernacularName : '');
                colObj.innerHTML = checklistVernacularNames[key] ? checklistVernacularNames[key][0].vernacularName : (sheetVernacularNames[key] ? sheetVernacularNames[key][0].vernacularName : '');
                break;
            case 'acceptedTaxonKey':
                colObj.innerHTML = `<a title="Gbif Species Profile: ${val}" href="https://gbif.org/species/${val}">${val}</a>`;
                break;
            default:
                colObj.innerHTML = val ? val : '';
                break;
        }
    }
}

    //addTableWait();
    //await addTaxaFromArr(spcs.array);
    //await addTableHead(spcs.cols);
    //await setLabelText(block, dataset, taxonKeys, Object.keys(spcs.array).length);
    //delTableWait();
