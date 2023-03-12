/*
Reference: https://twitter.com/jstnbraaten/status/1580621682393300992?s=20&t=KMkGuLN8U7Ub7PQIF2dtRQ
*/

/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2021-08-01', '2021-08-15')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds);

var visualization = {
  min: 0.0,
  max: 1,
  bands: ['B4', 'B3', 'B2'],
};

var s2img = dataset.mean().visualize(visualization);//.updateMask(greenlandmask);
var s2layer1 = ui.Map.Layer(s2img).setName('s2img');
var s2layer2 = ui.Map.Layer(s2img).setName('s2img');
var s2layer3 = ui.Map.Layer(s2img).setName('s2img');

var map1 = ui.Map().add(s2layer1).setZoom(8);
var map2 = ui.Map().add(s2layer2).setZoom(11);
var map3 = ui.Map().add(s2layer3).setZoom(14);

var linker = ui.Map.Linker([map1, map2, map3], 'change-center');

var split1 = ui.Panel(ui.SplitPanel({
  firstPanel: map1,
  secondPanel: map2,
  orientation: 'horizontal',
  wipe: false,
}), null, {width: '66%'});

var split2 = ui.Panel(ui.SplitPanel({
  firstPanel: split1,
  secondPanel: ui.Panel(map3),
  orientation: 'horizontal',
  wipe: false,
}), null, {height: '100%', width: '100%'});

ui.root.clear();
ui.root.insert(0, split2);

map1.setControlVisibility(false);
map2.setControlVisibility(false);
map3.setControlVisibility(false);

// START: set_these
// var lon = -49.05122444659761;
// var lat = 66.74571371588985;
// var moveLat = 0.0004;  // degrees
// var nMoves = 500;
// var moveRate = 500; // milliseconds
// // END: set_these

// var latStart = lat;
// map3.setCenter(lon, lat);

// ui.util.setInterval(function() {
//   lat += moveLat;
//   if (lat < latStart + (nMoves * moveLat)) {
//     map3.setCenter(lon, lat);
//   }
// }, moveRate);

// START: set_these
var lon = -50.24598763019136;
var lat = 67.09669535460067;
var moveLon = 0.0004;  // degrees
var nMoves = 5000;
var moveRate = 100; // milliseconds
// END: set_these

var lonStart = lon;
map3.setCenter(lon, lat);

ui.util.setInterval(function() {
  lon += moveLon;
  if (lon < lonStart + (nMoves * moveLon)) {
    map3.setCenter(lon, lat);
  }
}, moveRate);