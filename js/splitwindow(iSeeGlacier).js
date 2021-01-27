/*
This app aims to visualize time series of true color composite of satellite imagery
for monitoring the glaicer change on Greenland Ice Sheet. 

The code is modified based on google's tutorial 
https://developers.google.com/earth-engine/guides/ui_panels
https://google.earthengine.app/view/split-panel

shunan.feng@envs.au.dk
*/

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

// prepare sentinel data

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000).copyProperties(image, ['system:time_start']);
}


var s2col = ee.ImageCollection("COPERNICUS/S2") 
//   .filterDate(date_start, date_end)
//   .filterBounds(roi)
  .filter('CLOUDY_PIXEL_PERCENTAGE < 50')
  .map(maskS2clouds);

var date_start = ee.Image(s2col.first()).date().format('yyyy-MM-dd'),
    date_end = ee.Date(Date.now()).format('yyyy-MM-dd'),
    now = Date.now();
// print(date_start);
// print(date_end);



/*
 Set up show mosaic
 Run this function on a change of the dateSlider.
 */

var showMosaic1 = function(range) {
  var mosaic = s2col.filterDate(range.start(), range.end()).median();
  // Asynchronously compute the name of the composite.  Display it.
  var visParams = {
    min: 0.0,
    max: 0.5,
    bands: ['B4', 'B3', 'B2'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
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
  var mosaic = s2col.filterDate(range.start(), range.end()).median();
  // Asynchronously compute the name of the composite.  Display it.
  var visParams = {
    min: 0.0,
    max: 0.5,
    bands: ['B4', 'B3', 'B2'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
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
