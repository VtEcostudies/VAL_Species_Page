/*
- Show VT priority blocks on a map of VT
- Load a json array from static GBIF Occurrence datasets or a geoJson file and populate the map with point occurrence data
- How to pass parameters to a google form: https://support.google.com/a/users/answer/9308781?hl=en
- How to implement geojson-vt with Leaflet: https://stackoverflow.com/questions/41223239/how-to-improve-performance-on-inserting-a-lot-of-features-into-a-map-with-leafle
*/
import { occInfo, getOccsByFilters, getOccsFromFile, getGbifDatasetInfo, icons } from './fetchGbifOccs.js';
import { fetchJsonFile, parseCanonicalFromScientific } from './commonUtilities.js';
import { sheetSignUps, sheetVernacularNames } from './fetchGoogleSheetsData.js';
import { checklistVernacularNames } from './fetchGbifSpecies.js';
import { getWikiPage } from './wiki_page_data.js';

var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var vtAltCtr = [43.858297, -72.446594]; //VT border center for the speciespage view, where px bounds are small and map is zoomed to fit
var zoomLevel = 8;
var zoomCenter = vtCenter;
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cmTotal = {}; //a global total for cmLayer counts across species
var cgColor = {}; //object of colors for separate species layers
var cmColors = {0:"#800000",1:"green",2:"blue",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey"};
var cmRadius = zoomLevel/2;
var valMap = {};
var basemapLayerControl = false;
var boundaryLayerControl = false;
var groupLayerControl = false;
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
var geoGroup = false; //geoJson boundary group for ZIndex management
var occGroup = false; //geoJson occurrence group
var baseMapDefault = null;
var abortData = false;
var eleWait = document.getElementById("wait-overlay");
var geoJsonData = true;
var bindPopups = false;
var bindToolTips = false;
var iconMarkers = false;
//var sheetSignUps = []; //array of survey blocks that have been signed up
var signupStyle = {
  color: "black",
  weight: 1,
  fillColor: "green",
  fillOpacity: 0.5,
  disabled: true
}

//for standalone use
function addMap() {
    valMap = L.map('mapid', {
            zoomControl: false, //start with zoom hidden.  this allows us to add it below, in the location where we want it.
            center: vtAltCtr,
            zoom: 8,
            crs: L.CRS.EPSG3857 //have to do this to conform to USGS maps
        });

    new L.Control.Zoom({ position: 'bottomright' }).addTo(valMap);

    var attribLarge =  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    var attribSmall =  '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            '© <a href="https://www.mapbox.com/">Mapbox</a>';

    var mapBoxAccessToken = 'pk.eyJ1Ijoiamxvb21pc3ZjZSIsImEiOiJjanB0dzVoZ3YwNjlrNDNwYm9qN3NmNmFpIn0.tyJsp2P7yR2zZV4KIkC16Q';

    var streets = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapBoxAccessToken}`, {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.streets'
    });
    var satellite = L.tileLayer(`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${mapBoxAccessToken}`, {
        maxZoom: 20,
        attribution: attribSmall,
        id: 'mapbox.satellite'
    });

    var esriWorld = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.world ',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        id: 'esri.topo',
        maxZoom: 20,
        attribution: 'Tiles &copy; Esri' // &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
      });

    var openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        id: 'open.topo',
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      });

    baseMapDefault = esriTopo; //for use elsewhere, if necessary
    valMap.addLayer(baseMapDefault); //and start with that one

    if(basemapLayerControl === false) {
        basemapLayerControl = L.control.layers().addTo(valMap);
    }

    basemapLayerControl.addBaseLayer(streets, "Mapbox Streets");
    basemapLayerControl.addBaseLayer(satellite, "Mapbox Satellite");
    basemapLayerControl.addBaseLayer(esriWorld, "ESRI Imagery");
    basemapLayerControl.addBaseLayer(esriTopo, "ESRI Topo Map");
    basemapLayerControl.addBaseLayer(openTopo, "Open Topo Map");

    console.log('done adding basemaps');

    basemapLayerControl.setPosition("bottomright");

    valMap.on("zoomend", e => onZoomEnd(e));
    valMap.on("overlayadd", e => MapOverlayAdd(e));
}

/*
  Fired when an overlay is selected through a layer control. We send all overlays
  to the back so that point markers remain clickable, in the foreground.
*/
function MapOverlayAdd(e) {
  //console.log('MapOverlayAdd', e.layer.options.name);
  if (typeof e.layer.bringToBack === 'function') {e.layer.bringToBack();} //push the just-added layer to back
  geoGroup.eachLayer(layer => {
    console.log(`MapOverlayAdd found GeoJson layer:`, layer.options.name);
    if (layer.options.name != e.layer.options.name) {
      layer.bringToBack(); //push other overlays to back
    }
  })
}

function onZoomEnd(e) {
  zoomLevel = valMap.getZoom();
  zoomCenter = valMap.getCenter();
  //SetEachPointRadius();
}

async function zoomVT() {
  geoGroup.eachLayer(layer => {
    if ('State'==layer.options.name) {
      console.log('zoomVT found GeoJson layer', layer.options.name);
      valMap.fitBounds(layer.getBounds());
    }
  })
}

/*
  Add boundaries to map with their own control.
*/
async function addBoundaries(layerPath=false, layerName=false, layerId=9) {

    if (boundaryLayerControl === false) {
        boundaryLayerControl = L.control.layers().addTo(valMap);
    } else {
        console.log('boundaryLayerControl already added.')
        return;
    }
    boundaryLayerControl.setPosition("bottomright");

    geoGroup = new L.FeatureGroup();
    addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State", 0, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "Counties", 1, boundaryLayerControl, geoGroup, !layerPath);
    addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Towns", 2, boundaryLayerControl, geoGroup);
    addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", 3, boundaryLayerControl, geoGroup);

    if (layerPath) {
      addGeoJsonLayer(layerPath, layerName, layerId, boundaryLayerControl, geoGroup, true);
    }
  }

async function addGeoJsonLayer(file="test.geojson", layerName="Test", layerId = 0, layerControl=null, layerGroup=null, addToMap=false, featrFunc=onGeoBoundaryFeature, styleFunc=onGeoBoundaryStyle) {
  try {
    let json = await fetchJsonFile(file);
    let layer = await L.geoJSON(json, {
      onEachFeature: featrFunc,
      style: styleFunc,
      name: layerName, //IMPORTANT: this used to compare layers at ZIndex time
      id: layerId
    });
    if (addToMap) {layer.addTo(valMap); layer.bringToBack();}
    if (layerControl) {layerControl.addOverlay(layer, layerName);}
    if (layerGroup) {layerGroup.addLayer(layer);}
    return layer;
  } catch(err) {
    console.log('addGeoJsonLayer ERROR', file, err);
  }
}

function onGeoBoundaryFeature(feature, layer) {
  layer.on('mousemove', function (event) {
    if (feature.properties) {
      var obj = feature.properties;
      var tips = '';
      for (var key in obj) { //iterate over feature properties
        switch(key.toLowerCase()) {
          case 'cntyname':
          case 'townname':
          case 'blockname':
            tips = `${obj[key]}<br>`;
            break;
        }
      }
      if (tips) {layer.bindTooltip(tips).openTooltip();}
    }
  });
  layer.on('click', async function (event) {
      //console.log('click | event', event, '| layer', layer);
      //console.log('onGeoBoundaryFeature::layer.onClick | layer.getBounds:', layer.getBounds());
      //console.log('onGeoBoundaryFeature::layer.onClick | feature.properties:', feature.properties);
      //console.log('onGeoBoundaryFeature::layer.onClick | feature.geometry:', feature.geometry);
      valMap.fitBounds(layer.getBounds()); //applies to all layers
      if (9 == layer.options.id) { //VT Butterfly Atlas
        var pops;
        var name = feature.properties.BLOCKNAME;
        var link = feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
        if (feature.properties.BLOCK_TYPE=='PRIORITY') {
          pops = `<b><u>BUTTERFLY ATLAS PRIORITY BLOCK</u></b></br></br>`;
        } else {
          pops = `<b><u>BUTTERFLY ATLAS SURVEY BLOCK</u></b></br></br>`;
        }
        //figure out if block has been chosen already
        let type = feature.geometry.type; //this is MULTIPOLYGON, which I think GBIF can't handle
        let cdts = feature.geometry.coordinates[0][0];
        let gWkt = 'POLYGON((';
        //console.log('feature.geometry.coordinates[0][0]', cdts)
        for (var i=0; i<cdts.length; i++) {
          //console.log(`feat.geom.cdts[0][0][${i}]`, cdts[i]);
          gWkt += `${cdts[i][0]} ${cdts[i][1]},`;
        }
        gWkt = gWkt.slice(0,-1) + '))';
        //console.log('WKT Geometry:', gWkt);
        if (feature.properties.BLOCK_TYPE=='PRIORITY') {
          pops += `<a target="_blank" href="https://s3.us-west-2.amazonaws.com/val.surveyblocks/${link}.pdf">Get <b>BLOCK MAP</b> for ${name}</a></br></br> `;
        }
        if (sheetSignUps[link]) {  
          pops += `Survey block was chosen by <b>${sheetSignUps[link].first} ${sheetSignUps[link].last}</b> on ${sheetSignUps[link].date}</br></br>`;
        } else {
          pops += `<a target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSegdid40-VdB_xtGvHt-WIEWR_TapHnbaxj-LJWObcWrS5ovg/viewform?usp=pp_url&entry.1143709545=${link}"><b>SIGN-UP</b> for ${name}</a></br></br>`;
        }
        pops += `<a target="_blank" href="vba_species_list.html?block=${name}&geometry=${gWkt}">Get <b>SPECIES LIST</b> for ${name}</a></br>`;
        if (pops) {layer.bindPopup(pops).openPopup();}
      }
    });
}

