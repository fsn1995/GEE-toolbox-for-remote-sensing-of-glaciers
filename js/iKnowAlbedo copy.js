/*
This app is to present the albedo product over Greenland Ice Sheet with MODIS data.
Base map is the ArcticDEM. Temperature is taken from NOAA/GFS0P25

The code of this interactive app was mainly adapted from google's tutorial
https://developers.google.com/earth-engine/tutorials/community/drawing-tools-region-reduction?hl=en#result
https://developers.google.com/earth-engine/guides/ic_visualization

shunan.feng@envs.au.dk

*/
var greenlandmask = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK')
                      .select('ice_mask').eq(1); //'ice_mask', 'ocean_mask'
var greenlandBound = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK').geometry().bounds();
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var arcticDEMgreenland = arcticDEM.updateMask(greenlandmask);

var elevationVis = {
  min: -50.0,
  max: 2000.0,
  palette: ['0d13d8', '60e1ff', 'ffffff'],
};


Map.setCenter(-41.0, 74.0, 4);
Map.setOptions('HYBRID');

var date_start = ee.Date.fromYMD(1984, 1, 1),
    date_end = ee.Date(Date.now());


// calculate the slope
// var DEMterrain = ee.Terrain.products(arcticDEMgreenland);

// var imMinMax = DEMterrain.reduceRegion({
//     reducer: ee.Reducer.minMax(),
//     geometry: greenlandBound,
//     scale: 3000,
//     // bestEffort: Boolean,
//     tileScale: 4
// });
// print(imMinMax);


// Map.addLayer(DEMterrain.select('slope'), {min: 0, max: 10, gamma: 1.5}, 'slope');
// Map.addLayer(DEMterrain.select('aspect'), {min: 0, max: 360}, 'aspect');
Map.addLayer(arcticDEMgreenland, elevationVis, 'Elevation');
// var slope = ALOSterrain.select('slope');
// var zones = slope.gte(2).add(slope.gte(7)).add(slope.gte(12)).add(slope.gte(25));
// zones = zones.updateMask(zones.neq(0));
// var vectors = zones.addBands(slope).reduceToVectors({
//     geometry: roi,
//     scale: 1000,
//     geometryType: 'polygon',
//     eightConnected: false,
//     labelProperty: 'slope zones',
//     reducer: ee.Reducer.mean()
// });

// Map.addLayer(zones, {min: 1, max: 4, palette: ['0000FF', '00FF00', 'FF0000', 'ffffff']}, 'slope zones');


// var MODISband = {
//   "Black-sky albedo for visible brodband": "Albedo_BSA_vis",
//   "Black-sky albedo for NIR broadband": "Albedo_BSA_nir",
//   "Black-sky albedo for shortwave broadband": "Albedo_BSA_shortwave",
//   "White-sky albedo for visible broadband": "Albedo_WSA_vis",
//   "White-sky albedo for NIR broadband": "Albedo_WSA_nir",
//   "White-sky albedo for shortwave broadband": "Albedo_WSA_shortwave"
// };

// var olsCoefficients = {
//   itcpsL7: ee.Image.constant([0.0994, 0.0774, 0.0895, 0.0349, 0.0068, 0.0085])
//           .multiply(10000),
//   slopesL7: ee.Image.constant([0.8513, 0.8944, 0.8650, 0.9496, 0.7516, 0.9897]),
//   itcpsS2: ee.Image.constant([0.1164, 0.1354, 0.1420, 0.0410, 0.0060, 0.0108])
//           .multiply(10000),
//   slopesS2: ee.Image.constant([0.8817, 0.8513, 0.8511, 0.9514, 0.8333, 0.8401])
// }; //ols
// Function to get and rename bands of interest from OLI.
function renameOli(img) {
  return img.select(
    ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'QA_PIXEL', 'QA_RADSAT'], // 'QA_PIXEL', 'QA_RADSAT'
    ['Blue',  'Green', 'Red',   'NIR',   'QA_PIXEL', 'QA_RADSAT']);//'QA_PIXEL', 'QA_RADSAT';
}
// Function to get and rename bands of interest from ETM+, TM.
function renameEtm(img) {
  return img.select(
    ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'QA_PIXEL', 'QA_RADSAT'], //#,   'QA_PIXEL', 'QA_RADSAT'
    ['Blue',  'Green', 'Red',   'NIR',   'QA_PIXEL', 'QA_RADSAT']); // #, 'QA_PIXEL', 'QA_RADSAT'
}
// Function to get and rename bands of interest from Sentinel 2.
function renameS2(img) {
  return img.select(
    ['B2',   'B3',    'B4',  'B8',  'QA60', 'SCL'],
    ['Blue', 'Green', 'Red', 'NIR', 'QA60', 'SCL']
    //['B2',     'B3',      'B4',    'B8',    'B11',     'B12',     'QA60', 'SCL'],
    //['BlueS2', 'GreenS2', 'RedS2', 'NIRS2', 'SWIR1S2', 'SWIR2S2', 'QA60', 'SCL']
  );
}

