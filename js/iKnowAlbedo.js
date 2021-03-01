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
// calculate the slope
var DEMterrain = ee.Terrain.products(arcticDEMgreenland);

var imMinMax = DEMterrain.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: greenlandBound,
    scale: 3000,
    // bestEffort: Boolean,
    tileScale: 4
});
// print(imMinMax);


Map.addLayer(DEMterrain.select('slope'), {min: 0, max: 10, gamma: 1.5}, 'slope');
Map.addLayer(DEMterrain.select('aspect'), {min: 0, max: 360}, 'aspect');
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


var MODISband = {
  "Black-sky albedo for visible brodband": "Albedo_BSA_vis",
  "Black-sky albedo for NIR broadband": "Albedo_BSA_nir",
  "Black-sky albedo for shortwave broadband": "Albedo_BSA_shortwave",
  "White-sky albedo for visible broadband": "Albedo_WSA_vis",
  "White-sky albedo for NIR broadband": "Albedo_WSA_nir",
  "White-sky albedo for shortwave broadband": "Albedo_WSA_shortwave"
};

var olsCoefficients = {
  itcpsL7: ee.Image.constant([0.0994, 0.0774, 0.0895, 0.0349, 0.0068, 0.0085])
          .multiply(10000),
  slopesL7: ee.Image.constant([0.8513, 0.8944, 0.8650, 0.9496, 0.7516, 0.9897]),
  itcpsS2: ee.Image.constant([0.1164, 0.1354, 0.1420, 0.0410, 0.0060, 0.0108])
          .multiply(10000),
  slopesS2: ee.Image.constant([0.8817, 0.8513, 0.8511, 0.9514, 0.8333, 0.8401])
}; //ols

var rmaCoefficients = {
  itcpsL7: ee.Image.constant([0.0156, 0.0013, 0.0081, 0.0034, -0.0021, 0.0011])
          .multiply(10000),
  slopesL7: ee.Image.constant([0.9823, 1.0096, 0.9918, 0.9979, 0.8944, 1.1510]),
  itcpsS2: ee.Image.constant([-0.0039, -0.0082, -0.0073, -0.0790, -0.0038, 0.0020])
          .multiply(10000),
  slopesS2: ee.Image.constant([1.0246, 1.0204, 1.0328, 1.1107, 1.0338, 1.0012])
}; //rma


// Function to get and rename bands of interest from OLI.
function renameOli(img) {
  return img.select(
    ['B2',   'B3',    'B4',  'B5',  'B6',    'B7',    'pixel_qa', 'radsat_qa'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa', 'radsat_qa']);
}

// Function to get and rename bands of interest from ETM+, TM.
function renameEtm(img) {
return img.select(
    ['B1',   'B2',    'B3',  'B4',  'B5',    'B7',    'pixel_qa', 'radsat_qa'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'pixel_qa', 'radsat_qa']);
}
// Function to get and rename bands of interest from Sentinel 2.
function renameS2(img) {
  return img.select(
    ['B2',   'B3',    'B4',  'B8',  'B11',   'B12',   'QA60'],
    ['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2', 'QA60']
  );
}


function etm2oli(img) {
  return img.select(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
    .multiply(rmaCoefficients.slopesL7)
    .add(rmaCoefficients.itcpsL7)
    .round()
    .toShort(); // convert to Int16
    // .addBands(img.select('pixel_qa'));
}
function s22oli(img) {
  return img.select(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2'])
    .multiply(rmaCoefficients.slopesS2)
    .add(rmaCoefficients.itcpsS2)
    .round();
    // .toShort(); // convert to Int16
    // .addBands(img.select('pixel_qa'));
}

function imRangeFilter(image) {
  var mask = image.lt(10000);
  return image.updateMask(mask);
}

// cloud mask for Landsat data based on fmask (pixel_qa)
function bitwiseExtract(value, fromBit, toBit) {
  if (toBit === undefined)
    toBit = fromBit
  var maskSize = ee.Number(1).add(toBit).subtract(fromBit)
  var mask = ee.Number(1).leftShift(maskSize).subtract(1)
  return value.rightShift(fromBit).bitwiseAnd(mask)
} //Daniel Wiell https://gis.stackexchange.com/questions/363929/how-to-apply-a-bitmask-for-radiometric-saturation-qa-in-a-image-collection-eart
/**
* Function to mask clouds based on the pixel_qa band of Landsat 8 SR data.
* @param {ee.Image} image input Landsat 8 SR image
* @return {ee.Image} cloudmasked Landsat 8 image
*/
function maskL8sr(image) {
  // Bits 3 and 5 are cloud shadow and cloud, respectively. Bits 2 are water.
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);
  // var waterBitMask = (1 << 2);
  // Get the pixel QA band.
  var qa = image.select('pixel_qa');
  var radsatQA = image.select('radsat_qa');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  var anySaturated = bitwiseExtract(radsatQA, 1, 11)
  var saturateMask = anySaturated.not()
  return image.updateMask(mask).updateMask(saturateMask);
}

/**
* Function to mask clouds based on the pixel_qa band of Landsat SR data.
* @param {ee.Image} image Input Landsat SR image
* @return {ee.Image} Cloudmasked Landsat image
*/
function cloudMaskL457(image) {
  var qa = image.select('pixel_qa');
  var radsatQA = image.select('radsat_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // var water = qa.bitwiseAnd(1 << 2);
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  var anySaturated = bitwiseExtract(radsatQA, 1, 7)
  var saturateMask = anySaturated.not()
  return image.updateMask(cloud.not()).updateMask(mask2).updateMask(saturateMask);
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
  // Bits 1 is saturated or defective pixel
  var saturateBitMask = 1 << 1;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0))
      .and(qa.bitwiseAnd(saturateBitMask).eq(0));

  return image.updateMask(mask);
}


// liang
function addAlbedo(image) {
    // var imdate = image.get('system:time_start');
    var albedo = image.expression(
        '(0.356 * b2 + 0.13 * b4 + 0.373 * b5 + 0.085 * b6 + 0.072 * b7 - 0.0018) / 10000',
        {
            b2: image.select('Blue'),
            // b3: image.select('B3'),
            b4: image.select('Red'),
            b5: image.select('NIR'),
            b6: image.select('SWIR1'),
            b7: image.select('SWIR2'),
            // b8: image.select('B8'),
            // b11: image.select('B11'),
            // b12: image.select('B12')
        }
    ).rename('albedo');
    return image.addBands(albedo).copyProperties(image, ['system:time_start']);
}


// Define function to prepare OLI images.
function prepOli(img) {
  var orig = img;
  img = renameOli(img);
  img = maskL8sr(img);
  img = imRangeFilter(img);
  img = addAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}

// Define function to prepare ETM+/TM images.
function prepEtm(img) {
  var orig = img;
  img = renameEtm(img);
  img = cloudMaskL457(img);
  img = etm2oli(img);
  img = imRangeFilter(img);
  img = addAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()));
}

