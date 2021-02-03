/*
This app aims to visualize time series of true color composite of satellite imagery
for monitoring the glaicer change on Greenland Ice Sheet. 

The code is modified based on google's tutorial 
https://developers.google.com/earth-engine/guides/ui_panels
https://google.earthengine.app/view/split-panel

shunan.feng@envs.au.dk
*/

var aoi = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK').geometry().bounds();
// var aoi = /* color: #d63000 */ee.Geometry.Point([-51.34990330665058, 64.16923429935999]);
// Create the left map, and have it display layer 0.
var leftMap = ui.Map();
leftMap.setControlVisibility(true);


// Create the right map, and have it display layer 1.
var rightMap = ui.Map();
rightMap.setControlVisibility(true);

/*
 * Tie everything together
 */

// Create a SplitPanel to hold the adjacent, linked maps.
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  wipe: true,
  style: {stretch: 'both'}
});

// Set the SplitPanel as the only thing in the UI root.
ui.root.widgets().reset([splitPanel]);
var linker = ui.Map.Linker([leftMap, rightMap]);
// var year_start = 2018; // 2013-04-11T00:00:00 - Present
// var year_end = 2020;
// var month_start = 1;
// var month_end = 12;

// var date_start = ee.Date.fromYMD(year_start, month_start, 1);
// var date_end = ee.Date.fromYMD(year_end, month_end, 31);
// var years = ee.List.sequence(year_start, year_end);// time range of years
// var months = ee.List.sequence(month_start, month_end);// time range of months
// var now = Date.now();

// coefficients from Roy et al. (2016)
// var coefficients = {
//   itcps: ee.Image.constant([0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172])
//           .multiply(10000),
//   slopes: ee.Image.constant([0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071])
// };


/* 
OLI : 'B2',   'B3',    'B4',  'B5',  'B6',    'B7',
      'Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'
ETM+: 'B1',   'B2',    'B3',  'B4',  'B5',    'B7'
TM  : 'B1',   'B2',    'B3',  'B4',  'B5',    'B7'
S2  : 'B2',   'B3',    'B4',  'B8',  'B11',   'B12' (B11,12 are 20m)
*/


