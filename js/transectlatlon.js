// Define a line across the Olympic Peninsula, USA.
var transect = /* color: #98ff00 */ee.Geometry.LineString(
    [[-49.67198178141577, 64.55308110722518],
     [-42.20127865641577, 64.4916448848632]]);
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var mask = arcticdem.gte(0);
// Define a pixel coordinate image.
var latLonImg = ee.Image.pixelLonLat();

// Import a digital surface model and add latitude and longitude bands.
var elevImg =arcticDEM.addBands(latLonImg).updateMask(mask);

// Reduce elevation and coordinate bands by transect line; get a dictionary with
// band names as keys, pixel values as lists.
var elevTransect = elevImg.reduceRegion({
  reducer: ee.Reducer.toList(),
  geometry: transect,
  scale: 1000,
});

// Get longitude and elevation value lists from the reduction dictionary.
var lon = ee.List(elevTransect.get('longitude'));
var elev = ee.List(elevTransect.get('elevation'));

// Sort the longitude and elevation values by ascending longitude.
var lonSort = lon.sort(lon);
var elevSort = elev.sort(lon);

// Define the chart and print it to the console.
var chart = ui.Chart.array.values({array: elevSort, axis: 0, xLabels: lonSort})
                .setOptions({
                  title: 'Elevation Profile Across Longitude',
                  hAxis: {
                    title: 'Longitude',
                    // viewWindow: {min: -124.50, max: -122.8},
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
                });
print(chart);