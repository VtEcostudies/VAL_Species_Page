import { getImgSource, fetchSpeciesDistMap } from './fetchSpeciesDistMap.js';

var distMap = false;
var distLay = false;
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph

async function addDistMap() {
    distMap = await L.map('species-distribution', {
            zoomControl: false, //start with zoom hidden.  this allows us to add it below, in the location where we want it.
            center: vtCenter,
            zoom: 8
        });

    distMap.on("overlayadd", e => MapOverlayAdd(e));

    L.tileLayer(
      "http://{s}.sm.mapstack.stamen.com/(toner-lite,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/{z}/{x}/{y}.png"
    ).addTo(distMap);
    
    return distMap;
}

function MapOverlayAdd(e) {
    console.log('valDistMap::MapOverlayAdd', e);
}

export async function getDistributionLeafletOverlay(taxonName) {
    console.log('valDistMap::getDistribution', taxonName);
    if (!distMap) {
        distMap = await addDistMap();
    }
    let imageUrl = getImgSource(taxonName); //'https://maps.lib.utexas.edu/maps/historical/newark_nj_1922.jpg';
    let imageBounds = [[45.0, -73.6], [42.5, -71.5]];
    let options = {
        bounds: imageBounds
    }
 /*   
    if (distLay) {
        distLay.setUrl(imageUrl);
    } else {
        distLay = L.leafletGeotiff(imageUrl).addTo(distMap);    
        //distLay = L.imageOverlay(imageUrl, imageBounds).addTo(distMap);
    }
*/
    const windSpeedUrl = "http://localhost:8000/leaflet-geotiff-2/demo/wind_speed.tif";
  
    const plottyRenderer = L.LeafletGeotiff.plotty({
      displayMin: 0,
      displayMax: 10,
      clampLow: false,
      clampHigh: false,
    });
    const windSpeedLayer = L.leafletGeotiff(windSpeedUrl, {
      renderer: plottyRenderer,
    }).addTo(distMap);
}

export function getDistribution(taxonName, imagId, paraId) {
    let eleImg = document.getElementById(imagId);
    let elePrg = document.getElementById(paraId);
    if (eleImg) {
        eleImg.src = getImgSource(taxonName);
        eleImg.onerror = (err) => {
            console.log(`ERROR getDistribution ERROR`, err);
            eleImg.style.display='none';
            elePrg.style.display='block';
            elePrg.innerHTML = `VAL does not host Suitability/Distribution maps for "${taxonName}". 
            Either the available occurrence data is inadequate to generate them, or the queried
            name's taxonomic rank is not species.`;
        }
    }
}