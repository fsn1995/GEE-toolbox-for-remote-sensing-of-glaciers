var aoi = ee.Geometry.Point(-37.86372, 65.68950);
var roi = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-38.566943237593506, 66.19759805909086],
          [-38.566943237593506, 65.33869833872528],
          [-36.413622925093506, 65.33869833872528],
          [-36.413622925093506, 66.19759805909086]]], null, false);

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

  return image.updateMask(mask);
}


var s2col = ee.ImageCollection("COPERNICUS/S2") 
  .filterDate(date_start, date_end)
  .filterBounds(aoi)
  .filter('CLOUDY_PIXEL_PERCENTAGE < 50')
  .map(maskS2clouds);


// Define visualization arguments.
var visArgs = {bands: ['B4', 'B3', 'B2'], min: 300, max: 3500};

// Define a function to convert an image to an RGB visualization image and copy
// properties from the original image to the RGB image.
var visFun = function(img) {
  return img.visualize(visArgs).copyProperties(img, img.propertyNames());
};

// Map over the image collection to convert each image to an RGB visualization
// using the previously defined visualization function.
var s2colVis = s2col.map(visFun);


// Define arguments for animation function parameters.
var gifParams = {
    'region': roi,
    'dimensions': 500,
    'crs': 'EPSG:3857',
    'framesPerSecond': 1,
    'format': 'gif'
  };
  
// Print the animation to the console as a ui.Thumbnail using the above defined
// arguments. Note that ui.Thumbnail produces an animation when the first input
// is an ee.ImageCollection instead of an ee.Image.
print(ui.Thumbnail(s2colVis, gifParams));

// Alternatively, print a URL that will produce the animation when accessed.
print(s2colVis.getVideoThumbURL(gifParams));