/*
  Callback function to set style of added geoJson overlays on the Boundary Layer Control
*/
function onGeoBoundaryStyle(feature) {
  if (feature.properties.BLOCK_TYPE) {
    let style;
    switch(feature.properties.BLOCK_TYPE) {
      case 'PRIORITY1':
        style = {color:"black", weight:1, fillOpacity:0.2, fillColor:"red"};
        break;
      case 'PRIORITY':
        style = {color:"black", weight:1, fillOpacity:0.2, fillColor:"yellow"};
        break;
      case 'NONPRIOR':
        style = {color:"black", weight:1, fillOpacity:0.0, fillColor:"blue"};
        break;
    }
    //Check the signup array to see if block was chosen
    let blockName = feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
    if (sheetSignUps[blockName]) {
      console.log(`onGeoBoundaryStyle | Found Block Signup for`, blockName);
      style = signupStyle;
    }
    return style;
  } else {
    if (feature.properties.BIOPHYSRG1) { //biophysical regions
      return {color:"red", weight:1, fillOpacity:0.1, fillColor:"red"};
    } else if (feature.properties.CNTYNAME) { //counties
      return {color:"yellow", weight:1, fillOpacity:0.1, fillColor:"yellow"};
    } else if (feature.properties.TOWNNAME) { //towns
      return {color:"blue", weight:1, fillOpacity:0.1, fillColor:"blue"};
    } else {
      return {color:"black", weight:1, fillOpacity:0.1, fillColor:"black"};
    }
  }
}

