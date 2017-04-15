var params = require('../config.js');
var xhr = require('xhr');

module.exports = function(origin, waypoints, callback) {
  xhr({
    url: "https://api.mapbox.com/optimized-trips/v1/mapbox/walking/" + origin + ";" + waypoints + "?access_token=" + params.api_key + "&geometries=geojson&steps=true"
  }, function(err, response, body) {
    if (err) return callback(err);
    return callback(err, JSON.parse(body)); 
  });
};
