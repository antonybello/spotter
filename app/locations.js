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

var page;

var LocationManager = locationModule.LocationManager;
var locationManager = new LocationManager();
var Location = locationModule.Location;

var camera, mapView, marker;
var cityHeader = {'city': ''};


var MODULUS_URL = ''; // <=== MODULUS URL HERE!!
var PA_LAT = 37.444926;
var PA_LONG = -122.161609;
var LG_LAT = 37.221892;
var LG_LONG = -121.984288;
var PA_ZOOM = 16;
var LG_ZOOM = 15;
var INIT_ZOOM = 9;
var API_KEY = ''; // <=== GOOGLE API KEY HERE!!

var paLoc = makeLocation(PA_LAT, PA_LONG);
var lgLoc = makeLocation(LG_LAT, LG_LONG);

exports.pageLoaded = function(args) {

  page = args.object;
  page.bindingContext = page.navigationContext;

  // Make sure we're on iOS before making iOS-specific changes
  if (page.ios) {
    frameModule.topmost().ios.navBarVisibility = "always";
    page.ios.title = "Spotter";
    var controller = frameModule.topmost().ios.controller;
    controller.navigationBarHidden = false;
  }

  // Call function depending on user choice
  if (page.bindingContext === 'nearme') showUnoccupiedSpotsNearMe();
  else showUnoccupiedSpotsNearLoc(page.bindingContext);

}

// Sets up the initial map
exports.createMapView = function(args) {
  camera = GMSCameraPosition.cameraWithLatitudeLongitudeZoom(PA_LAT,PA_LONG,INIT_ZOOM);
  mapView = GMSMapView.mapWithFrameCamera(CGRectZero, camera);
  args.view = mapView;
}

// Displays the user's location along with unoccupied parking spots nearby
function showUnoccupiedSpotsNearMe() {
  var lastKnown = monitorLocationAndReturnLastKnown();
  var zoomParams = setHeadersBasedOnDistance(lgLoc, paLoc, lastKnown);
  zoomToLocation(zoomParams.lat, zoomParams.long, zoomParams.zoom);
  mapView.myLocationEnabled = true;
  makeCallAndPlaceUnoccupiedMarkers();
}

// Displays the inputted address along with unoccupied spots nearby. Uses
// Google's Geocoding API to get GPS coords of address
function showUnoccupiedSpotsNearLoc(address) {
  http.request({
    url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address
      + '&key=' + API_KEY
  }).then(function(response) {
    var parsedContent = JSON.parse(response.content);
    var addressLoc = processResponseAndAddMarker(parsedContent);
    var zoomParams = setHeadersBasedOnDistance(lgLoc, paLoc, addressLoc);
    makeCallAndPlaceUnoccupiedMarkers();
    zoomToLocation(zoomParams.lat, zoomParams.long, zoomParams.zoom);
  }), function(err) {
    uidialogs.alert("Error getting location: " + err);
  };
}

// Makes call to the Modulus server for parking spots, and filters out the
// unoccupied ones.
function makeCallAndPlaceUnoccupiedMarkers() {
  var occupancy, lat, long;
  http.request({
      url: MODULUS_URL + "/occupancies",
      method: "POST",
      headers: cityHeader
    }).then(function(response) {
      var parsedContent = JSON.parse(response.content);
      for (var sensor in parsedContent) {
        occupancy = parseInt(parsedContent[sensor].occupancy);
        if (occupancy == 0) { // Unoccupied
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
}

// Returns current location.
function monitorLocationAndReturnLastKnown() {
  var locationOptions = { timeout: 1000 };
  locationManager.startLocationMonitoring(function (location) {},
    function (error) {
      console.log('Location error received: ' + error);
    }, locationOptions);
  locationManager.stopLocationMonitoring();
  return locationManager.lastKnownLocation;
}

// Specifies the city whose parking spots we want. This is to avoid calling
// the server for both locations when we only want one.
function setHeadersBasedOnDistance(lg, pa, theLoc) {

  var distanceToLG = LocationManager.distance(theLoc, lg);
  var distanceToPA = LocationManager.distance(theLoc, pa);
  var zoom;

  if (distanceToPA <= distanceToLG)  {
    cityHeader.city = 'Palo Alto';
    console.log(cityHeader.city);
    zoom = PA_ZOOM;
  } else {
    cityHeader.city = 'Los Gatos';
    console.log(cityHeader.city);
    zoom = LG_ZOOM;
  }
  return makeZoomParameters(theLoc.latitude, theLoc.longitude, zoom);
}

// Processes geocoded data from Google's Geocoding API. Places marker on
// the inputted address, and returns the address as a Location object.
function processResponseAndAddMarker(parsedRes) {
  var lat =  parsedRes.results[0].geometry.location.lat;
  var long = parsedRes.results[0].geometry.location.lng;
  marker = GMSMarker.alloc().init(); // Place markers on map
  marker.position = {
    latitude: lat,
    longitude: long
  };
  marker.title = "Desired Location!";
  marker.map = mapView;
  return makeLocation(lat,long);
}

// Create a Location object out of GPS coordinates
function makeLocation(lat,long) {
  var loc = new Location();
  loc.latitude = lat;
  loc.longitude = long;
  return loc;
}

function makeZoomParameters(lat,long,zoom) {
  return {lat: lat, long:long, zoom: zoom};
}

function zoomToLocation(lat,long,zoom) {
  mapView.animateToLocation(CLLocationCoordinate2DMake(lat,long));
  mapView.animateToZoom(zoom);
}