/*
  Add geoJson occurrences to map with their own layer control
*/
async function addGeoJsonOccurrences(dataset='test', layerId=0) {
  let grpName = occInfo[dataset].description;
  let idGrpName = grpName.split(' ').join('_');

  eleWait.style.display = "block";

  if (groupLayerControl === false) {
    console.log('Adding groupLayerControl to map.')
    groupLayerControl = L.control.layers().addTo(valMap);
  } else {
      console.log('groupLayerControl already added.')
  }
  groupLayerControl.setPosition("bottomright");

  occGroup = new L.FeatureGroup();
  
  console.log('addGeoJsonOccurrences adding', dataset, occInfo[dataset].geoJson);

  try {
    let json = await fetchJsonFile(`${occInfo[dataset].geoJson}`);
    let layer = await L.geoJSON(json, {
      pointToLayer: function(feature, latlng) {
        if (iconMarkers) {
          let options = {
            icon: occInfo[dataset].icon
          }
          return L.marker(latlng, options);
        } else {
          let options = {
            radius: 5,
            fillColor: occInfo[dataset].color,
            color: 'Black',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.3
          }
          return L.circleMarker(latlng, options);
        };      
      },
      onEachFeature: onEachGeoOccFeature,
      name: occInfo[dataset].description,
      id: layerId
    }).addTo(valMap);
    occGroup.addLayer(layer);
    cmGroup[grpName] = occGroup;
    cmCount[grpName] = json.features.length;
    cmTotal[grpName] = json.features.length;
    groupLayerControl.addOverlay(layer, `<label id="${idGrpName}">${grpName} (${cmCount[grpName]}/${cmTotal[grpName]})</label>`);
    eleWait.style.display = "none";
  } catch(err) {
    console.log('Error loading file', occInfo[dataset].geoJson, err);
    eleWait.style.display = "none";
    //alert(err.message);
  }
}

