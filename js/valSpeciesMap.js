/*
  Load a json array from GBIF Occurrence API and populate the map with point occurrence data.
*/
import { parseCanonicalFromScientific } from "../../VAL_Web_Utilities/js/commonUtilities.js";
import { getGbifDatasetInfo, getOccsByNameAndLocation } from "../../VAL_Web_Utilities/js/fetchGbifOccs.js";
import { getWikiPage } from '../../VAL_Web_Utilities/js/wikiPageData.js';

const fmt = new Intl.NumberFormat(); //use this to format nubmers like fmt.format(value)
var vceCenter = [43.6962, -72.3197]; //VCE coordinates
var vtCenter = [43.916944, -72.668056]; //VT geo center, downtown Randolph
var vtAltCtr = [43.858297, -72.446594]; //VT border center for the speciespage view, where px bounds are small and map is zoomed to fit
var mapCenter = vtAltCtr;
var zoomLevel = 8;
var zoomCenter = mapCenter;
var cmGroup = {}; //object of layerGroups of different species' markers grouped into layers
var cmCount = {}; //a global counter for cmLayer array-objects across mutiple species
var cmTotal = {}; //a global total for cmLayer counts across species
var cgColor = {}; //object of colors for separate species layers
var cgShape = {}; //object of colors for separate species layers
var cgColors = {0:"red",1:"blue",2:"green",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey",8:"violet",9:"greenyellow"};
var cgShapes = {0:"round",1:"square",2:"triangle",3:"diamond",4:"star"};//,5:"oval"};
var colrIndx = 0;
var shapIndx = 0;
var cmRadius = zoomLevel/2;
var valMap = {};
var basemapLayerControl = false;
var boundaryLayerControl = false;
var speciesLayerControl = false;
var xhrRecsPerPage = 300; //the number of records to load per ajax request.  more is faster.
var totalRecords = 0;
var vtWKT = "POLYGON((-73.3427 45.0104,-73.1827 45.0134,-72.7432 45.0153,-72.6100 45.0134,-72.5551 45.0075,-72.4562 45.0090,-72.3113 45.0037,-72.0964 45.0066,-71.9131 45.0070,-71.5636 45.0138,-71.5059 45.0138,-71.5294 44.9748,-71.4949 44.9123,-71.5567 44.8296,-71.6281 44.7506,-71.6061 44.7077,-71.5677 44.6481,-71.5388 44.5817,-71.6006 44.5533,-71.5746 44.5308,-71.5883 44.4955,-71.6556 44.4504,-71.7146 44.4093,-71.7957 44.3975,-71.8163 44.3563,-71.8698 44.3327,-71.9138 44.3484,-71.9865 44.3386,-72.0346 44.3052,-72.0428 44.2432,-72.0662 44.1930,-72.0360 44.1349,-72.0580 44.0698,-72.1101 44.0017,-72.0937 43.9671,-72.1252 43.9088,-72.1733 43.8682,-72.1994 43.7899,-72.1994 43.7899,-72.2392 43.7384,-72.3010 43.7056,-72.3271 43.6391,-72.3436 43.5893,-72.3793 43.5814,-72.3972 43.5027,-72.3807 43.4988,-72.3999 43.4150,-72.4123 43.3601,-72.3903 43.3591,-72.4081 43.3282,-72.3999 43.2762,-72.4370 43.2342,-72.4493 43.1852,-72.4480 43.1311,-72.4507 43.0679,-72.4438 43.0067,-72.4699 42.9846,-72.5276 42.9645,-72.5331 42.8951,-72.5633 42.8639,-72.5098 42.7863,-72.5166 42.7652,-72.4741 42.7541,-72.4590 42.7289,-73.2761 42.7465,-73.2912 42.8025,-73.2850 42.8357,-73.2678 43.0679,-73.2472 43.5022,-73.2561 43.5615,-73.2939 43.5774,-73.3049 43.6271,-73.3557 43.6271,-73.3976 43.5675,-73.4326 43.5883,-73.4285 43.6351,-73.4079 43.6684,-73.3907 43.7031,-73.3516 43.7701,-73.3928 43.8207,-73.3832 43.8533,-73.3969 43.9033,-73.4086 43.9365,-73.4134 43.9795,-73.4381 44.0427,-73.4141 44.1058,-73.3928 44.1921,-73.3427 44.2393,-73.3186 44.2467,-73.3406 44.3484,-73.3385 44.3690,-73.2946 44.4328,-73.3296 44.5367,-73.3832 44.5919,-73.3770 44.6569,-73.3681 44.7477,-73.3317 44.7857,-73.3324 44.8043,-73.3818 44.8398,-73.3564 44.9040,-73.3392 44.9181,-73.3372 44.9643,-73.3537 44.9799,-73.3447 45.0046,-73.3447 45.0109,-73.3426 45.0104,-73.3427 45.0104))";
var stateLayer = false;
var countyLayer = false;
var townLayer = false;
var bioPhysicalLayer = false;
var geoGroup = false; //geoJson boundary group for ZIndex management
var testData = false //flag to enable test data for development and debugging
var showAccepted = 0; //flag to show taxa by acceptedScientificName instead of scientificName
var baseMapDefault = null;
var gadmGidVt = 'USA.46_1';
var taxaBreakout = false; //flag to break sub-taxa into separate layers with counts.
var clusterMarkers = false;
var iconMarkers = false;
var abortData = false; //make this global so we can abort a data request
var nameType = 0; //0=scientificName, 1=commonName
var mapId = 'valMap';

//for standalone use
function addMap() {
    valMap = L.map(mapId, {
            zoomControl: false, //start with zoom hidden.  this allows us to add it below, in the location where we want it.
            center: mapCenter,
            zoom: zoomLevel
        });

    new L.Control.Zoom({ position: 'bottomleft' }).addTo(valMap);

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

    var googleSat = L.tileLayer("https://{s}.google.com/vt/lyrs=s,h&hl=tr&x={x}&y={y}&z={z}", {
        id: 'google.satellite', //illegal property
        name: 'Google Satellite +', //illegal property
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        zIndex: 0,
        maxNativeZoom: 20,
        maxZoom: 20
      });

    baseMapDefault = esriTopo; //for use elsewhere, if necessary
    valMap.addLayer(baseMapDefault); //and start with that one

    if(basemapLayerControl === false) {
      //basemapLayerControl = L.control.layers().addTo(valMap);
      basemapLayerControl = L.control.layers();
    }

    basemapLayerControl.addBaseLayer(streets, "Mapbox Streets");
    basemapLayerControl.addBaseLayer(satellite, "Mapbox Satellite");
    basemapLayerControl.addBaseLayer(esriWorld, "ESRI Imagery");
    basemapLayerControl.addBaseLayer(esriTopo, "ESRI Topo Map");
    basemapLayerControl.addBaseLayer(googleSat, "Google Satellite+");

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
  if (geoGroup) {
    if (typeof e.layer.bringToBack === 'function') {e.layer.bringToBack();} //push the just-added layer to back
    geoGroup.eachLayer(layer => {
      //console.log('geoGroup', layer.options.name);
      if (layer.options.name != e.layer.options.name) {
        layer.bringToBack(); //push other overlays to back
      }
    })
  }
}

function onZoomEnd(e) {
  zoomLevel = valMap.getZoom();
  zoomCenter = valMap.getCenter();
  //SetEachPointRadius();
}

async function zoomVT() {
  if (geoGroup) {
    geoGroup.eachLayer(async layer => {
      if ('State'==layer.options.name) {
        console.log('zoomVT found GeoJson layer', layer.options.name);
        valMap.fitBounds(layer.getBounds());
      }
    })
  } else {
    valMap.setView(L.latLng(mapCenter), 8);
  }
}

// Add boundaries to map and control.
async function addBoundaries() {

    if (boundaryLayerControl === false) {
        //boundaryLayerControl = L.control.layers().addTo(valMap);
        boundaryLayerControl = L.control.layers();
    } else {
        console.log('boundaryLayerControl already added.')
        return;
    }
    //boundaryLayerControl.setPosition("bottomright");

    console.log("addBoundaries (geoJson) ...");
  try {
      geoGroup = new L.FeatureGroup();
      addGeoJsonLayer('geojson/Polygon_VT_State_Boundary.geojson', "State", 0, boundaryLayerControl, geoGroup);
      addGeoJsonLayer('geojson/Polygon_VT_County_Boundaries.geojson', "Counties", 1, boundaryLayerControl, geoGroup);
      addGeoJsonLayer('geojson/Polygon_VT_Town_Boundaries.geojson', "Towns", 2, boundaryLayerControl, geoGroup);
      addGeoJsonLayer('geojson/Polygon_VT_Biophysical_Regions.geojson', "Biophysical Regions", 3, boundaryLayerControl, geoGroup);
      addGeoJsonLayer('geojson/surveyblocksWGS84.geojson', "Survey Blocks", 4, boundaryLayerControl, geoGroup);
  } catch(err) {
    geoGroup = false;
    console.log('addBoundaries ERROR', err)
  }
}

function addGeoJsonLayer(file="test.geojson", layerName="Test", layerId = 0, layerControl=null, layerGroup=null, addToMap=false) {
  var layer = null;
  return new Promise(async (resolve, reject) => {
    loadJSON(file, (data) => {
      layer = L.geoJSON(data, {
          onEachFeature: onEachFeature,
          style: onStyle,
          name: layerName, //IMPORTANT: this used to compare layers at ZIndex time
          id: layerId
      });
      if (addToMap) {layer.addTo(valMap); layer.bringToBack();}
      if (layerControl) {layerControl.addOverlay(layer, layerName);}
      if (layerGroup) {layerGroup.addLayer(layer);}
      resolve(layer);
    });
  });
}

function loadJSON(file, callback) {
  loadFile(file, "application/json", (res) => {
    callback(JSON.parse(res));
  })
}

/*
  Common MIME Types:
    application/json
    application/xml
    text/plain
    text/javascript
    text/csv
*/
function loadFile(file, mime="text/plain", callback) {
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType(mime);
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          } else {
            //console.log(`loadFile | status: ${xobj.status} | readyState: ${xobj.readyState}`);
          }
    };
    xobj.send(null);
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

