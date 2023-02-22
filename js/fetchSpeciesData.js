import { fetchGoogleSheetData } from "./VAL_Web_Utilities/js/fetchGoogleSheetsData.js";

export var sheetVernacularNames; //store sheetVernacularNames for multi-use

//NOTE: These create a page-load delay. Re-factor these.
sheetVernacularNames = await getSheetVernaculars();

export async function getSheetVernaculars(sheetNumber=0) {
    try {
        let res = await fetchGoogleSheetData(defaultSheetIds.vernacular, sheetNumber);
        //console.log('getSheetVernaculars RESULT:', res);
        if (res.status > 299) {return res;}
        let name = [];
        res.rows.forEach((row,rid) => {
            //console.log('row:', rid);
            let data = {}
            /*
            Build a JSON object using headRow keys with eachRow values like {head[i]:row.value[i], head[i+1]:row.value[i+1], ...}
            */
            res.head.forEach((col,idx) => { //Asynchronous loop works here! This is better UX so use it.
            //for (var idx=0; idx<res.head.length; idx++) { let col = res.head[idx]; //synchronous loop works but delays page loading...
                let val = row.values[idx];
                //console.log('head:', idx, col.formattedValue);
                //console.log('col:', idx, val ? val.formattedValue : null);
                data[col.formattedValue] = val ? val.formattedValue : null;
            })
            //console.log(`Row ${rid} JSON:`, data);
            /*
                Now we have a JSON header-keyed row of data. Use specific keys to build a 2D Array of vernacular names like this:
                name[taxonId][0] = {head1:row1value1, head2:row1value2, ...}
                name[taxonId][1] = {head1:row2value1, head2:row2value2, ...}
                name[taxonId][N] = {head1:rowNvalue1, head2:rowNvalue2, ...}
            */
            if (name[data.taxonId]) { //We assume that if the 1st Dimension exists, the 2nd Dimension has been instantiated, as below.
                name[data.taxonId].push(data);
                //console.log('duplicate', name[data.taxonId]);
            } else {
                name[data.taxonId] = []; //We must instantiate a 2D array somehow before we push values on the the 1st Dimension
                name[data.taxonId][0] = data;
            }
        })
        //console.log('getSheetVernaculars 2D ARRAY', name);
        return name;
    } catch(err) {
        console.log(`getSheetVernaculars(${sheetNumber}) ERROR:`, err);
        return new Error(err)
    }
}