function geoJsonMarker(feature, latlng) {
  let marker;
  if (iconMarkers) {
    options = {
      icon: groupIcon ? groupIcon : icons.square
    }
  } else {
    options = {
      radius: 5,
      fillColor: occInfo[dataset].color,
      color: 'Black',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.5
    }
    return L.circleMarker(latlng, options);
  };
}

/*
  Handle mouse events on geoJson Occurrence layers
*/
function onEachGeoOccFeature(feature, layer) {

  layer.on('click', async function (event) {
    var popup = L.popup({
      maxHeight: 200,
      keepInView: true
      })
      .setContent(await occurrencePopupInfo(feature.properties))
      .setLatLng(L.latLng(feature.properties.decimalLatitude, feature.properties.decimalLongitude))
      .openOn(valMap);
    });

  layer.on('mousemove', function (event) {
    //console.log('onEachGeoOccFeature mousemove', event);
  } );
}

function getIntersectingFeatures(e) {
  var clickBounds = L.latLngBounds(e.latlng, e.latlng);
  var lcnt = 0;
  var fcnt = 0;
  var feat = {};

  var intersectingFeatures = [];
  for (var l in valMap._layers) {
    lcnt++;
    var overlay = valMap._layers[l];
    if (overlay._layers) {
      for (var f in overlay._layers) {
        fcnt++;
        var feature = overlay._layers[f];
        var bounds;
        if (feature.getBounds) {
          bounds = feature.getBounds();
        } else if (feature._latlng) {
          bounds = L.latLngBounds(feature._latlng, feature._latlng);
        } else {;}
        if (bounds && clickBounds.intersects(bounds)) {
          var id = `${feature._leaflet_id}`;
          //console.log(`feature._leaflet_id:`,feature._leaflet_id, feat, feat[id]);
          if (feat[id]) {
              //console.log('skipping', feat);
            } else {
              //console.log(`adding`, feat);
              intersectingFeatures.push(feature);
              feat[id] = true;
            }
        }
      }
    }
  }
  console.log(`getIntersectingFeatures | layers: ${lcnt} | features: ${fcnt} | _leaflet_ids:`, feat);
  console.log('intersectingFeatures:', intersectingFeatures);
  var html = null;
  if (intersectingFeatures.length) {
    // if at least one feature found, show it
    html = `<u>Found ${intersectingFeatures.length} features</u><br/>`;
    intersectingFeatures.forEach((ele,idx,arr) => {
      if (ele.defaultOptions && ele.defaultOptions.name) {
        html += ele.defaultOptions.name + ': ';
      }
      if (ele.feature && ele.feature.properties && ele.feature.properties.BLOCKNAME) {html += ele.feature.properties.BLOCKNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.TOWNNAME) {html += ele.feature.properties.TOWNNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.CNTYNAME) {html += ele.feature.properties.CNTYNAME}
      if (ele.feature && ele.feature.properties && ele.feature.properties.name) {html += ele.feature.properties.name}
      html += '<br/>';
    })
  }
  return html;
}

/*
  Handle a click on an occurrence marker. This is done to avoid hanging a popup on each point to improve performance.
  There is a performance hit, still, because we have to hang popup data on the marker when it's created.
*/
async function markerOnClick(e) {
  //console.log('markerOnClick e.latlng:', e.latlng, e.target.options);
  //console.log('markerOnClick e.target.options:', e.target.options);

  var popup = L.popup({
    maxHeight: 200,
    keepInView: true
    })
    .setContent(await occurrencePopupInfo(e.target.options))
    .setLatLng(e.latlng)
    .openOn(valMap);
}

