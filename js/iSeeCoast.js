// // var aoi = ee.Geometry.Point(-37.86372, 65.68950);
var roi = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-54.81294031155407, 70.28464754032606],
          [-54.81294031155407, 68.24412935418061],
          [-48.69355554592907, 68.24412935418061],
          [-48.69355554592907, 70.28464754032606]]], null, false);
// Map.addLayer(roi);
// Map.centerObject(roi);

var year_start = 2020; // 2013-04-11T00:00:00 - Present
var year_end = 2020;
var month_start = 5;
var month_end = 10;

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




var OLCI_scale = ee.Image([0.0139465,0.0133873,0.0121481,0.0115198,0.0100953,
                           0.0123538,0.00879161,0.00876539,0.0095103,0.00773378,
                           0.00675523,0.0071996,0.00749684,0.0086512,0.00526779,
                           0.00530267,0.00493004,0.00549962,0.00502847,0.00326378,0.00324118]);

var bnames = ['Oa01_radiance','Oa02_radiance','Oa03_radiance','Oa04_radiance','Oa05_radiance',
              'Oa06_radiance','Oa07_radiance','Oa08_radiance','Oa09_radiance','Oa10_radiance',
              'Oa11_radiance','Oa12_radiance','Oa13_radiance','Oa14_radiance','Oa15_radiance',
              'Oa16_radiance','Oa17_radiance','Oa18_radiance','Oa19_radiance','Oa20_radiance','Oa21_radiance'];

var s3col = ee.ImageCollection('COPERNICUS/S3/OLCI')
  .select(bnames)
  .filterDate(date_start, date_end)
  .filterBounds(roi)
  .map(function(image) {
      return image.multiply(ee.Image(OLCI_scale))
                  .copyProperties(image, ['system:time_start']);
  });
// Difference in days between start and finish
var diff = date_end.difference(date_start, 'day');

// Make a list of all dates
var dayNum = 2; // steps of week number, 1 is weekly, 2 is biweekly...
var range = ee.List.sequence(0, diff.subtract(1), dayNum).map(function(day){return date_start.advance(day,'day')});

// Funtion for iteraton over the range of dates
var day_mosaics = function(date, newlist) {
  // Cast
  date = ee.Date(date)
  newlist = ee.List(newlist)

  // Filter collection between date and the next day
  var filtered = s3col.filterDate(date, date.advance(dayNum,'day'));

  // Make the mosaic
  var image = ee.Image(filtered.mosaic()).set({date: date.format('yyyy-MM-dd')});

  // Add the mosaic to a list only if the collection has images
  return ee.List(ee.Algorithms.If(filtered.size(), newlist.add(image), newlist));
};
var s3vis = ee.ImageCollection(ee.List(range.iterate(day_mosaics, ee.List([]))));

var text = require('users/gena/packages:text'); 

var visParams = {
    min: 0,
    max: 3,
    gamma: 1.5,
    bands: ['Oa08_radiance', 'Oa06_radiance', 'Oa04_radiance'],
  };
var rgbVis = s3vis.map(function(img) {
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

