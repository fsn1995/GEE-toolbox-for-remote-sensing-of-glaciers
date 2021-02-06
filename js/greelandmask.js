var greenlandIceOceanMask =  ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK')
var greenlandmask = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK')
                      .select('ice_mask').eq(1); //'ice_mask', 'ocean_mask'
greenlandmask = greenlandmask.updateMask(greenlandmask.eq(1));

var greenlandBound = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK').geometry().bounds();
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var arcticDEMgreenland = arcticDEM.updateMask(greenlandmask);

var elevationVis = {
  min: -50.0,
  max: 2000.0,
  palette: ['0d13d8', '60e1ff', 'ffffff'],
};
Map.addLayer(arcticDEMgreenland, elevationVis, 'Elevation');
Map.addLayer(greenlandmask);
Map.setCenter(-41.0, 74.0, 4);

// Convert the zones of the thresholded nightlights to vectors.
var vectors = greenlandmask.addBands(greenlandIceOceanMask).reduceToVectors({
  geometry: greenlandBound,
//   crs: nl2012.projection(),
  scale: 1000,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'land',
  reducer: ee.Reducer.mean()
});

Export.table.toAsset({
  collection: vectors,
  description:'GreenlandVector',
  assetId: 'GreenlandMask',
});