/*
  This is partially refactored for larger datasets:
  - don't hang tooltips on each point
  - don't hang popup on each point
  - externally, reduce dataset size by removing unnecessary columns
*/
async function addOccsToMap(occJsonArr=[], groupField='datasetKey', groupIcon, groupColor='Red') {
  let sciName;
  let canName;
  cmTotal[groupField] = 0;
  if (!occJsonArr.length) return;
  eleWait.style.display = "block";
  //for (var i = 0; i < occJsonArr.length; i++) {var occJson = occJsonArr[i]; //synchronous loop
  occJsonArr.forEach(async occJson => { //asynchronous loop
      let grpName = groupField; //begin by assigning all occs to same group
      if (occJson[groupField]) {grpName = occJson[groupField];} //if the dataset has groupField, get the value of the json element for this record...
      let idGrpName = grpName.split(' ').join('_');
      if (typeof cmCount[grpName] === 'undefined') {cmCount[grpName] = 0;}
      cmTotal[grpName]++;

      sciName = occJson.scientificName;
      canName = parseCanonicalFromScientific(occJson);
      if (canName) {sciName = canName;}

      //filter out records without lat/lon location
      //ToDo: Add these to a common, random lat/lon in VT so they show up on the map?
      if (!occJson.decimalLatitude || !occJson.decimalLongitude) {
        if (typeof cmCount['missing'] === 'undefined') {cmCount['missing'] = 0;}
        cmCount['missing']++;
        let gbifID = occJson.key ? occJson.key : occJson.gbifID;
        //console.log('WARNING: Occurrence Record without Lat/Lon values:', gbifID, 'missing:', cmCount['missing'], 'count:', cmTotal[grpName]);
        //continue;
        return;
      }

      var llLoc = L.latLng(occJson.decimalLatitude, occJson.decimalLongitude);
      cmCount[grpName]++; //count occs having location data

      if (iconMarkers) {
        var marker = L.marker(llLoc, {
          icon: groupIcon ? groupIcon : icons.square
        })
      } else {
        var marker = L.circleMarker(llLoc, {
            fillColor: groupColor, //interior color
            fillOpacity: 0.5, //values from 0 to 1
            color: "black", //border color
            weight: 1, //border thickness
            radius: cmRadius
        })
      }

      if (bindPopups) {
        var popup = L.popup({
            maxHeight: 200,
            keepInView: true,
        }).setContent(await occurrencePopupInfo(occJson));
        marker.bindPopup(popup);
      } else {
        if (occJson.gbifID) marker.options.gbifID = occJson.gbifID;
        if (occJson.scientificName) marker.options.scientificName = occJson.scientificName;
        if (occJson.decimalLatitude) marker.options.decimalLatitude = occJson.decimalLatitude;
        if (occJson.decimalLongitude) marker.options.decimalLongitude = occJson.decimalLongitude;
        if (occJson.eventDate) marker.options.eventDate = occJson.eventDate;
        if (occJson.basisOfRecord) marker.options.basisOfRecord = occJson.basisOfRecord;
        if (occJson.recordedBy) marker.options.recordedBy = occJson.recordedBy;
        if (occJson.datasetName) marker.options.datasetName = occJson.datasetName;
        if (occJson.datasetKey) marker.options.datasetKey = occJson.datasetKey;
        if (occJson.taxonKey) marker.options.taxonKey = occJson.taxonKey;
        marker.options.canonicalName = canName ? canName : occJson.scientificName;
        marker.on('click', markerOnClick);
      }
      if (bindToolTips) {
        if (occJson.eventDate) {
          marker.bindTooltip(`${sciName}<br>${moment(occJson.eventDate).format('YYYY-MM-DD')}`);
        } else {
          marker.bindTooltip(`${sciName}<br>No date supplied.`);
        }
      }

      if (typeof cmGroup[grpName] === 'undefined') {
        console.log(`cmGroup[${grpName}] is undefined...adding.`);
        cmGroup[grpName] = L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated from API
        if (groupLayerControl) {
          groupLayerControl.addOverlay(cmGroup[grpName], `<label id="${idGrpName}">${grpName}</label>`);
        } else {
          groupLayerControl = L.control.layers().addTo(valMap);
          groupLayerControl.setPosition("bottomright");
          groupLayerControl.addOverlay(cmGroup[grpName], `<label id="${idGrpName}">${grpName}</label>`);
        }
      
        cmGroup[grpName].addLayer(marker); //add this marker to the current layerGroup, which is an object with possibly multiple layerGroups by sciName
      } else {
        cmGroup[grpName].addLayer(marker); //add this marker to the current layerGroup, which is an object with possibly multiple layerGroups by sciName
      }
    } //end for-loop
    )
  if (document.getElementById("jsonResults")) {
      document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
  }

  //cmGroup's keys are sciNames or dataset descriptions
  //each layer's control label's id=idGrpName has spaces replaced with underscores
  var id = null;
  Object.keys(cmGroup).forEach((grpName) => {
    let idGrpName = grpName.split(' ').join('_');
    if (document.getElementById(idGrpName)) {
        console.log(`-----match----->> ${idGrpName} | ${grpName}`, cmCount[grpName], cmTotal[grpName]);
        document.getElementById(idGrpName).innerHTML = `${grpName} (${cmCount[grpName]}/${cmTotal[grpName]})`;
    }
  });
  eleWait.style.display = "none";
}

