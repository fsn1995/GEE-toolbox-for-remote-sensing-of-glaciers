


var greenlandmask = ee.Image('OSU/GIMP/2000_ICE_OCEAN_MASK')
                      .select('ocean_mask').eq(0); //'ice_mask', 'ocean_mask'
// var greenlandroi = greenlandmask.geometry().bounds();
var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var arcticDEMgreenland = arcticDEM.updateMask(greenlandmask);


Map.setCenter(-41.0, 74.0, 4);




var arcticDEM = ee.Image('UMN/PGC/ArcticDEM/V3/2m_mosaic');
var elevationVis = {
  min: -50.0,
  max: 2000.0,
  palette: ['0d13d8', '60e1ff', 'ffffff'],
};
Map.addLayer(arcticDEM.updateMask(greenlandmask.eq(1)), elevationVis, 'Elevation');