/*
 * locations.js
 *
 * Retrieves the coordinates of unoccupied parking sensors for zones in
 * Palo Alto and Los Gatos, and displays them on a map.
 *
 * Author: Antony Bello
 * Date: 	June 15, 2015
 */

var frameModule = require("ui/frame");
var http = require("http");
var locationModule = require("location");
var uidialogs = require("ui/dialogs");

var camera, mapView, marker, myLocation;

var PA_LAT = 37.444926;
var PA_LONG = -122.161609;
var LG_LAT = 37.221892;
var LG_LONG = -121.984288;
var PA_ZOOM = 17;
var LG_ZOOM = 15;

exports.pageLoaded = function(args) {

  var page = args.object;

  // Make sure we're on iOS before making iOS-specific changes
  if (page.ios) {

    // Tell the frame module that the navigation bar should always display
    frameModule.topmost().ios.navBarVisibility = "always";

    // Change the UIViewController's title property
    page.ios.title = "Spotter";

    // Get access to the native iOS UINavigationController
    var controller = frameModule.topmost().ios.controller;

    // Call the UINavigationController's setNavigationBarHidden method
    controller.navigationBarHidden = false;

  }

}

/*
* Creates the map view. Map is centered around the city that is closer to the
* user. HTTP request is sent to the node server which returns a list of
* sensors with their GPS Coordinates, and the Google Maps API places markers
* on all the unoccupied spots in that city.
*/
exports.createMapView = function(args) {

  var LocationManager = locationModule.LocationManager;
  var locationManager = new LocationManager();
  var Location = locationModule.Location;

  var paLoc = new Location();
  paLoc.latitude = PA_LAT;
  paLoc.longitude = PA_LONG;

  var lgLoc = new Location();
  lgLoc.latitude = LG_LAT;
  lgLoc.longitude = LG_LONG;

  var locationOptions = {
      timeout: 1000
  };

  locationManager.startLocationMonitoring(function (location) {},
    function (error) {
      console.log('Location error received: ' + error);
    }, locationOptions);


  var lastKnown = locationManager.lastKnownLocation;
  var distanceToPA = LocationManager.distance(lastKnown, paLoc);
  var distanceToLG =  LocationManager.distance(lastKnown, lgLoc);
  locationManager.stopLocationMonitoring();

  var headers = {'city': ''};
  if (distanceToPA <= distanceToLG)  {
      camera = GMSCameraPosition.cameraWithLatitudeLongitudeZoom(PA_LAT,PA_LONG,PA_ZOOM);
      headers.city = 'Palo Alto';
  } else {
      camera = GMSCameraPosition.cameraWithLatitudeLongitudeZoom(LG_LAT,LG_LONG,LG_ZOOM);
      headers.city = 'Los Gatos';
  }

  mapView = GMSMapView.mapWithFrameCamera(CGRectZero, camera);

  myLocation = GMSMarker.alloc().init();
  myLocation.position = {
    latitude: lastKnown.latitude,
    longitude: lastKnown.longitude
  };
  myLocation.title = "You are here!";
  myLocation.map = mapView;

  var occupancy, lat, long;

  // Get the coordinates of all sensors depending on distance from cities
  http.request({
      url: "http://spotterengine-47512.onmodulus.net/occupancies",
      method: "POST",
      headers: headers
    }).then(function(response) {
      var parsedContent = JSON.parse(response.content);
      for (var sensor in parsedContent) {
        occupancy = parseInt(parsedContent[sensor].occupancy);
        if (occupancy == 0) {
          lat = parseFloat(parsedContent[sensor].lat);
          long = parseFloat(parsedContent[sensor].long);
          marker = GMSMarker.alloc().init(); // Place markers on map
          marker.position = {
            latitude: lat,
            longitude: long
          };
          marker.title = "Sensor: " + sensor;
          marker.map = mapView;
        }
      }
    }),
    function(err) {
      uidialogs.alert("Error retrieving server response");
      console.log(err);
    };
  args.view = mapView;
}
