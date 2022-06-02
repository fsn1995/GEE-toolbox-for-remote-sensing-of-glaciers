/***
 * This app would allow users to explore and get transect profile of arctic dem and albedo. 
 * shunan.feng@envs.au.dk 
 */

/*
 * Let's import the basemap
 */
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
// Define a pixel coordinate image.
var latLonImg = ee.Image.pixelLonLat();
var mask = arcticDEM.gte(0);
var elevImg = arcticDEM.addBands(latLonImg).updateMask(mask);


var elevationVis = {
  min: 0.0,
  max: 3000.0,
  palette: ['0d13d8', '60e1ff', 'ffffff'],
};
Map.setCenter(-41.0, 74.0, 4);
// Map.setOptions('HYBRID');
Map.addLayer(elevImg.select('elevation'), elevationVis, 'Elevation');


/***
 * The transect extraction template was made by Gennadii Donchyts https://github.com/gena
 * https://code.earthengine.google.com/b09759b8ac60366ee2ae4eccdd19e615.
 * 
 * Reduces image values along the given line string geometry using given reducer.
 * 
 * Samples image values using image native scale, or opt_scale
 */

function reduceImageProfile(image, line, reducer, scale, crs) {
  var length = line.length();
  var distances = ee.List.sequence(0, length, scale)
  var lines = line.cutLines(distances, ee.Number(scale).divide(5)).geometries();
  lines = lines.zip(distances).map(function(l) { 
    l = ee.List(l)
    
    var geom = ee.Geometry(l.get(0))
    var distance = ee.Number(l.get(1))
    
    geom = ee.Geometry.LineString(geom.coordinates())
    
    return ee.Feature(geom, {distance: distance})
  })
  lines = ee.FeatureCollection(lines)

  // reduce image for every segment
  var values = image.reduceRegions( {
    collection: ee.FeatureCollection(lines), 
    reducer: reducer, 
    scale: scale, 
    crs: crs,
    tileScale: 10
  })
  
  return values
}



var drawingTools = Map.drawingTools();

drawingTools.setShown(false);

while (drawingTools.layers().length() > 0) {
var layer = drawingTools.layers().get(0);
drawingTools.layers().remove(layer);
}

var dummyGeometry =
  ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: 'red'});

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

function drawPolyline() {
    clearGeometry();
    drawingTools.setShape('line');
    drawingTools.draw();
}

var chartPanel = ui.Panel({
  style:
    {height: '235px', width: '600px', position: 'middle-right', shown: false}
});
var chartPanel2 = ui.Panel({
    style:
      {height: '235px', width: '600px', position: 'bottom-right', shown: false}
  });
var chartPanel3 = ui.Panel({
  style:
    {height: '235px', width: '600px', position: 'bottom-center', shown: false}
});


Map.add(chartPanel);
Map.add(chartPanel2)
Map.add(chartPanel3)

