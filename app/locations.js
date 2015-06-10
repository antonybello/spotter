/*
 * locations.js
 *
 * Retrieves the coordinates of unoccupied parking sensors for zones in
 * Palo Alto.
 *
 * Author: Antony Bello
 * Date: 	June 3, 2015
 */

var frameModule = require("ui/frame");
var applicationModule = require("application");
var view = require("ui/core/view");
var uidialogs = require("ui/dialogs");
var http = require("http");
var locationModule = require("location");
var page;

var FEET_CONVERSION = 3.28084;
var TELERIK_LAT = 37.444618;
var TELERIK_LONG = -122.16326300000003;

exports.pageLoaded = function(args) {

  page = args.object;
  var panel = view.getViewById(page, "layout");

  // Will work!
  var listView1 = view.getViewById(page, "listView1");

  // Make sure we're on iOS before making iOS-specific changes
  if (page.ios) {

    // Tell the frame module that the navigation bar should always display
    frameModule.topmost().ios.navBarVisibility = "always";

    // Change the UIViewController's title property
    page.ios.title = "Results";

    // Get access to the native iOS UINavigationController
    var controller = frameModule.topmost().ios.controller;

    // Call the UINavigationController's setNavigationBarHidden method
    controller.navigationBarHidden = false;
  }

  // Get the coordinates of all sensors in Palo Alto
  http.request({
      url: "http://localhost:8001/occupancies",
      method: "POST"
    }).then(function(response) {
      var parsedContent = JSON.parse(response.content);
      var sortedCoordsArr = getUnoccupiedCoords(parsedContent);
      page.bindingContext = { unoccupiedSensors : sortedCoordsArr }; // Bind to XML
    }),
    function(err) {
      console.log(err);
    };
};


// Get unoccupied sensors from server, with their coordinates and
// sensor IDs
var getUnoccupiedCoords = function(parsedContent) {
  var arr = [];

  if (parsedContent == null) {
    uidialogs.alert("Error retrieving response.");
    return;
  }

  for (var sensor in parsedContent) {

    if (parseInt(parsedContent[sensor].occupancy) == 0) { // Unoccupied
      arr.push({
        'lat': parsedContent[sensor].lat,
        'long': parsedContent[sensor].long,
        'sensorId': sensor
      });
    }
  }
  return (sortByDistance(arr));
}



/*
* Sorts the unoccupied coordinates by their distance away from Telerik. We can
* expand this to the user's last known location, which gets the location found
* by other applications.
*/
var sortByDistance = function(unoccupiedCoordsArr) {

  var LocationManager = locationModule.LocationManager;
  var locationManager = new LocationManager();
  var Location = locationModule.Location;
  var isEnabled = LocationManager.isEnabled();

  var telerikLoc = new Location();
  telerikLoc.latitude = TELERIK_LAT;
  telerikLoc.longitude = TELERIK_LONG;

  var distance;

  // For each unoccupied sensor, add distance from Telerik as a field
  unoccupiedCoordsArr.forEach(function(entry) {

    var tempLoc = new Location();
    tempLoc.latitude = entry.lat;
    tempLoc.longitude = entry.long;

    distance = LocationManager.distance(telerikLoc, tempLoc);
    entry.distance = Math.round(toFeet(distance));
  });

  unoccupiedCoordsArr.sort(function(a, b) {
    return (a.distance < b.distance) ? -1 : ((a.distance > b.distance) ? 1 : 0);
  });

  return unoccupiedCoordsArr;

}

/** Changing fonts **/
exports.itemsLoaded = function(args) {
  var element = args.object;
  element.ios.font = UIFont.fontWithNameSize("HelveticaNeue-Light", 15);
}

exports.titleLoaded = function(args) {
  var element = args.object;
  element.ios.font = UIFont.fontWithNameSize("HelveticaNeue", 18);
}

var toFeet = function(x) {
  return x*FEET_CONVERSION;
}
