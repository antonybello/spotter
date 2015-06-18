var application = require("application");

application.onLaunch = function() {
    console.log('Providing GoogleMap API key...');
    // NOTE: Use the Google documentation to obtain API key: https://developers.google.com/maps/documentation/ios/start
    GMSServices.provideAPIKey(""); // API KEY HERE!
}

application.mainModule = "main-page";
application.cssFile = "./app.css";
application.start();