var rmaCoefficients = {
  itcpsL7: ee.Image.constant([-0.0084, -0.0065, 0.0022, -0.0768]),
  slopesL7: ee.Image.constant([1.1017, 1.0840, 1.0610, 1.2100]),
  itcpsS2: ee.Image.constant([0.0210, 0.0167, 0.0155, -0.0693]),
  slopesS2: ee.Image.constant([1.0849, 1.0590, 1.0759, 1.1583])
}; 

function oli2oli(img) {
  return img.select(['Blue', 'Green', 'Red', 'NIR'])
            .toFloat();
}

function etm2oli(img) {
  return img.select(['Blue', 'Green', 'Red', 'NIR'])
    .multiply(rmaCoefficients.slopesL7)
    .add(rmaCoefficients.itcpsL7)
    .toFloat();
}
function s22oli(img) {
  return img.select(['Blue', 'Green', 'Red', 'NIR'])
    .multiply(rmaCoefficients.slopesS2)
    .add(rmaCoefficients.itcpsS2)
    .toFloat();
}

function imRangeFilter(image) {
  var maskMax = image.lte(1);
  var maskMin = image.gt(0);
  return image.updateMask(maskMax).updateMask(maskMin);
}

function aoiMask(image) {
  return image.updateMask(greenlandmask);
}
/* 
Cloud mask for Landsat data based on fmask (QA_PIXEL) and saturation mask 
based on QA_RADSAT.
Cloud mask and saturation mask by sen2cor.
Codes provided by GEE official.
*/

// This example demonstrates the use of the Landsat 8 Collection 2, Level 2
// QA_PIXEL band (CFMask) to mask unwanted pixels.

function maskL8sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  // var opticalBands = image.select(['Blue', 'Green', 'Red', 'NIR']).multiply(0.0000275).add(-0.2);
  // var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.select(['Blue', 'Green', 'Red', 'NIR']).multiply(0.0000275).add(-0.2)
      // .addBands(thermalBands, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

// This example demonstrates the use of the Landsat 4, 5, 7 Collection 2,
// Level 2 QA_PIXEL band (CFMask) to mask unwanted pixels.

function maskL457sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Unused
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  // var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  // var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.select(['Blue', 'Green', 'Red', 'NIR']).multiply(0.0000275).add(-0.2)
      // .addBands(thermalBand, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}


/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2sr(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // 1 is saturated or defective pixel
  var not_saturated = image.select('SCL').neq(1);
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  // return image.updateMask(mask).updateMask(not_saturated);
  return image.updateMask(mask).updateMask(not_saturated).divide(10000);
}

// narrow to broadband conversion
function addVisnirAlbedo(image) {
  var albedo = image.expression(
    '0.7605 * Blue + 0.8090 * Green - 1.8376 * Red + 0.9145 * NIR + 0.1627',
    {
      'Blue': image.select('Blue'),
      'Green': image.select('Green'),
      'Red': image.select('Red'),
      'NIR': image.select('NIR')
    }
  ).rename('visnirAlbedo');
  return image.addBands(albedo).copyProperties(image, ['system:time_start']);
}


/* get harmonized image collection */

// Define function to prepare OLI images.
function prepOli(img) {
  var orig = img;
  img = renameOli(img);
  img = maskL8sr(img);
  img = oli2oli(img);
  //img = addTotalAlbedo(img);
  img = addVisnirAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}
// Define function to prepare ETM+/TM images.
function prepEtm(img) {
  var orig = img;
  img = renameEtm(img);
  img = maskL457sr(img);
  img = etm2oli(img);
  //img = addTotalAlbedo(img);
  img = addVisnirAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}
// Define function to prepare S2 images.
function prepS2(img) {
  var orig = img;
  img = renameS2(img);
  img = maskS2sr(img);
  img = s22oli(img);
  // img = addTotalAlbedo(img)
  img = addVisnirAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()).set('SATELLITE', 'SENTINEL_2'));
}