async function occurrencePopupInfo(occRecord) {
    var info = '';

    Object.keys(occRecord).forEach(function(key) {
        switch(key) {
            case 'raw_institutionCode':
                if ('iNaturalist' == occRecord[key]) {
                    info += `<a href="https://www.inaturalist.org/observations/${occRecord.occurrenceID}" target="_blank">iNaturalist Observation ${occRecord.occurrenceID} </a><br/>`;
                } else {
                    info += `Institution: ${occRecord[key]}<br/>`;
                }
                break;
            case 'gbifID':
            case 'key':
                info += `<a href="https://www.gbif.org/occurrence/${occRecord[key]}" target="_blank">GBIF Occurrence Record </a><br/>`;
                break;
            case 'decimalLatitude':
                info += `Lat: ${occRecord[key]}<br/>`;
                break;
            case 'decimalLongitude':
                info += `Lon: ${occRecord[key]}<br/>`;
                break;
            case 'scientificName':
                info += `Scientific Name: ${occRecord[key]}<br/>`;
                break;
            case 'vernacularName':
              //info += `Common Name: ${occRecord[key]}<br/>`; //don't use GBIF occurrence vernacularName. see below.
              break;
            case 'collector':
              info += `Collector: ${occRecord[key]}<br/>`;
              break;
            case 'recordedBy':
                info += `Recorded By: ${occRecord[key]}<br/>`;
                break;
            case 'basisOfRecord':
                info += `Basis of Record: ${occRecord[key]}<br/>`;
                break;
            case 'eventDate':
                //var msecs = occRecord[key]; //epoch date in milliseconds at time 00:00
                //info += `Event Date: ${getDateMMMMDoYYYY(msecs)}<br/>`; //this for json occurrences (from eg. GBIF API)
                info += `Event Date: ${moment(occRecord[key]).format('YYYY-MM-DD')}<br/>`; //this for geoJson occurrences
                break;
            case 'datasetName':
                info += `Dataset Name: ${occRecord[key]}<br/>`;
                break;
            default: //un-comment this to list all properties
                //info += `${key}: ${occRecord[key]}<br/>`;
            }
        });
        try {
          //1. Don't use vernacularName from GBIF record. Use VAL checklist data or VAL Google sheet vernacularNames
          console.log(`occurrencePopupInfo | Occurrence vernacularName:`, occRecord.vernacularName, '| taxonKey:', occRecord.taxonKey);
          console.log(`occurrencePopupInfo | Butterfly Checklist vernacularNames:`, checklistVernacularNames[occRecord.taxonKey]);
          console.log(`occurrencePopupInfo | Google Sheet vernacularNames:`, sheetVernacularNames[occRecord.taxonKey]);
          if (checklistVernacularNames[occRecord.taxonKey]) {
            info += `Common Name: ${checklistVernacularNames[occRecord.taxonKey] ? checklistVernacularNames[occRecord.taxonKey][0].vernacularName : ''}<br/>`
          } else if (sheetVernacularNames[occRecord.taxonKey]) {
            info += `Common Name: ${sheetVernacularNames[occRecord.taxonKey] ? sheetVernacularNames[occRecord.taxonKey][0].vernacularName : ''}<br/>`
          }
          //2. If no datasetName but yes datasetKey, call GBIF API for datasetName
          if (occRecord.datasetKey && !occRecord.datasetName) {
            let dst = await getGbifDatasetInfo(occRecord.datasetKey);
            info += `Dataset: <a href="https://gbif.org/dataset/${occRecord.datasetKey}">${dst.title}<br/></a>`;
          }
          //3. If no canonicalName parse canonicalName and call Wikipedida API
          console.log(`occurrencePopupInfo | canonicalName:`, occRecord.canonicalName, '| taxonRank:', occRecord.taxonRank);
          let canName = false;
          if (occRecord.canonicalName) {canName = occRecord.canonicalName;}
          else if (occRecord.taxonRank) {canName = parseCanonicalFromScientific(occRecord);}
          if (canName) {
            let wik = await getWikiPage(canName);
            if (wik.thumbnail) {
              info += `<a target="_blank" href="${wik.originalimage.source}"><img src="${wik.thumbnail.source}" width="50" height="50"><br/></a>`;
            }
          }
        } catch(err) {
          console.log(`occurrencePopupInfo::getWikiPage ERROR:`, err);
        }
    return info;
}

