/*
    Fetch a species distribution map file.
*/

import { fetchImgFile } from "./VAL_Web_Utilities/js/commonUtilities";

const imgFileUrl = `https://vtatlasoflife.org/species-profiles/`;

export async function fetchSpeciesDistMap(taxon=false) {
    return fetchImgFile(`${imgFileUrl}/${taxon.split(' ').join('_')}.tiff`, 'tiff');
}