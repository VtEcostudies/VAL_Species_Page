/*
    Fetch a species distribution map file.
*/

import { fetchImgFile } from "./VAL_Web_Utilities/js/commonUtilities.js";

const imgDistFileUrl = `https://vtatlasoflife.org/species_profiles/distributions`;

export async function fetchSpeciesDistMap(taxonName=false) {
    if (taxonName) {
        return await fetchImgFile(`${imgDistFileUrl}/${taxonName.split(' ').join('_')}.tif`, 'tiff');
    } else {
        console.log(`fetchSpeciesDistMap | No taxonName`);
        return null;
    }
}

export function getImgSource(taxonName=false) {
    let imgUrl = `${imgDistFileUrl}/${taxonName.split(' ').join('_')}.tif`;
    imgUrl = `http://localhost:8000/distributions/Zygnematophyceae_Zygnematales_Mesotaeniaceae_netrium_digitus.tif`;
    console.log(`fetchSpeciesDistMap::getImgSource | `, imgUrl);
    return imgUrl;
}