//iterate through all plotted pools in each featureGroup and alter each radius
function SetEachPointRadius(radius = cmRadius) {
  cmRadius = Math.floor(zoomLevel/2);

/*
  Object.keys(cmGroup).forEach((name) => {
    cmGroup[name].eachLayer((cmLayer) => {
      if (cmLayer instanceof L.circleMarker) {
        cmLayer.setRadius(radius);
        cmLayer.bringToFront(); //this works, but only when this function is called
      }
    });
  });
*/
}

//standalone module usage
function initGbifStandalone(layerPath=false, layerName, layerId) {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries(layerPath, layerName, layerId);}
}

/*
  Deprecated in favor of file-scope variable 'sheetSignUps'
  All we need to do now is to call putSignups. 
*/
async function getSurveyBlockData() {
  //get an array of sheetSignUps by blockname with name and date
  sheetSignUps = await getSignups();
  console.log('getSurveyBlockData', sheetSignUps);
  putSignups(sheetSignUps);
}

function putSignups(sign) {
  geoGroup.eachLayer(layer => {
    console.log(`putSignups found GeoJson layer:`, layer.options.name);
    if ('Survey Blocks'==layer.options.name) {
      layer.eachLayer(subLay => {
        let blockName = subLay.feature.properties.BLOCKNAME.replace(/( - )|\s+/g,'').toLowerCase();
        if (sign[blockName]) {
          console.log(`putSignups found block signup for`, blockName);
          subLay.setStyle(signupStyle)
        }
      })
    }
  })
}

if (document.getElementById("valSurveyBlocksVBA")) {
  let layerPath = 'geojson/surveyblocksWGS84_orig.geojson';
  let layerName = 'Survey Blocks';
  let layerId = 9;
  initGbifStandalone(layerPath, layerName, layerId);
  //getSurveyBlockData();
  putSignups(sheetSignUps);
}

async function getLiveData(dataset='vba2') {
  let page = {};
  let lim = 300;
  let off = 0;
  let max = 1000;
  do {
    page = await getOccsByFilters(off, lim);
    addOccsToMap(page.results, occInfo[dataset].description, occInfo[dataset].icon, occInfo[dataset].color);
    off += lim;
  } while (!page.endOfRecords && !abortData && off<max);
}

async function getJsonFileData(dataset='vba1') {
  let occF = await getOccsFromFile(dataset);
  addOccsToMap(occF.rows, occInfo[dataset].description, occInfo[dataset].icon, occInfo[dataset].color);
}

function showUrlInfo(dataset='vba1') {
  if (document.getElementById("urlInfo")) {
    document.getElementById("urlInfo").innerHTML += `<a target="_blank" href="./${occInfo[dataset].file}">${occInfo[dataset].description}</a></br>`;
  }
}

/*
 * Clear any markers from the map
 */
