/*
    Fetch a species distribution map file.
*/

import { fetchImgFile } from "./VAL_Web_Utilities/js/commonUtilities.js";

const imgDistFileUrl = `https://vtatlasoflife.org/species_profiles/distribution-png`;

export async function fetchSpeciesDistMap(taxonName=false, xtn='png') {
    if (taxonName) {
        return await fetchImgFile(`${imgDistFileUrl}/${taxonName.split(' ').join('_')}.${xtn}`, xtn);
    } else {
        console.log(`fetchSpeciesDistMap | No taxonName`);
        return false;
    }
}

export async function checkSpeciesDistMap(taxonName=false, xtn='png') {
    fetch(`${imgDistFileUrl}/${taxonName.split(' ').join('_')}.${xtn}`, { method: "HEAD" })
        .then(res => {
            return res.ok ? true : false;
        })
        .catch(err => {
            console.log(`ERROR checkSpeciesDistMap ERROR`, err);
            return false;
        });
}

export function getImgSource(taxonName=false) {
    let imgUrl = `${imgDistFileUrl}/${taxonName.split(' ').join('_')}.png`;
    console.log(`fetchSpeciesDistMap::getImgSource | `, imgUrl);
    return imgUrl;
    checkSpeciesDistMap(taxonName, 'png')
        .then(res => {
            return res ? imgUrl : false;
        })
        .catch(err => {
            console.log(`ERROR getImgSource ERROR`, err);
            return false;
        })
}