// var date_end = ee.Date(Date.now()).format('yyyy-MM-dd')
// var date_start =ee.Date(Date.now()).advance(-2, 'year').format('yyyy-MM-dd');



// var tempCol = ee.ImageCollection('NOAA/GFS0P25')
//   .filterDate(ee.Date(Date.now()).advance(-1, 'day'), ee.Date(Date.now()).advance(0, 'day'))
//   .limit(24)
//   .select('temperature_2m_above_ground');

// // Define arguments for animation function parameters.
// var gifParams = {
//   dimensions: 768,
//   region: greenlandBound,
//   framesPerSecond: 3,
//   crs: 'EPSG:3857',
//   min: -40.0,
//   max: 30.0,
//   palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red']
// };

// var gifAnimation = ui.Thumbnail({
//   image: tempCol,
//   params: gifParams,
//   style: {
//     position: 'bottom-right',
//     width: '300px',
//     height: '500px'
//   }
// });

// var gifPanel = ui.Panel({
//   widgets: [
//     ui.Label('temperature_2m_above_ground\nlimit to 24h\nGFS: Global Forecast System \n384-Hour Predicted Atmosphere Data',
//     {whiteSpace: 'pre'}),
//     gifAnimation
//   ],
//   style: {position: 'bottom-right'},
//   layout: null,
//   });
  
// Map.add(gifPanel);



var drawingTools = Map.drawingTools();

drawingTools.setShown(false);

while (drawingTools.layers().length() > 0) {
var layer = drawingTools.layers().get(0);
drawingTools.layers().remove(layer);
}

var dummyGeometry =
  ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '23cba7'});

drawingTools.layers().add(dummyGeometry);

function clearGeometry() {
var layers = drawingTools.layers();
layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}

function drawRectangle() {
clearGeometry();
drawingTools.setShape('rectangle');
drawingTools.draw();
}

function drawPolygon() {
clearGeometry();
drawingTools.setShape('polygon');
drawingTools.draw();
}

function drawPoint() {
clearGeometry();
drawingTools.setShape('point');
drawingTools.draw();
}

var chartPanel = ui.Panel({
  style:
    {height: '235px', width: '600px', position: 'bottom-center', shown: false}
});

Map.add(chartPanel);

var gifPanel = ui.Panel({
  style:
      {height: '600px', width: '300px', position: 'bottom-center', shown: false}
  });
Map.add(gifPanel);

function chartTimeSeries() {
// Make the chart panel visible the first time a geometry is drawn.
if (!chartPanel.style().get('shown')) {
  chartPanel.style().set('shown', true);
}

// Get the drawn geometry; it will define the reduction region.
var aoi = drawingTools.layers().get(0).getEeObject();

// Set the drawing mode back to null; turns drawing off.
drawingTools.setShape(null);

// Reduction scale is based on map scale to avoid memory/timeout errors.
var mapScale = Map.getScale();
var scale = mapScale > 5000 ? mapScale * 2 : 5000;

// Chart time series for the selected area of interest.
// var chart = ui.Chart.image
//                 .seriesByRegion({
//                   imageCollection: multiSat.filterDate(date_start, date_end),
//                   regions: aoi,
//                   reducer: ee.Reducer.mean(),
//                   band: 'albedo',
//                   scale: scale,
//                   xProperty: 'system:time_start'
//                 })
//                 .setOptions({
//                   titlePostion: 'none',
//                   legend: {position: 'none'},
//                   hAxis: {title: 'Date'},
//                   vAxis: {title: 'albedo'},
//                   series: {0: {color: '23cba7'}}
//                 });

// create filter for image collection

var colFilter = ee.Filter.and(
  ee.Filter.bounds(aoi),
  ee.Filter.date(date_start, date_end)
  // ee.Filter.calendarRange(6, 8, 'month')
);

var s2colFilter =  ee.Filter.and(
  ee.Filter.bounds(aoi),
  ee.Filter.date(date_start, date_end),
  // ee.Filter.calendarRange(6, 7, 'month'),
  ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50)
);


var oliCol = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') 
            .filter(colFilter) 
            .map(prepOli)
            .select(['visnirAlbedo']); //# .select(['totalAlbedo']) or  .select(['visnirAlbedo'])
var etmCol = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2') 
            .filter(colFilter) 
            .filter(ee.Filter.calendarRange(1999, 2020, 'year')) // filter out L7 imagaes acquired after 2020 due to orbit drift
            .map(prepEtm)
            .select(['visnirAlbedo']); // # .select(['totalAlbedo']) or  .select(['visnirAlbedo'])
