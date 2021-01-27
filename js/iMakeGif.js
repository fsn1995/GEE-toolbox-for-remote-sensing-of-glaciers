// // var aoi = ee.Geometry.Point(-37.86372, 65.68950);
var roi = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-81.25237281895075, 77.96375560277475],
          [-81.25237281895075, 59.338502878080575],
          [-39.943779068950754, 59.338502878080575],
          [-39.943779068950754, 77.96375560277475]]], null, false);
// Map.addLayer(roi);
// Map.centerObject(roi);
/*
This is to generate gif animation of remote sensing albedo product.

Reference: 
https://developers.google.com/earth-engine/tutorials/community/modis-ndvi-time-series-animation
https://github.com/gee-community/ee-palettes


Shunan Feng 
shunan.feng@envs.au.dk
20210118
*/

// var land = ee.Image('MODIS/MOD44W/MOD44W_005_2000_02_24');
// // Define an empty image to paint features to.
// var empty = ee.Image().byte();

// // // Paint country feature edges to the empty image.
// // var coastline = empty
// //   .paint({featureCollection: land, color: 1, width: 1})
// //   // Convert to an RGB visualization image; set line color to black.
// //   .visualize({palette: '000000'});

// var hillshade = ee.Terrain.hillshade(ee.Image('USGS/SRTMGL1_003')
// // Exaggerate the elevation to increase contrast in hillshade.
// .multiply(100))
// // Clip the DEM by South American boundary to clean boundary between
// // land and ocean.
// .clipToCollection(land);



// study time range
var year_start = 2011; //  MODIS 2000-02-18T00:00:00 - Present
var year_end = 2020;
var month_start = 1;
var month_end = 12;

var date_start = ee.Date.fromYMD(year_start, 1, 1);
var date_end = ee.Date.fromYMD(year_end, 12, 31);
var years = ee.List.sequence(year_start, year_end);// time range of years
var months = ee.List.sequence(month_start, month_end);// time range of months


// import data
/*
Albedo_BSA_vis Black-sky albedo for visible brodband
Albedo_BSA_nir Black-sky albedo for NIR broadband
Albedo_BSA_shortwave Black-sky albedo for shortwave broadband
replace BSA with WSA for white scky albedo
https://developers.google.com/earth-engine/datasets/catalog/MODIS_006_MCD43A3
*/
var dataset = ee.ImageCollection('NASA/OCEANDATA/MODIS-Aqua/L3SMI')
                .select(['Rrs_645', 'Rrs_555', 'Rrs_443'])
                .filterBounds(roi)
                .map(function(image){
                    return image.clip(roi); // clip by roi
                  });



// sytstem time is set as 1st of each month

var dataMonthly = ee.ImageCollection.fromImages(
    years.map(function (y) {
        return months.map(function(m) {
            var vi = dataset
                         .filter(ee.Filter.calendarRange(y, y, 'year'))
                         .filter(ee.Filter.calendarRange(m, m, 'month'))
                         .median();
                        //  .rename('albedo');
            return vi.set('year', y)
                     .set('month', m)
                     .set({date: ee.Date.fromYMD(y, m, 1).format('yyyy-MM-dd')});
        });
    }).flatten()
);

// print(albedoMonthly);

// add annotations

var text = require('users/gena/packages:text'); 
// var style = require('users/gena/packages:style');
// var palettes = require('users/gena/packages:palettes');

var pt = text.getLocation(roi, 'right', '80%', '35%');

// var palette = palettes.niccoli.linearl[7];

var textProperty = { fontSize: 32, textColor: 'black' };


    
// Define RGB visualization parameters.
var visParams = {
  min: 0.0,
  max: 0.011,
  bands:['Rrs_645', 'Rrs_555', 'Rrs_443'],
};

// var mapScale = Map.getScale();
// var scale = mapScale > 5000 ? mapScale * 2 : 5000;

// Create RGB visualization images for use as animation frames.
var rgbVis = dataMonthly.map(function(img) {
  return img.visualize(visParams).copyProperties(img, ['date']);
});
// print(rgbVis,'rgbVIS');
var rgbGIF = rgbVis.map(function(image) {
    var scale = 10000,
    textVisual = {
        fontType: 'Arial',
        fontSize: 32,
        textColor: '000000', 
        outlineColor: 'ffffff',
        outlineWidth: 2.5,
        outlineOpacity: 0.6,
    },
    textLabel = text.draw(ee.String(image.get('date')), pt, scale, textVisual);
    return image                .blend(textLabel)
                .copyProperties(image, ['date']);
});

// print(rgbGIF);
// Define GIF visualization arguments.
var gifParams = {
  'region': roi,
  'dimensions': 500,
  'crs': 'EPSG:3857',
  'framesPerSecond': 1,
  'format': 'gif'
};

var gifAnimation = ui.Thumbnail({
    image: rgbGIF,
    params: gifParams,
    style: {
      position: 'bottom-right',
      // width: '320px'
      height: '500px'
    }
});

Map.add(gifAnimation);
// print(gifAnimation); // alternatively you may print it on the console

// // Print the GIF URL to the console.
print('download gif from here: ', rgbGIF.getVideoThumbURL(gifParams));

// // Render the GIF animation in the console.
// print(ui.Thumbnail(rgbGIF, gifParams));