/*
 * data-page.js
 *
 * Displays the vacancy percentages of Newcastle's/Palo Alto's parking "zones".
 * These zones are collections of sensors tracking parking spots.
 *
 * Author: Antony Bello
 * Date: 	June 3, 2015
 */

var frameModule = require("ui/frame");
var applicationModule = require("application");
var view = require("ui/core/view");
var uidialogs = require("ui/dialogs");
var labelModule = require("ui/label");
var http = require("http");

exports.pageLoaded = function(args) {

  var page = args.object;
  var panel = view.getViewById(page, "layout");

  // Get info from main-page
  page.bindingContext = page.navigationContext;

  var buttonName = page.bindingContext;

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

  // Send a request to our server and populate the page with data
  var headers = {
    "clickedName": buttonName
  };

  http.request({
    url: "http://spotterengine-47512.onmodulus.net/data",
    method: "POST",
    headers: headers
  }).then(function(response) {
    var arr = JSON.parse(response.content);
    populate(arr, buttonName, panel);
  }, function(err) {
    console.log(err);
  });

};


var populate = function(data, buttonName, panel) {

  var city = ((buttonName === "pabutton") ? "Palo Alto" : "Newcastle");

  var label = new labelModule.Label();
  label.text = "How vacant are the zones in " + city + "?";
  label.id = "title";
  label.textWrap = true;
  panel.addChild(label);

  for (var i = 0; i < data.length; i++) {
    var label = new labelModule.Label();
    label.text = data[i].name + ": " + data[i].vacancy + "%";
    label.textWrap = true;
    label.id = "zones";
    panel.addChild(label);
  }
}