var tmCol = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2') 
            .filter(colFilter) 
            .map(prepEtm)
            .select(['visnirAlbedo']); //# .select(['totalAlbedo']) or  .select(['visnirAlbedo'])
var tm4Col = ee.ImageCollection('LANDSAT/LT04/C02/T1_L2') 
            .filter(colFilter) 
            .map(prepEtm)
            .select(['visnirAlbedo']); //# .select(['totalAlbedo']) or  .select(['visnirAlbedo'])
var s2Col = ee.ImageCollection('COPERNICUS/S2_SR') 
            .filter(s2colFilter) 
            .map(prepS2)
            .select(['visnirAlbedo']); //# .select(['totalAlbedo']) or  .select(['visnirAlbedo'])

var landsatCol = oliCol.merge(etmCol).merge(tmCol).merge(tm4Col);
var multiSat = landsatCol.merge(s2Col).sort('system:time_start', true).map(imRangeFilter); // Sort chronologically in descending order.


// var dataset = ee.ImageCollection('MODIS/006/MCD43A3')
//                 .map(function(image){
//                     return image.divide(1000)
//                                 .copyProperties(image, ['system:time_start'])
//                                 .set({date: ee.Date(image.get('system:time_start')).format('YYYY-MM-DD')});
//                   });

// var date_start = ee.Image(multiSat.first()).date().format('yyyy-MM-dd'),
//     date_end = ee.Date(Date.now()).format('yyyy-MM-dd');
    
    
  // var chart = ui.Chart.image
  //               .seriesByRegion({
  //                 imageCollection: multiSat.filterDate(date_start, date_end),
  //                 regions: aoi,
  //                 reducer: ee.Reducer.mean(),
  //                 band: 'albedo',
  //                 scale: scale,
  //                 xProperty: 'system:time_start'
  //               })
  //               .setOptions({
  //                 titlePostion: 'none',
  //                 legend: {position: 'none'},
  //                 hAxis: {title: 'Date'},
  //                 vAxis: {title: 'albedo'},
  //                 series: {0: {color: '23cba7'}}
  //               });  
var allObs = multiSat.map(function(img) {
  var obs = img.reduceRegion(
      {geometry: aoi, 
      reducer: ee.Reducer.median(), 
      scale: 30});
  return img.set('visnirAlbedo', obs.get('visnirAlbedo'));
});

var chart =
  ui.Chart.feature.groups(allObs, 'system:time_start', 'visnirAlbedo', 'SATELLITE')
      .setChartType('LineChart')
      .setSeriesNames(['TM', 'ETM+', 'OLI', 'S2'])
      .setOptions({
        title: 'All Observations',
        colors: ['f8766d', '00ba38', '619cff', '8934eb'],
        hAxis: {title: 'Date'},
        vAxis: {title: 'albedo'},
        pointSize: 6,
        dataOpacity: 0.5
      });
// Replace the existing chart in the chart panel with the new chart.
chartPanel.widgets().reset([chart]);
}


drawingTools.onDraw(ui.util.debounce(chartTimeSeries, 500));
drawingTools.onEdit(ui.util.debounce(chartTimeSeries, 500));


var symbol = {
rectangle: '⬛',
polygon: '🔺',
point: '📍',
};
var selectedBand;
var controlPanel = ui.Panel({
widgets: [
//   ui.Label('0. Select the band.'),
//   ui.Select({
//     items: Object.keys(MODISband),
//     onChange: function(key) {
//       selectedBand = MODISband[key];
      
//   }}),
  ui.Label('1. Select a drawing mode.'),
  ui.Button({
    label: symbol.rectangle + ' Rectangle',
    onClick: drawRectangle,
    style: {stretch: 'horizontal'}
  }),
  ui.Button({
    label: symbol.polygon + ' Polygon',
    onClick: drawPolygon,
    style: {stretch: 'horizontal'}
  }),
  ui.Button({
    label: symbol.point + ' Point',
    onClick: drawPoint,
    style: {stretch: 'horizontal'}
  }),
  ui.Label('2. Draw a geometry.'),
  ui.Label('3. Wait for chart to render.'),
  ui.Label(
      '4. Repeat 0-3 or edit/move\ngeometry for a new chart.',
      {whiteSpace: 'pre'})
],
style: {position: 'bottom-left'},
layout: null,
});

Map.add(controlPanel);
// Map.setCenter(-40.764, 74.817, 5);