function onEachFeature(feature, layer) {
    layer.on('mousemove', function (event) {
      //console.log('mousemove', event);
    });
    layer.on('click', function (event) {
        //console.log('click | event', event, '| layer', layer);
        event.target._map.fitBounds(layer.getBounds());
        //console.log(feature.properties);
        getGeoJsonLayerFromTypeName(layer.options.name, feature.properties.CNTYNAME || feature.properties.TOWNNAME);
    });
    layer.on('contextmenu', function (event) {
        //console.log('CONTEXT-MENU | event', event, '| layer', layer);
        //event.target._map.fitBounds(layer.getBounds());
        //var html = getIntersectingFeatures(event);
        /*
        valMap.openPopup(html, event.latlng, {
          offset: L.point(0, -24)
        });
        */
    });
    if (feature.properties) {
        var obj = feature.properties;
        var tips = '';
        var pops = '';
        for (var key in obj) { //iterate over feature properties
          switch(key.substr(key.length - 4).toLowerCase()) { //last 4 characters of property
            case 'name':
              tips = `${obj[key]}<br>` + tips;
              break;
          }
        }
      if (tips) {layer.bindTooltip(tips);}
      if (pops) {layer.bindPopup(pops);}
    }
}

/*
  Callback function to set style of added geoJson overlays on the Boundary Layer Control
*/
function onStyle(feature) {
    if (feature.properties.BLOCK_TYPE) {
      switch(feature.properties.BLOCK_TYPE) {
        case 'PRIORITY':
          return {color:"black", weight:1, fillOpacity:0.2, fillColor:"red"};
          break;
        case 'NONPRIOR':
          return {color:"black", weight:1, fillOpacity:0.0, fillColor:"yellow"};
          break;
      }
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
 * Clear any markers from the map
 */
function initGbifOccCanvas() {
    //console.log(`initGbifOccCanvas()`);
    cmCount['all'] = 0;
    //remove all circleMarkers from each group by clearing the layer
    Object.keys(cmGroup).forEach(function(key) {
        console.log(`Clear layer '${key}'`);
        cmGroup[key].clearLayers();
        console.log(`Remove control layer for '${key}'`);
        if (speciesLayerControl) speciesLayerControl.removeLayer(cmGroup[key]);
        delete cmGroup[key];
        delete cmCount[key];
        delete cmTotal[key];
        delete cgColor[key];
        delete cgShape[key];
    });
    console.log(`Remove species layer control from map`);
    if (speciesLayerControl) {valMap.removeControl(speciesLayerControl);}
    speciesLayerControl = false;
}

function getTestData(file, taxonName) {
  //load test data
  loadJSON(file, (data) => {
    updateMap(data.occurrences, taxonName);
  });
}

function abortDataLoad() {
    console.log('abortDataLoad request received.');
    abortData = true;
}

async function fetchGbifVtOccsByTaxon(taxonName=false) {
  let page = {};
  let lim = 300;
  let off = 0;
  let max = 9900;
  do {
    page = await getOccsByNameAndLocation(off, lim, taxonName, gadmGidVt);
    if (page.count > max) {
      abortData = true;
      let msg = `Fetching VT occurrences of '${taxonName}' from the GBIF API has ${fmt.format(page.count)} records, which exceeds the ${fmt.format(max)} record limit. Please choose a smaller data scope.`;
      //alert(msg);
      console.log(msg);
    } else {
      if (0 == off) {cmTotal[taxonName] += page.count;} //set this just once
      updateMap(page.results, taxonName);
    }
    off += lim;
  } while (taxonName && !page.endOfRecords && off<max && !abortData);
  page = {}; off = 0;
  while (taxonName && !page.endOfRecords && off<max && !abortData) {
    page = await getOccsByNameAndLocation(off, lim, taxonName, false, 'vermont', false);
    if (page.count > max) {
      abortData = true;
      let msg = `Fetching VT occurrences of '${taxonName}' from the GBIF API has ${fmt.format(page.count)} records, which exceeds the ${fmt.format(max)} record limit. Please choose a smaller data scope.`;
      //alert(msg);
      console.log(msg);
    } else {
      if (0 == off) {cmTotal[taxonName] += page.count;} //set this just once
      updateMap(page.results, taxonName);
    }
    off += lim;
  };
}

/*
  Handle a click on an occurrence marker. This is done to avoid hanging a popup on each point to improve performance.
  There is a performance hit, still, because we have to hang popup data on the marker when it's created.
*/
async function markerOnClick(e) {
  //eleWait.style.display = 'block';

  let options = e.target ? e.target.options : e.options;
  let latlng = e.latlng ? e.latlng : e._latlng;

  //console.log('markerOnClick', latlng, options);

  var popup = L.popup({
    maxHeight: 200,
    keepInView: true
    })
    .setContent(await occurrencePopupInfo(options)) //must use await to avoid error
    .setLatLng(latlng)
    .openOn(valMap);

    //eleWait.style.display = 'none';
}

async function markerMouseOver(e) {
  //console.log('markerMouseOver', e);
  let o = e.target.options;
  let content = `
    <b><u>${o.canonicalName}</u></b><br>
    ${o.recordedBy ? o.recordedBy : 'Unknown'}<br>
    ${moment(o.eventDate).format('YYYY-MM-DD')}<br>
    `;
  e.target.bindTooltip(content).openTooltip();
}

/*
  Respond to a click on a leaflet.cluster group
*/
async function clusterOnClick(e) {
  //console.log('clusterOnClick | target.options:', e.target.options);
  //console.log('clusterOnClick | childMarkerCount:', e.layer.getAllChildMarkers().length);
  //console.log('clusterOnClick | cluster:', e.layer);

  let cluster = e.layer
  let bottomCluster = cluster;
/*
  while (bottomCluster._childClusters.length === 1) {
    bottomCluster = bottomCluster._childClusters[0];
  }

  if (bottomCluster._zoom === this._maxZoom && bottomCluster._childCount === cluster._childCount) {
    // All child markers are contained in a single cluster from this._maxZoom to this cluster.
    //console.log('clusterOnClick | Cluster will Spiderfy');
    if (valMap.getZoom() < 15) {
      //valMap.setView(e.latlng, 15); //valMap.getZoom()+5
    }
  } else {
    //console.log(`clusterOnClick | Cluster will Zoom`);
  }
*/
  if (cluster._group._spiderfied) {
    //console.log('clusterOnClick | Cluster IS Spiderfied. Unspiderfy.');
    cluster.unspiderfy();
  }
}

async function clusterOnSpiderfied(e) {
  //console.log('clusterOnSpiderfied | e:', e);

  let list = `<b><u>${e.markers.length} Occurrences</u></b><br>`;

  e.markers.forEach(async (mark, idx) => {
    //console.log('child marker', idx, mark.options);
    let o = mark.options;
    if (o.noCoordinates) {
      list += `LOCATION ${o.noCoordinates} - <a href="https://gbif.org/occurrence/${o.gbifID}">${o.gbifID}</a>: ${o.canonicalName}, ${moment(o.eventDate).format('YYYY-MM-DD')}, ${o.recordedBy ? o.recordedBy : 'Unknown'}<br>`;
    } else {
      list += `<a href="https://gbif.org/occurrence/${o.gbifID}">${o.gbifID}</a>: ${o.canonicalName}, ${moment(o.eventDate).format('YYYY-MM-DD')}, ${o.recordedBy ? o.recordedBy : 'Unknown'}<br>`;
    }
    })

  var popup = L.popup({
    maxHeight: 200,
    keepInView: false
    })
    .setContent(list)
    .setLatLng(e.cluster._latlng)
    .openOn(valMap);
}

/*
  Shapes defined by divIcon className can be resized with divIcon iconSize (square, round, ...)
  Shapes defined by custom html/css don't respond to divIcon iconSize (diamond, ...)
*/
function getClusterIconOptions(grpIcon, cluster, color=false, size=30) {
  let html;
  let name;
  let syze = L.point(size, size);

  //console.log('getClusterIconOptions | cluster:', cluster);

  switch(grpIcon) {
    default:
    case 'round':
      html = `<div class="cluster-count ${foreground(color)}"> ${cluster ? cluster.getChildCount() : ''} </div>`;
      name = `${grpIcon}-shape`;
      if (color) name = `${name} bg-${color}`; //add bg-{color} as classname
      break;
    case 'square':
      html = `<div class="cluster-count ${foreground(color)}"> ${cluster ? cluster.getChildCount() : ''} </div>`;
      name = `${grpIcon}-shape`;
      if (color) name = `${name} bg-${color}`; //add bg-{color} as classname
      break;
    case 'triangle':
      //html = `<div class="triangle-count-old ${foreground(color)}"> ${cluster ? cluster.getChildCount() : ''} </div>`;
      //name = cluster ? 'triangle-shape-old' : 'triangle-small-old';
      //if (color) name = `${name} bb-${color}`; //add border-bottom-{color} as classname
      html = `<div class="triangle-count ${foreground(color)}"> ${cluster ? cluster.getChildCount() : ''} </div>`;
      name = 'triangle-shape';
      if (color) name = `${name} bg-${color}`; //add bg-{color} as classname
      break;
    case 'diamond':
      html = `
        <div class="${cluster ? 'diamond-shape' : 'diamond-small'} bg-${color}">
          <div class="diamond-count ${foreground(color)}">${cluster ? cluster.getChildCount() : ''}</div>
        </div>`;
      //no className for diamond, styling is in html, above
      break;
    case 'star':
      html = `
        <div class="${cluster ? 'diamond-shape' : 'diamond-small'} bg-${color}">
          <div class="diamond-count ${foreground(color)}">${cluster ? cluster.getChildCount() : ''}</div>
        </div>`;
      name = 'diamond-shape'; //this creates a non-rotated square
      if (color) name = `${name} bg-${color}`; //add bg-{color} as classname
      break;
    }
  //console.log(`getClusterIconOptions | divIcon html:`, html)
  //return {'html':html, 'className':name, 'iconSize':syze, 'iconAnchor':[size, size]}
  return {'html':html, 'className':name, 'iconSize':syze}
}

function foreground(color) {
  switch(color) {
    case 'red': return 'white';
    case 'blue': return 'yellow';
    case 'yellow': return 'blue';
    case 'black': return 'white';
    default: return 'black';
  }
}

async function getCentroid(type, valu) {
  //console.log('getCentroid', type, valu);
  let item = await getGeoJsonLayerFromTypeName(type, valu);
  console.log('getCentroid RESULT', item);
  if (item.feature) {
    try {
      let gTyp = item.feature.geometry.type;
      let polygon;
      if ('Polygon' == gTyp) {
        console.log(`getCentroid | Geometry Type POLYGON`);
        polygon = turf.polygon(item.feature.geometry.coordinates);
      } else if ('GeometryCollection' == type) {
        console.log(`getCentroid | Geometry Type GEOMETRY COLLECTION`);
        polygon = turf.polygon(item.feature.geometry.geometries[0]);
      }
      let centroid = turf.centroid(polygon);
      console.log(`getCentroid | ${type} ${valu} CENTROID:`, centroid);
      //let centMark = L.marker([centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]]).addTo(valMap);
      return L.latLng(centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]);
    } catch (err) {
      console.log('getCentroid ERROR:', err);
      return L.latLng(42.0, 71.5);
    }
  } else {
    return L.latLng(42.0, 71.5);
  }
}

async function getGeoJsonLayerFromTypeName(type, name) {
  if (geoGroup) {
    for await (const [index, layer] of Object.entries(geoGroup._layers)) {
      //console.log('geoGroup Layer:', layer);
      //console.log('getGeoJsonLayerFromTypeName found GeoJson layer', layer, layer.options.name,type.slice(0,5).toUpperCase(),layer.options.name.slice(0,5).toUpperCase());
      if (type.slice(0,5).toUpperCase()==layer.options.name.slice(0,5).toUpperCase()) {
        //console.log('getGeoJsonLayerFromTypeName SELECTED GeoJson layer', layer.options.name);
        //console.log(`getGeoJsonLayerFromTypeName | layer:`, layer);
        let feature = await getFeatureFromLayerByName(layer, name)
        return feature;
      }
    }
  }
  console.log('LAYER loop DONE.');
  return {};
}
async function getFeatureFromLayerByName(layer, name) {
  for await (const [key, val] of Object.entries(layer._layers)) { //iterate over geoJson layer's feature layers
    //console.log(key, val);
    if (name.toUpperCase() == 'VERMONT') {
      return val;
    }
    if (name.toUpperCase() == val.feature.properties.CNTYNAME) {
      //console.log(`getFeatureFromLayerByName found CNTYNAME`, val.feature.properties.CNTYNAME)
      //console.log(`getFeatureFromLayerByName feature`, val)
      return val;
    }
    if (name.toUpperCase() == val.feature.properties.TOWNNAME) {
      //console.log(`getFeatureFromLayerByName found TOWNNAME`, val.feature.properties.TOWNNAME);
      //console.log(`getFeatureFromLayerByName feature`, val);
      return val;
    }
    if (name.toUpperCase() == val.feature.properties.BLOCKNAME) {
      //console.log(`getFeatureFromLayerByName found BLOCKNAME`, val.feature.properties.BLOCKNAME)
      //console.log(`getFeatureFromLayerByName feature`, val)
      return val;
    }
  }
  console.log('FEATURE loop DONE.'); 
  return {};
}

/*
  This automatically breaks taxa into sub-taxa. To disable this feature, set the global flag

    taxaBreakout = 0;
*/
async function updateMap(occJsonArr, taxonName) {
    var sciName = taxonName; //this is updated later if we got multiple scientificNames for one taxonName
    var idSciName = null;
    var canName = null;
    var grpIcon = cgShape[taxonName] ? cgShape[taxonName] : 'round'; //MUST be one of round, square, triangle, diamond, star
    var altLoc = false;

    for (var i = 0; i < occJsonArr.length; i++) {
        var occJson = occJsonArr[i];

        //filter out records witout lat/lon location
        if (!occJson.decimalLatitude || !occJson.decimalLongitude) {
            if (typeof cmCount['missing'] === 'undefined') {cmCount['missing'] = 0;}
            cmCount['missing']++;
            //console.log('WARNING: Occurrence Record without Lat/Lon values:', occJson.key, 'missing:', cmCount['missing'], 'count:', cmCount['all'], occJson.town, occJson.county);
            //continue;
            if (occJson.town) {
              //console.log(`Location by TOWN`, occJson.town);
              altLoc = await getCentroid('town', occJson.town);
              occJson.noCoordinates = `${occJson.town} Town`;
            } else if (occJson.county) {
              //console.log(`Location by COUNTY`, occJson.county);
              altLoc = await getCentroid('county', occJson.county);
              occJson.noCoordinates = `${occJson.county} County`;
            } else {
              altLoc =  mapCenter; //await getCentroid('state', 'Vermont'); //L.latLng(44.0, -71.5);
              occJson.noCoordinates = 'Vermont'; //None';
            }
        }

        if (taxaBreakout) {
          sciName = occJson.scientificName;
          canName = parseCanonicalFromScientific(occJson);
          if (canName) {sciName = canName;}
          if (typeof cgColor[sciName] === 'undefined') {//pre-index to move to next color b/c parent taxon has starting values defined
            cgColor[sciName] = cgColors[++colrIndx]; if (colrIndx>=(Object.keys(cgColors).length-1)) {colrIndx=0;}
          }
          if (typeof cgShape[sciName] === 'undefined') {//pre-index to move to next shape b/c parent taxon has starting values defined
            cgShape[sciName] = cgShapes[++shapIndx]; if (shapIndx>=(Object.keys(cgShapes).length-1)) {shapIndx=0;}
          }
          //console.log(`COLORS AND SHAPES`, cgColor[sciName], colrIndx, cgShape[sciName], shapIndx);
        } else {
          if (typeof cgColor[sciName] === 'undefined') {
            cgColor[sciName] = cgColor[taxonName];
          }
          if (typeof cgShape[sciName] === 'undefined') {
            cgShape[sciName] = grpIcon;
          }
        }
        idSciName = sciName.split(' ').join('_');
        if (typeof cmCount[sciName] === 'undefined') {cmCount[sciName] = 0;}
        cmCount[sciName]++;
        cmCount['all']++;

        var llLoc = altLoc ? altLoc : L.latLng(occJson.decimalLatitude, occJson.decimalLongitude);

        if (clusterMarkers || iconMarkers) { //these are the individual markers
          var marker = L.marker(llLoc, {icon: L.divIcon(getClusterIconOptions(cgShape[sciName], false, cgColor[sciName], 10))});
        } else {
          cgShape[sciName] = 'round';
          var marker = L.circleMarker(llLoc, {
            fillColor: cgColor[sciName], //cgColor[taxonName], //interior color
            fillOpacity: 0.5, //values from 0 to 1
            color: "black", //border color
            weight: 1, //border thickness
            radius: cmRadius,
            index: cmCount[sciName],
            occurrence: occJson.scientificName
          })
        }

        Object.assign(marker.options, occJson);
        marker.options.canonicalName = canName ? canName : occJson.scientificName;
        marker.on('click', markerOnClick);
        marker.on('mouseover', markerMouseOver);

        let faIcon = 'round'==cgShape[sciName] ? 'circle' : ('triangle'==cgShape[sciName] ? 'caret-up fa-2x' : cgShape[sciName]);
        let grpHtml = `
          <div class="layerControlItem" id="${idSciName}">
            <i class="fa fa-${faIcon}" style="color:${cgColor[`${sciName}`]}"></i>
            ${sciName}
            <span id="groupCount-${idSciName}">&nbsp(<u><b>${cmCount[sciName]}</u></b>)</span>
          </div>`;
  
        if (typeof cmGroup[sciName] === 'undefined') {
          console.log(`cmGroup[${sciName}] is undefined...adding.`);
          if (clusterMarkers) {
            let shape=cgShape[sciName]; let color=cgColor[sciName];
            if (taxaBreakout) {shape='round';color='none';}
            let clusterOptions = {
              maxClusterRadius: 40,
              iconCreateFunction: function(cluster) {
                return L.divIcon(getClusterIconOptions(cgShape[sciName], cluster, cgColor[sciName]));
                }
              };
            cmGroup[sciName] = await new L.markerClusterGroup(clusterOptions).addTo(valMap);
            cmGroup[sciName].on('clusterclick', clusterOnClick);
            cmGroup[sciName].on('spiderfied', clusterOnSpiderfied);
          } else {
            cmGroup[sciName] = await new L.layerGroup().addTo(valMap); //create a new, empty, single-species layerGroup to be populated with points
          }
          console.log(`addOverlay with`, sciName, faIcon, cgColor[sciName], cgShape[sciName]);
          speciesLayerControl.addOverlay(cmGroup[sciName], grpHtml);
          cmGroup[sciName].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
        } else {
          cmGroup[sciName].addLayer(marker); //add this marker to the current layerGroup, which is an ojbect with possibly multiple layerGroups by taxonName
        }
      } //end for-loop

    if (document.getElementById("jsonResults")) {
        document.getElementById("jsonResults").innerHTML += ` | records mapped: ${cmCount['all']}`;
    }
    if (document.getElementById("taxaCount")) {
      document.getElementById("taxaCount").innerHTML = `${Object.keys(cmGroup).length} Taxa`;
  }

    //cmGroup's keys are sciNames, not elementIds...
    var id = null;
    Object.keys(cmGroup).forEach((sciName) => {
      id = sciName.split(' ').join('_');
      //if (document.getElementById(id) && sciName.toLowerCase().includes(taxonName.toLowerCase())) {
      if (document.getElementById(id)) {
          //console.log(`-----match----->> ${id} | ${sciName}`, cmCount[sciName], cmTotal[taxonName]);
          //document.getElementById(`groupCount-${id}`).innerHTML = `&nbsp(<u><b>${fmt.format(cmCount[sciName])}/${fmt.format(cmTotal[taxonName])}</b></u>)`;
          document.getElementById(`groupCount-${id}`).innerHTML = `&nbsp(<u><b>${fmt.format(cmCount[sciName])}</b></u>)`;
      }
    });
}

/*
 * use moment to convert eventDate (which comes to us from VAL API as UTC epoch milliseconds with time *removed*, so
 * it's always time 00:00, and we cannot report time, only date) to a standard date format.
 *
 * return date in the format YYYY-MM-DD
 */
function getDateYYYYMMDD(msecs) {

    var m = moment.utc(msecs);

    return m.format('YYYY-MM-DD');
}

function getDateMMMMDoYYYY(msecs) {

    var m = moment.utc(msecs);

    return m.format('MMMM Do YYYY');
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
            //case 'gbifID':
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
            case 'collector':
                info += `Collector: ${occRecord[key]}<br/>`;
                break;
            case 'basisOfRecord':
                info += `Basis of Record: ${occRecord[key]}<br/>`;
                break;
            case 'eventDate':
                var msecs = occRecord[key]; //epoch date in milliseconds at time 00:00
                //var m = moment.utc(msecs); //convert to UTC. otherwise moment adjusts for locale and alters date to UTC-date-minus-locale-offset.
                //info += `Event Date: ${m.format('MMMM Do YYYY')}<br/>`;
                info += `Event Date: ${getDateMMMMDoYYYY(msecs)}<br/>`;
                break;
            case 'noCoordinates':
                info += `NO Coordinates. Location: ${occRecord[key]}<br/>`;
                break;
            default: //un-comment this to list all properties
                //info += `${key}: ${occRecord[key]}<br/>`;
            }
        });

        try {
          //3. If no canonicalName parse canonicalName and call Wikipedida API
          console.log(`occurrencePopupInfo | canonicalName:`, occRecord.canonicalName, '| taxonRank:', occRecord.taxonRank);
          let canName = false;
          //if (occRecord.canonicalName) {canName = occRecord.canonicalName;}
          //else 
          if (occRecord.taxonRank) {canName = parseCanonicalFromScientific(occRecord);}
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

//iterate through all plotted points in each featureGroup and alter each radius
function SetEachPointRadius(radius = cmRadius) {
  cmRadius = Math.floor(zoomLevel/2);
  Object.keys(cmGroup).forEach((taxonName) => {
    cmGroup[taxonName].eachLayer((cmLayer) => {
      cmLayer.setRadius(radius);
      cmLayer.bringToFront(); //this works, but only when this function is called
    });
  });
}

function addMarker() {
    var marker = L.marker([43.6962, -72.3197]).addTo(valMap);
    marker.bindPopup("<b>Vermont Center for Ecostudies</b>");
}

//standalone module usage
function initGbifStandalone() {
    addMap();
    addMapCallbacks();
    if (!boundaryLayerControl) {addBoundaries();}
}

let argUrl = `${location.hostname}${location.pathname}?species=`;
let argMsg = `
Please pass an object literal like:\n
  - ${argUrl}{"Catharus bicknelli":{"shape":"square","color":"red"},"clusterMarkers":true}\r
  - ${argUrl}{"Ambystoma":{"shape":"diamond","color":"blue"},"taxaBreakout":true,"iconMarkers":true}\r
  - ${argUrl}{"Sphaeriidae":"violet"}\n
Use "taxaBreakout":true to break parent taxon into sub-taxa.\r
Use "clusterMarkers":true to handle stacked and dense data.\n
Use "iconMarkers":true to show markers with shapes other than circles.\n
Note: taxaBreakout with clusterMarkers does not work properly.
Color Options:
{0:"red",1:"blue",2:"green",3:"yellow",4:"orange",5:"purple",6:"cyan",7:"grey",8:"violet",9:"greenyellow"}
Shape Options:
{0:"round",1:"square",2:"triangle",3:"diamond",4:"star"}
`;

export function loadSpeciesMap(speciesStr, htmlId='valMap', fileConfig) {

  console.log(`valSpeciesMap::loadSpeciesData input string: ${speciesStr} for htmlId: ${htmlId}`);
  mapId = htmlId;
  mapCenter = [ fileConfig.dataConfig.mapSettings.lat, fileConfig.dataConfig.mapSettings.lng ];
  zoomCenter = mapCenter;
  zoomLevel = fileConfig.dataConfig.mapSettings.zoom;
  var speciesObj = {};
  try {
    speciesObj = JSON.parse(speciesStr);
    console.log('species object:', speciesObj)
  } catch(error) {
    console.log('ERROR parsing http arugment', speciesStr, 'as JSON:', error);
  }

  if (typeof speciesObj != "object") {
    console.log(argMsg);
  } else {
    initGbifStandalone();
    valMap.options.minZoom = 7;
    valMap.options.maxZoom = 17;
    if (!boundaryLayerControl) {addBoundaries();}
    getSpeciesListData(speciesObj)
  }
}

/*
 * Add multiple species to map passed as JSON string parsed to an object.
 *
 * argSpecies must be of the form 
 *    
 * {"species name":"color","species name":"color","taxaBreakout":true}
 * 
 * or
 * 
 * {"species name":{"shape":"square","color":"blue"},"species name":{"shape":"star","color":"red"},"clusterMarkers":true}
 * 
 * JSON values in http query parameters must be in double quotes, not single-quotes, except for BOOLEAN values and numbers.
 */
async function getSpeciesListData(argSpecies = false) {

    cmCount['all'] = 0;
    var i=0;

    if (!speciesLayerControl) {
        speciesLayerControl = L.control.layers(null,null,{sortLayers:true}).addTo(valMap);
        speciesLayerControl.setPosition("bottomright");
    }
    if (!basemapLayerControl) {
      basemapLayerControl = L.control.layers().addTo(valMap);
      basemapLayerControl.setPosition("bottomright");
    } else {
      basemapLayerControl.addTo(valMap);
      basemapLayerControl.setPosition("bottomright");
    }
    if (!boundaryLayerControl) {
      boundaryLayerControl = L.control.layers().addTo(valMap);
      boundaryLayerControl.setPosition("bottomright");
    } else {
      boundaryLayerControl.addTo(valMap);
      boundaryLayerControl.setPosition("bottomright");
    }

    //allow an object-value of 'taxaBreakout' to set that behavior. use it and delete it.
    if (typeof argSpecies.taxaBreakout != 'undefined') {
      taxaBreakout = argSpecies.taxaBreakout;
      delete argSpecies.taxaBreakout;
    }
    //allow an object-value of 'clusterMarkers' to set that behavior. use it and delete it.
    if (typeof argSpecies.clusterMarkers != 'undefined') {
      clusterMarkers = argSpecies.clusterMarkers;
      delete argSpecies.clusterMarkers;
    }
    //allow an object-value of 'iconMarkers' to set that behavior. use it and delete it.
    if (typeof argSpecies.iconMarkers != 'undefined') {
      iconMarkers = argSpecies.iconMarkers;
      delete argSpecies.iconMarkers;
    }

    colrIndx = 0;
    shapIndx = 0;
    Object.keys(argSpecies).forEach(async taxonName => {
        taxonName = taxonName.trim();
        cmCount[taxonName] = 0;
        cgColor[taxonName] = cgColors[colrIndx];
        cgShape[taxonName] = cgShapes[shapIndx];
        if (typeof argSpecies[taxonName] === 'object') {
          cgColor[taxonName] = argSpecies[taxonName].color; //define circleGroup color for each species mapped
          cgShape[taxonName] = argSpecies[taxonName].shape; //define circleGroup shape for each species mapped
        } else {
          cgColor[taxonName] = argSpecies[taxonName]; //define group color for each species mapped
          cgShape[taxonName] = cgShapes[i];
        }
        for (const [key, val] of Object.entries(cgColors)) {
          if (val == cgColor[taxonName]) colrIndx = key;
        }
        for (const [key, val] of Object.entries(cgShapes)) {
          if (val == cgShape[taxonName]) shapIndx = key;
        }
        cmTotal[taxonName] = 0;
        console.log(`getSpeciesListData: Add species group ${taxonName} as ${colrIndx}:${cgColor[taxonName]} ${shapIndx}:${cgShape[taxonName]}`);
        await fetchGbifVtOccsByTaxon(taxonName)
        i++;
    });
}

function addMapCallbacks() {

  valMap.on('zoomend', function () {
        console.log(`Map Zoom: ${valMap.getZoom()}`);
    });
    valMap.on('moveend', function() {
        console.log(`Map Center: ${valMap.getCenter()}`);
    });

}

if (document.getElementById("zoomVT")) {
  document.getElementById("zoomVT").addEventListener("click", () => {
    zoomVT();
  });
}