// Define function to prepare S2 images.
function prepS2(img) {
  var orig = img;
  img = renameS2(img);
  img = maskS2clouds(img);
  img = imRangeFilter(img);
  img = addAlbedo(img);
  return ee.Image(img.copyProperties(orig, orig.propertyNames()).set('SATELLITE', 'SENTINEL_2'));
}



// var date_end = ee.Date(Date.now()).format('yyyy-MM-dd')
// var date_start =ee.Date(Date.now()).advance(-2, 'year').format('yyyy-MM-dd');



var tempCol = ee.ImageCollection('NOAA/GFS0P25')
  .filterDate(ee.Date(Date.now()).advance(-1, 'day'), ee.Date(Date.now()).advance(0, 'day'))
  .limit(24)
  .select('temperature_2m_above_ground');

// Define arguments for animation function parameters.
var gifParams = {
  dimensions: 768,
  region: greenlandBound,
  framesPerSecond: 3,
  crs: 'EPSG:3857',
  min: -40.0,
  max: 30.0,
  palette: ['blue', 'purple', 'cyan', 'green', 'yellow', 'red']
};

var gifAnimation = ui.Thumbnail({
  image: tempCol,
  params: gifParams,
  style: {
    position: 'bottom-right',
    width: '300px',
    height: '500px'
  }
});

var gifPanel = ui.Panel({
  widgets: [
    ui.Label('temperature_2m_above_ground\nlimit to 24h\nGFS: Global Forecast System \n384-Hour Predicted Atmosphere Data',
    {whiteSpace: 'pre'}),
    gifAnimation
  ],
  style: {position: 'bottom-right'},
  layout: null,
  });
  
Map.add(gifPanel);



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
//   ee.Filter.date(date_start, date_end),
  ee.Filter.calendarRange(5, 9, 'month'),
  ee.Filter.lt('CLOUD_COVER', 50),
  ee.Filter.lte('GEOMETRIC_RMSE_MODEL', 30),
  // ee.Filter.gt('SUN_ELEVATION', 5),
  ee.Filter.or(
    ee.Filter.eq('IMAGE_QUALITY', 9),
    ee.Filter.eq('IMAGE_QUALITY_OLI', 9)
  )
);

var s2colFilter =  ee.Filter.and(
  ee.Filter.bounds(aoi),
//   ee.Filter.date(date_start, date_end),
  ee.Filter.calendarRange(5, 9, 'month'),
  ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50)
);



// var oliCol = ee.ImageCollection("LANDSAT/LC08/C01/T1_TOA")
var oliCol = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
              .filter(colFilter)
              .map(prepOli);
// var etmCol = ee.ImageCollection("LANDSAT/LE07/C01/T1_TOA")
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
var multiSat = landsatCol.merge(s2Col);

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
  return img.set('albedo', obs.get('albedo'));
});

var chart =
  ui.Chart.feature.groups(allObs, 'system:time_start', 'albedo', 'SATELLITE')
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