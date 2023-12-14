/*
This app aims to visualize time series of true color composite of satellite imagery
for monitoring the glaicer change on Greenland Ice Sheet. 

The code is modified based on google's tutorial 
https://developers.google.com/earth-engine/guides/ui_panels


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

// Cloud Score+ image collection. Note Cloud Score+ is produced from Sentinel-2
// Level 1C data and can be applied to either L1C or L2A collections.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// Use 'cs' or 'cs_cdf', depending on your use case; see docs for guidance.
var QA_BAND = 'cs';

// The threshold for masking; values between 0.50 and 0.65 generally work well.
// Higher values will remove thin clouds, haze & cirrus shadows.
var CLEAR_THRESHOLD = 0.65;

// Make a clear median composite.
var s2col = ee.ImageCollection("COPERNICUS/S2")
  .linkCollection(csPlus, [QA_BAND])
  .map(function(img) {
    return img.updateMask(img.select(QA_BAND).gte(CLEAR_THRESHOLD)).divide(10000).copyProperties(img, ['system:time_start']);
  });


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
    max: 1,
    bands: ['B4', 'B3', 'B2'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    // var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
    leftMap.layers().set(0, layer); //Map.layers().set(0, layer);
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
    max: 1,
    bands: ['B4', 'B3', 'B2'],
  };
  var layer = ui.Map.Layer(mosaic, visParams, 'weekly mosaic');
  range.start().get('date').evaluate(function(name) {
    // var visParams = {bands: ['B4', 'B3', 'B2'], max: 100};
    rightMap.layers().set(0, layer); //Map.layers().set(0, layer);
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
var initialPoint = ee.Geometry.Point(-50.3736, 71.1445); 
leftMap.centerObject(initialPoint, 10);





// Add point of interest 

// The namespace for our application.  All the state is kept in here.
var app = {};

/** Creates the UI panels. */
app.createPanels = function() {
  /* The introduction section. */
  app.intro = {
    panel: ui.Panel([
      ui.Label({
        value: 'I See Glacier!',
        style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
      }),
      ui.Label('This app allows you to explore Sentinel 2 images ' +
               'with a split panel.' + 
               'Yes we can see more than just glaciers!')
    ])
  };

  /* The collection filter controls. */
  app.filters = {
    // mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    lat: ui.Textbox('lat (e.g. 74.817)'),
    lon: ui.Textbox('lon (e.g. -40.764)'),
    applyButton: ui.Button('Load Point', app.applyPoint),
    loadingLabel: ui.Label({
      value: 'Loading...',
      style: {stretch: 'vertical', color: 'gray', shown: false}
    })
  };


  
  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('Select site (coordinate in decimal degrees)', {fontWeight: 'bold'}),
      ui.Label('Latitude'), app.filters.lat,
      ui.Label('Longitude'), app.filters.lon,
      // app.filters.mapCenter,
      ui.Panel([
        app.filters.applyButton,
        app.filters.loadingLabel
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });
  /*  panel for logo and deep purple website */
  var logo = ee.Image('projects/ee-deeppurple/assets/dplogo').visualize({
    bands:  ['b1', 'b2', 'b3'],
    min: 0,
    max: 255
    });
  var thumb = ui.Thumbnail({
    image: logo,
    params: {
        dimensions: '107x111',
        format: 'png'
        },
    style: {height: '107px', width: '111px',padding :'0'}
    });

  app.deeppurple ={
    logo: ui.Panel(thumb, 'flow', {width: '120px'}),
    panel: ui.Panel([
      ui.Label("The Deep Purple project receives funding from the European Research Council (ERC) under the European Union's Horizon 2020 research and innovation programme under grant agreement No 856416."),
      ui.Label("https://www.deeppurple-ercsyg.eu/home", {}, "https://www.deeppurple-ercsyg.eu/home"),
      ui.Label("https://github.com/fsn1995/GEE-toolbox-for-remote-sensing-of-glaciers", {}, "https://github.com/fsn1995/GEE-toolbox-for-remote-sensing-of-glaciers")
    ])
  };
}


//   /* The panel for the export section with corresponding widgets. */
//   app.export.panel = ui.Panel({
//     widgets: [
//       ui.Label('4) Start an export', {fontWeight: 'bold'}),
//       app.export.button
//     ],
//     style: app.SECTION_STYLE
//   });
// };

/** Creates the app helper functions. */
app.createHelpers = function() {
  /**
   * Enables or disables loading mode.
   * @param {boolean} enabled Whether loading mode is enabled.
   */
  app.setLoadingMode = function(enabled) {
    // Set the loading label visibility to the enabled mode.
    app.filters.loadingLabel.style().set('shown', enabled);
    // Set each of the widgets to the given enabled mode.
    var loadDependentWidgets = [
      // app.vis.select,
      app.filters.lat,
      app.filters.lon,
      app.filters.applyButton,
      // app.filters.mapCenter,
      // app.picker.select,
      // app.picker.centerButton,
      // app.export.button
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };

  /** Applies the selection filters currently selected in the UI. */
  app.applyPoint = function() {
    app.setLoadingMode(false);
    var poi = ee.Geometry.Point([ee.Number.parse(app.filters.lon.getValue()), ee.Number.parse(app.filters.lat.getValue())]);
    var dot = ui.Map.Layer(poi, {color: 'red',  pointSize: 5, pointShape: 'circle'}, 'poi');
    leftMap.layers().set(1,dot);
    var dot2 = ui.Map.Layer(poi, {color: 'red', pointSize: 5, pointShape: 'circle'}, 'poi');
    rightMap.layers().set(1,dot2);
    leftMap.centerObject(poi, 6);
  };

};
 

/** Creates the app constants. */
app.createConstants = function() {
  // app.COLLECTION_ID = 'LANDSAT/LC08/C01/T1_RT_TOA';
  app.SECTION_STYLE = {margin: '20px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
};

/** Creates the application interface. */
app.boot = function() {
  app.createConstants();
  app.createHelpers();
  app.createPanels();
  var main = ui.Panel({
    widgets: [
      app.intro.panel,
      app.filters.panel,
      app.deeppurple.logo,
      app.deeppurple.panel
    ],
    style: {width: '320px', padding: '8px'}
  });
  // Map.setCenter(-97, 26, 9);
  ui.root.insert(0, main);

};

app.boot();



