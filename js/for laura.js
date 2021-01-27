// var aoi = ee.Geometry.Point(-37.86372, 65.68950);
var roi = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-39.127245971968506, 66.53671089743008],
          [-39.127245971968506, 65.33869833872528],
          [-36.413622925093506, 65.33869833872528],
          [-36.413622925093506, 66.53671089743008]]], null, false);

Map.addLayer(roi);
Map.centerObject(roi);

var year_start = 2018; // 2013-04-11T00:00:00 - Present
var year_end = 2020;
var month_start = 1;
var month_end = 12;

var date_start = ee.Date.fromYMD(year_start, month_start, 1);
var date_end = ee.Date.fromYMD(year_end, month_end, 31);
var years = ee.List.sequence(year_start, year_end);// time range of years
var months = ee.List.sequence(month_start, month_end);// time range of months


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
  .filterDate(date_start, date_end)
  .filterBounds(roi)
  .filter('CLOUDY_PIXEL_PERCENTAGE < 50')
  .map(maskS2clouds);

// Difference in days between start and finish
var diff = date_end.difference(date_start, 'week');

// Make a list of all dates
var weekNum = 1; // steps of week number, 1 is weekly, 2 is biweekly...
var range = ee.List.sequence(0, diff.subtract(1), weekNum).map(function(week){return date_start.advance(week,'week')});

// Funtion for iteraton over the range of dates
var day_mosaics = function(date, newlist) {
  // Cast
  date = ee.Date(date)
  newlist = ee.List(newlist)

  // Filter collection between date and the next day
  var filtered = s2col.filterDate(date, date.advance(weekNum,'week'));

  // Make the mosaic
  var image = ee.Image(filtered.mosaic()).set({date: date.format('yyyy-MM-dd')});

  // Add the mosaic to a list only if the collection has images
  return ee.List(ee.Algorithms.If(filtered.size(), newlist.add(image), newlist));
};
var s2vis = ee.ImageCollection(ee.List(range.iterate(day_mosaics, ee.List([]))));

var text = require('users/gena/packages:text'); 

var visParams = {
    min: 0.0,
    max: 0.3,
    bands: ['B4', 'B3', 'B2'],
  };
var rgbVis = s2vis.map(function(img) {
  return img.visualize(visParams).copyProperties(img, ['date']);
});

// (left | right | top | bottom) and an offset in px or %
var pt = text.getLocation(roi, 'right', '80%', '45%'); 



var scale = 2500,
    textProperty = {
        fontType: 'Arial', // or Consolas
        fontSize: 64,
        textColor: '000000', 
        outlineColor: 'ffffff',
        outlineWidth: 2.5,
        outlineOpacity: 0.6,
    };

  
// print(rgbVis,'rgbVIS');
var rgbGIF = rgbVis.map(function(image) {
    var scale = 250,
    textVisual = {
        fontType: 'Arial', // or Consolas
        fontSize: 64,
        textColor: '000000', 
        outlineColor: 'ffffff',
        outlineWidth: 2.5,
        outlineOpacity: 0.6,
    },
    textLabel = text.draw(ee.String(image.get('date')), pt, scale, textVisual);
    return image.blend(textLabel)
                .copyProperties(image, ['date']);
});

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
    //   width: '320px'
    height: '500px'
    }
});

Map.add(gifAnimation);
// print(gifAnimation); // alternatively you may print it on the console

// // Print the GIF URL to the console.
print('download gif from here: ', rgbGIF.getVideoThumbURL(gifParams));