function chartTimeSeries() {
// Make the chart panel visible the first time a geometry is drawn.
if (!chartPanel.style().get('shown')) {
  chartPanel.style().set('shown', true);
}

if (!chartPanel2.style().get('shown')) {
  chartPanel2.style().set('shown', true);
}

if (!chartPanel3.style().get('shown')) {
  chartPanel3.style().set('shown', true);
}
// Get the drawn geometry; it will define the reduction region.
var transect = drawingTools.layers().get(0).getEeObject();

// Set the drawing mode back to null; turns drawing off.
drawingTools.setShape(null);

// Get coordinates of the polyline
var listCoords = ee.Array.cat(transect.coordinates(), 1); 
// get the X, Y-coordinates
var xCoords = listCoords.slice(0, 0, 1); 
var yCoords = listCoords.slice(0, 1, 2);

// reduce the arrays to find the max (or min) value
var xMin = xCoords.reduce('min', [1]).get([0,0]); 
var xMax = xCoords.reduce('max', [1]).get([0,0]);
var yMin = yCoords.reduce('min', [1]).get([0,0]);
var yMax = yCoords.reduce('max', [1]).get([0,0]);



// reduce arctic dem to polyline
var profile = reduceImageProfile(arcticDEM, transect, ee.Reducer.mean(), 100)


// Reduce elevation and coordinate bands by transect line; get a dictionary with
// band names as keys, pixel values as lists.
var elevTransect = elevImg.reduceRegion({
    reducer: ee.Reducer.toList(),
    geometry: transect,
    scale: 10,
    tileScale: 6
  });

// Get longitude and elevation value lists from the reduction dictionary.
var lon = ee.List(elevTransect.get('longitude'));
var lat = ee.List(elevTransect.get('latitude'));
var elev = ee.List(elevTransect.get('elevation'));

// Sort the longitude and elevation values by ascending longitude.
var lonSort = lon.sort(lon),
    elevLonSort = elev.sort(lon),
    latSort = lat.sort(lat),
    elevLatSort = elev.sort(lat);


// Chart time series for the selected area of interest.
var chart = ui.Chart.feature.byFeature(profile, 'distance', ['mean'])
                            .setOptions({
                                title: 'Elevation Profile Along Transect (reduced to 100m scale)',
                                hAxis: {
                                    title: 'Distance (m)',
                                    titleTextStyle: {italic: false, bold: true}
                                },
                                vAxis: {
                                    title: 'Elevation (m)',
                                    titleTextStyle: {italic: false, bold: true}
                                },
                                colors: ['1d6b99'],
                                lineSize: 5,
                                pointSize: 0,
                                legend: {position: 'none'}
                            })
                            .setChartType('AreaChart');
// Define the chart and print it to the console.
var lonchart = ui.Chart.array.values({array: elevLonSort, axis: 0, xLabels: lonSort})
                .setOptions({
                  title: 'Elevation Profile Across Longitude (reduced to 10m scale)',
                  hAxis: {
                    title: 'Longitude',
                    viewWindow: {min: xMin, max: xMax},
                    titleTextStyle: {italic: false, bold: true}
                  },
                  vAxis: {
                    title: 'Elevation (m)',
                    titleTextStyle: {italic: false, bold: true}
                  },
                  colors: ['1d6b99'],
                  lineSize: 5,
                  pointSize: 0,
                  legend: {position: 'none'}
                })
                .setChartType('AreaChart');
var latchart = ui.Chart.array.values({array: elevLatSort, axis: 0, xLabels: latSort})
                .setOptions({
                  title: 'Elevation Profile Across Latitude (reduced to 10m scale)',
                  hAxis: {
                    title: 'Latitude',
                    viewWindow: {min: yMin, max: yMax},
                    titleTextStyle: {italic: false, bold: true}
                  },
                  vAxis: {
                    title: 'Elevation (m)',
                    titleTextStyle: {italic: false, bold: true}
                  },
                  colors: ['1d6b99'],
                  lineSize: 5,
                  pointSize: 0,
                  legend: {position: 'none'}
                })
                .setChartType('AreaChart');


// Replace the existing chart in the chart panel with the new chart.
chartPanel.widgets().reset([lonchart]);
chartPanel2.widgets().reset([latchart]);
chartPanel3.widgets().reset([chart]);
}


drawingTools.onDraw(ui.util.debounce(chartTimeSeries, 500));
drawingTools.onEdit(ui.util.debounce(chartTimeSeries, 500));


var symbol = {
rectangle: '⬛',
polygon: '🔺',
point: '📍',
line: '📍',
};
// var selectedBand;
// var controlPanel = ui.Panel({
// widgets: [
//   ui.Label('0. Select the band.'),
// //   ui.Select({
// //     items: Object.keys(MODISband),
// //     onChange: function(key) {
// //       selectedBand = MODISband[key];
      
