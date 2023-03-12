/*
Reference: https://twitter.com/jstnbraaten/status/1580621682393300992?s=20&t=KMkGuLN8U7Ub7PQIF2dtRQ
*/
var map1 = ui.Map().setOptions('Hybrid').setZoom(11);
var map2 = ui.Map().setOptions('Hybrid').setZoom(14);
var map3 = ui.Map().setOptions('Hybrid').setZoom(17);

var linker = ui.Map.Linker([map1, map2, map3], 'change-center');

var split1 = ui.Panel(ui.SplitPanel({
  firstPanel: map1,
  secondPanel: map2,
  orientation: 'horizontal',
  wipe: false,
}), null, {width: '66%'});

var split2 = ui.Panel(ui.SplitPanel({
  firstPanel: split1,
  secondPanel: ui.Panel(map3),
  orientation: 'horizontal',
  wipe: false,
}), null, {height: '100%', width: '100%'});

ui.root.clear();
ui.root.insert(0, split2);

map1.setControlVisibility(false);
map2.setControlVisibility(false);
map3.setControlVisibility(false);

// START: set_these
var lon = -49.684724;
var lat = 69.684724;
var moveLon = 0.0004;  // degrees
var nMoves = 500;
var moveRate = 10; // milliseconds
// END: set_these

var lonStart = lon;
map3.setCenter(lon, lat);

ui.util.setInterval(function() {
  lon += moveLon;
  if (lon < lonStart + (nMoves * moveLon)) {
    map3.setCenter(lon, lat);
  }
}, moveRate);