function clearData() {
  cmCount['all'] = 0;
  //remove all circleMarkers from each group by clearing the layer
  Object.keys(cmGroup).forEach((key) => {
      console.log(`Clear layer '${key}'`);
      cmGroup[key].clearLayers();
      console.log(`Remove control layer for '${key}'`);
      if (groupLayerControl) groupLayerControl.removeLayer(cmGroup[key]);
      delete cmGroup[key];
      delete cmCount[key];
      delete cmTotal[key];
      delete cgColor[key];
  });
  
  console.log(`Remove group layer control from map`);
  if (groupLayerControl) {valMap.removeControl(groupLayerControl);}
  groupLayerControl = false;
}

async function clearDataSet(dataset=false) {
  if (!dataset) return;

  let key = occInfo[dataset].description;
  delete cmGroup[key];
  delete cmCount[key];
  delete cmTotal[key];
  delete cgColor[key];
  if (groupLayerControl) await groupLayerControl.removeLayer(cmGroup[key]);
}

function addMapCallbacks() {
    valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });
}
function abortDataLoad() {
  console.log('abortDataLoad request received.');
  abortData = true;
}
if (document.getElementById("zoomVT")) {
  document.getElementById("zoomVT").addEventListener("click", async () => {
    eleWait.style.display = 'block';
    await zoomVT();
    eleWait.style.display = 'none';
  });
}
//dataType
if (document.getElementById("dataType")) {
  let eleType = document.getElementById("dataType");
  geoJsonData = eleType.checked;
  eleType.addEventListener("click", () => {
    geoJsonData = eleType.checked;
    console.log('dataType Click', eleType.checked, geoJsonData);
  });
}
//iconMarkers
if (document.getElementById("iconMarkers")) {
  let eleIcon = document.getElementById("iconMarkers");
  eleIcon.addEventListener("click", () => {
    iconMarkers = eleIcon.checked;
    console.log('dataType Click', eleIcon.checked, iconMarkers);
  });
}
if (document.getElementById("getVtb1")) {
  document.getElementById("getVtb1").addEventListener("click", async () => {
    abortData = false;
    let dataset = 'vtb1';
    let grpName = occInfo[dataset].description;
    console.log('LOAD VTB1', grpName, cmGroup[grpName], cmGroup)
    if (cmGroup[grpName]) {
      alert('Dataset already loaded.');
    } else {
      if (geoJsonData) {addGeoJsonOccurrences(dataset);
      } else {getJsonFileData(dataset);}
    }
  });
}
if (document.getElementById("getVtb2")) {
  document.getElementById("getVtb2").addEventListener("click", () => {
    abortData = false;
    let dataset = 'vtb2';;
    let grpName = occInfo[dataset].description;
    if (cmGroup[grpName]) {
      alert('Dataset already loaded.');
    } else {
      if (geoJsonData) {addGeoJsonOccurrences(dataset);
      } else {getJsonFileData(dataset);}
    }
  });
}
if (document.getElementById("getVba1")) {
  document.getElementById("getVba1").addEventListener("click", () => {
    abortData = false;
    let dataset = 'vba1';
    let grpName = occInfo[dataset].description;
    if (cmGroup[grpName]) {
      alert('Dataset already loaded.');
    } else {
      if (geoJsonData) {addGeoJsonOccurrences(dataset);
      } else {getJsonFileData(dataset);}
    }
  });
}
if (document.getElementById("getVba2")) {
  document.getElementById("getVba2").addEventListener("click", () => {
    abortData = false;
    let dataset = 'vba2';
    let grpName = occInfo[dataset].description;
    if (cmGroup[grpName]) {
      alert('Dataset already loaded.');
    } else {
      if (geoJsonData) {addGeoJsonOccurrences(dataset);
      } else {getJsonFileData(dataset);}
    }
  });
}
if (document.getElementById("getTest")) {
  document.getElementById("getTest").addEventListener("click", () => {
    abortData = false;
    let dataset = 'test';
    if (geoJsonData) {addGeoJsonOccurrences(dataset);
    } else {getJsonFileData(dataset);}
  });
}
if (document.getElementById("clearData")) {
  document.getElementById("clearData").addEventListener("click", () => {
    abortData = false;
    clearData();
  });
}
if (document.getElementById("abortData")) {
  document.getElementById("abortData").addEventListener("click", () => {
      abortData = true;
  });
}
if (document.getElementById("test")) {
  document.getElementById("test").addEventListener("click", () => {
    //getSurveyBlockData();
    console.log("test button click.");
    putSignups(sheetSignUps);
  });
}
