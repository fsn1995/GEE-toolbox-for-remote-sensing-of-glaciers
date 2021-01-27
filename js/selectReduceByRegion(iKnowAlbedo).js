/*
This app is to present the albedo product over Greenland Ice Sheet.

The code of this interactive app was mainly adapted from
https://developers.google.com/earth-engine/tutorials/community/drawing-tools-region-reduction?hl=en#result
*/

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
    {height: '235px', width: '600px', position: 'bottom-right', shown: false}
});

Map.add(chartPanel);

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
// var addChart = ui.Select({
//   items: Object.keys(MODISband),
//   onChange: function(key) {
//     var chart = ui.Chart.image
//             .seriesByRegion({
//               imageCollection: ee.ImageCollection('MODIS/006/MCD43A3'),
//               regions: aoi,
//               reducer: ee.Reducer.mean(),
//               band: MODISband[key],
//               scale: scale,
//               xProperty: 'system:time_start'
//             });
//     return chartPanel.widgets().reset([chart])
//   }
// });
// print(addChart)
// Chart time series for the selected area of interest.
var chart = ui.Chart.image
                .seriesByRegion({
                  imageCollection: ee.ImageCollection('MODIS/006/MCD43A3'),
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
                  vAxis: {title: 'albedo (x1e4)'},
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
      '4. Repeat 1-3 or edit/move\ngeometry for a new chart.',
      {whiteSpace: 'pre'})
],
style: {position: 'bottom-left'},
layout: null,
});

Map.add(controlPanel);
// Map.setCenter(-40.764, 74.817, 5);