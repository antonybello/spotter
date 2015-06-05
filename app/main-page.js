/*
 * main-page.js
 *
 * Simple page with two buttons. User clicks on a button to see the vacancy of
 * parking areas in Palo Alto / Newcastle. Queries are run through the VIMOC
 * API, sent through a Node server hosted on Modulus. Results are returned on
 * data-page.
 *
 * Author: Antony Bello
 * Date: 	June 3, 2015
 */

var frameModule = require("ui/frame");
var applicationModule = require("application");
var uidialogs = require("ui/dialogs");
var view = require("ui/core/view");
var observableModule = require("data/observable");
var http = require("http");


exports.pageLoaded = function(args) {

  var page = args.object;

  // Make sure we're on iOS before making iOS-specific changes
  if (page.ios) {

    // Tell the frame module that the navigation bar should always display
    frameModule.topmost().ios.navBarVisibility = "always";

    // Change the UIViewController's title property
    page.ios.title = "Spots";

    // Get access to the native iOS UINavigationController
    var controller = frameModule.topmost().ios.controller;

    // Call the UINavigationController's setNavigationBarHidden method
    controller.navigationBarHidden = false;
  }
};

/* Sends a POST request to our node server, telling it which button was clicked */
exports.query = function(args) {

  var buttonName = args.object.id;

  var headers = {
    "clickedName": buttonName
  };

  http.request({
    url: "http://spotterengine-47512.onmodulus.net/data", // Modulus URL
    method: "POST",
    headers: headers
  }).then(function(response) { // Navigate to results page once request is sent
    if (response.statusCode === 201) {
      frameModule.topmost().navigate({
        moduleName: "data-page",
        context: buttonName,
        animated: false
      });
    } else {
      uidialogs.alert("Error retrieving response.");
    }
  }, function(err) {
    console.log(err);
  });
}