// Function to get and rename bands of interest from OLI.
function renameOli(img) {
  return img.select(
    ['B2',   'B3',    'B4',  'B5',  'B6',    'B7',    'pixel_qa'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa']);
}

// Function to get and rename bands of interest from ETM+, TM.
function renameEtm(img) {
return img.select(
    ['B1',   'B2',    'B3',  'B4',  'B5',    'B7',    'pixel_qa'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa']);
}
// Function to get and rename bands of interest from Sentinel 2.
function renameS2(img) {
  return img.select(
    ['B2',   'B3',    'B4',  'B8',  'B11',   'B12',   'QA60'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'QA60']
  );
}


// function etm2oli(img) {
//   return img.select(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
//     .multiply(coefficients.slopes)
//     .add(coefficients.itcps)
//     .round()
//     .toShort() // convert to Int16
//     .addBands(img.select('pixel_qa'));
// }

// cloud mask for Landsat data based on fmask (pixel_qa)

/**
* Function to mask clouds based on the pixel_qa band of Landsat 8 SR data.
* @param {ee.Image} image input Landsat 8 SR image
* @return {ee.Image} cloudmasked Landsat 8 image
*/
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return image.updateMask(mask);
}

/**
* Function to mask clouds based on the pixel_qa band of Landsat SR data.
* @param {ee.Image} image Input Landsat SR image
* @return {ee.Image} Cloudmasked Landsat image
*/
function cloudMaskL457(image) {
  var qa = image.select('pixel_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
}

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

  return image.updateMask(mask);
}


// bandmath
// var addSDI = function(image) {
//     var indice = image.normalizedDifference(['RED', 'GREEN']).rename('SDI');
//     return image.addBands(indice); // Snow darkening index
//   };
function addNDSI(image) {
// var indice = image.normalizedDifference(['Green', 'SWIR1']).rename('NDSI');
  return image.normalizedDifference(['Green', 'SWIR1']).rename('NDSI'); // Snow darkening index
}

// Define function to prepare OLI images.
function prepOli(img) {
  var orig = img;
  img = renameOli(img);
  img = maskL8sr(img);
  // img = addNDSI(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}

// Define function to prepare ETM+/TM images.
function prepEtm(img) {
  var orig = img;
  img = renameEtm(img);
  img = cloudMaskL457(img);
  // img = etm2oli(img);
  // img = addNDSI(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}

// Define function to prepare S2 images.
function prepS2(img) {
  var orig = img;
  img = renameS2(img);
  img = maskS2clouds(img);
  // img = addNDSI(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()).set('SATELLITE', 'SENTINEL_2'));
}
/*
apply the harmonization and test with indice
*/


// // study time range
// var year_start = 2020; // 2013-04-11T00:00:00 - Present
// var year_end = 2020;
// var month_start = 6;
// var month_end = 7;

// var date_start = ee.Date.fromYMD(year_start, month_start, 1);
// var date_end = ee.Date.fromYMD(year_end, month_end, 31);
// var years = ee.List.sequence(year_start, year_end);// time range of years
// var months = ee.List.sequence(month_start, month_end);// time range of months
// var aoi = ee.Geometry.Point([-49.3476433532785, 67.0775206116519]);
// // var aoi = ee.Geometry.Point([-41.238, 70.225]);
var date_start = ee.Date.fromYMD(1984, 1, 1),
    date_end = ee.Date(Date.now()).format('yyyy-MM-dd'),
    now = Date.now();
// // Display AOI on the map.
// Map.centerObject(aoi, 4);
// Map.addLayer(aoi, {color: 'f8766d'}, 'AOI');
// Map.setOptions('HYBRID');


var colFilter = ee.Filter.and(
  ee.Filter.bounds(aoi),
  ee.Filter.date(date_start, date_end),
  ee.Filter.lt('CLOUD_COVER', 50),
  ee.Filter.lt('GEOMETRIC_RMSE_MODEL', 10),
  ee.Filter.or(
    ee.Filter.eq('IMAGE_QUALITY', 9),
    ee.Filter.eq('IMAGE_QUALITY_OLI', 9)
  )
);

var s2colFilter =  ee.Filter.and(
  ee.Filter.bounds(aoi),
  ee.Filter.date(date_start, date_end),
  ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50)
);



var oliCol = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
             .filter(colFilter)
             .map(prepOli);
var etmCol = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
             .filter(colFilter)
             .map(prepEtm);
var tmCol = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
            .filter(colFilter)
            .map(prepEtm);
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR')
            .filter(s2colFilter)
            .map(prepS2);

var landsatCol = oliCol.merge(etmCol).merge(tmCol);
var multiSat = landsatCol.merge(s2Col).sort('system:time_start', true);

// var date_start = ee.Image(multiSat.first()).date().format('yyyy-MM-dd'),
//     date_end = ee.Date(Date.now()).format('yyyy-MM-dd'),
//     now = Date.now();
// var date_start = ee.Date.fromYMD(1984, 1, 1),
//     date_end = ee.Date(Date.now()).format('yyyy-MM-dd'),
//     now = Date.now();
/*
 Set up show mosaic
 Run this function on a change of the dateSlider.
 */

var showMosaic1 = function(range) {
  var mosaic = multiSat.filterDate(range.start(), range.end()).median();
  // Asynchronously compute the name of the composite.  Display it.
  var visParams = {
    min: 0,
    max: 3000,
    bands: ['Red', 'Green', 'Blue'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    // var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
    leftMap.layers().reset([layer]); //Map.layers().set(0, layer);
  });
};

// Asynchronously compute the date range and show the slider.
var dateRange1 = ee.DateRange(date_start, date_end).evaluate(function(range) {
  var dateSlider1 = ui.DateSlider({
    start: range['dates'][0],
    end: range['dates'][1],
    value: null,
    period: 7,
    onChange: showMosaic1,
    style: {position: 'bottom-left'}
  });
  leftMap.add(dateSlider1.setValue(now));
});

var showMosaic2 = function(range) {
  var mosaic = multiSat.filterDate(range.start(), range.end()).median();
  // Asynchronously compute the name of the composite.  Display it.
  var visParams = {
    min: 0,
    max: 3000,
    bands: ['Red', 'Green', 'Blue'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    // var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
    rightMap.layers().reset([layer]); //Map.layers().set(0, layer);
  });
};

// Asynchronously compute the date range and show the slider.
var dateRange2 = ee.DateRange(date_start, date_end).evaluate(function(range) {
  var dateSlider2 = ui.DateSlider({
    start: range['dates'][0],
    end: range['dates'][1],
    value: null,
    period: 7,
    onChange: showMosaic2,
    style: {position: 'bottom-right'}
  });
  rightMap.add(dateSlider2.setValue(now));
});
/*
 * Set up the maps and control widgets
 */
leftMap.setCenter(-40.764, 74.817, 5);