// //   }}),
//   ui.Label('1. Select a drawing mode.'),
//   ui.Button({
//     label: symbol.rectangle + ' Rectangle',
//     onClick: drawRectangle,
//     style: {stretch: 'horizontal'}
//   }),
//   ui.Button({
//     label: symbol.polygon + ' Polygon',
//     onClick: drawPolyline,
//     style: {stretch: 'horizontal'}
//   }),
//   ui.Button({
//     label: symbol.point + ' Point',
//     onClick: drawPoint,
//     style: {stretch: 'horizontal'}
//   }),
//   ui.Label('2. Draw a geometry.'),
//   ui.Label('3. Wait for chart to render.'),
//   ui.Label(
//       '4. Repeat 0-3 or edit/move\ngeometry for a new chart.',
//       {whiteSpace: 'pre'})
// ],
// style: {position: 'bottom-left'},
// layout: null,
// });

// Map.add(controlPanel);
// Map.setCenter(-40.764, 74.817, 5);



// The namespace for our application.  All the state is kept in here.
var app = {};

/** Creates the UI panels. */
app.createPanels = function() {
  /* The introduction section. */
  app.intro = {
    panel: ui.Panel([
      ui.Label({
        value: 'Transect Profile',
        style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
      }),
      ui.Label('This app allows you to get the elevation profile along the line of interest. ' +
               'Simply draw a line on the map! ' + 
               'The basemap is the arcticDEM (2m).')
    ])
  };

  /* The collection filter controls. */
  app.filters = {
    // mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    // scalem: ui.Textbox('scale', '30'),
    // applyButton: ui.Button('Apply Scale', app.applyPoint),
    // loadingLabel: ui.Label({
    //   value: 'Loading...',
    //   style: {stretch: 'vertical', color: 'gray', shown: false}
    // }),
    drawline: ui.Button({
        label: symbol.line + 'Draw a line',
        onClick: drawPolyline,
        style: {stretch: 'horizontal'}
      }),
  };


  
  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('Define line of interest', {fontWeight: 'bold'}),
    //   ui.Label('Scale'), app.filters.scalem,
      // app.filters.mapCenter,
      ui.Panel([
        // app.filters.applyButton,
        // app.filters.loadingLabel,
        app.filters.drawline,
      ], 
      ui.Panel.Layout.flow('horizontal'))
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
    //   app.filters.scalem,
    //   app.filters.applyButton,
      app.filters.drawline,
      // app.picker.select,
      // app.picker.centerButton,
      // app.export.button
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };

  /** Applies the selection filters currently selected in the UI. */
//   app.applyPoint = function() {
//     app.setLoadingMode(false);
//     var scalem = ee.Number.parse(app.filters.scalem.getValue());
//   };

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

/*
 * Legend setup
 */

// Creates a color bar thumbnail image for use in legend from the given color
// palette.
function makeColorBarParams(palette) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x10',
    format: 'png',
    min: 0,
    max: 1,
    palette: palette,
  };
}

// Create the color bar for the legend.
var colorBarDEM = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBarParams(elevationVis.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
});

// Create a panel with three numbers for the legend.
var legendLabelsDEM = ui.Panel({
  widgets: [
    ui.Label(elevationVis.min, {margin: '4px 8px'}),
    ui.Label(
        (elevationVis.max / 2),
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label(elevationVis.max, {margin: '4px 8px'})
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});

var legendTitleDEM = ui.Label({
  value: 'Map Legend: ArcticDEM (m)',
  style: {fontWeight: 'bold'}
});

var legendPanel = ui.Panel([legendTitleDEM, colorBarDEM, legendLabelsDEM]);




/** Creates the application interface. */
app.boot = function() {
  app.createConstants();
  app.createHelpers();
  app.createPanels();
  var main = ui.Panel({
    widgets: [
      app.intro.panel,
      app.filters.panel,
      legendPanel,
      app.deeppurple.logo,
      app.deeppurple.panel
    ],
    style: {width: '320px', padding: '8px'}
  });
  // Map.setCenter(-97, 26, 9);
  ui.root.insert(0, main);

};

app.boot();
