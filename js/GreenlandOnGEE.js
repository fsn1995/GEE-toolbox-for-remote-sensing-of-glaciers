/*
This app is to present the albedo product over Greenland Ice Sheet with MODIS data.
Base map is the ArcticDEM. Temperature is taken from NOAA/GFS0P25

The code of this interactive app was mainly adapted from google's tutorial
https://developers.google.com/earth-engine/tutorials/community/drawing-tools-region-reduction?hl=en#result
https://developers.google.com/earth-engine/guides/ic_visualization

shunan.feng@envs.au.dk

*/
var greenlandmask = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK')
                      .select('ocean_mask').eq(0); //'ice_mask', 'ocean_mask'
var greenlandBound = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK').geometry().bounds();
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var arcticDEMgreenland = arcticDEM.updateMask(greenlandmask);

var elevationVis = {
  min: -50.0,
  max: 2000.0,
  palette: ['0d13d8', '60e1ff', 'ffffff'],
};


Map.setCenter(-41.0, 74.0, 4);

// calculate the slope
var DEMterrain = ee.Terrain.products(arcticDEMgreenland);

var imMinMax = DEMterrain.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: greenlandBound,
    scale: 3000,
    // bestEffort: Boolean,
    tileScale: 4
});
print(imMinMax);


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

// var MODISband = [
//   {label:"Black-sky albedo for visible brodband", value: "Albedo_BSA_vis"},
//   {label:"Black-sky albedo for NIR broadband", value: "Albedo_BSA_nir"},
//   {label:"Black-sky albedo for shortwave broadband", value: "Albedo_BSA_shortwave"},
//   {label:"White-sky albedo for visible broadband", value: "Albedo_WSA_vis"},
//   {label:"White-sky albedo for NIR broadband", value: "Albedo_WSA_nir"},
//   {label:"White-sky albedo for shortwave broadband", value: "Albedo_WSA_shortwave"}
// ];


var dataset = ee.ImageCollection('MODIS/006/MCD43A3')
                .map(function(image){
                    return image.divide(1000)
                                .copyProperties(image, ['system:time_start'])
                                .set({date: ee.Date(image.get('system:time_start')).format('YYYY-MM-DD')});
                  });


var date_end = ee.Date(Date.now()).format('yyyy-MM-dd')
var date_start =ee.Date(Date.now()).advance(-2, 'year').format('yyyy-MM-dd');



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
var chart = ui.Chart.image
                .seriesByRegion({
                  imageCollection: dataset.filterDate(date_start, date_end),
                  regions: aoi,
                  reducer: ee.Reducer.mean(),
                  band: selectedBand,
                  scale: scale,
                  xProperty: 'system:time_start'
                })
                .setOptions({
                  titlePostion: 'none',
                  legend: {position: 'none'},
                  hAxis: {title: 'Date'},
                  vAxis: {title: 'albedo'},
                  series: {0: {color: '23cba7'}}
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
  ui.Label('0. Select the band.'),
  ui.Select({
    items: Object.keys(MODISband),
    onChange: function(key) {
      selectedBand = MODISband[key];
      
  }}),
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