 // This will let you use the .remove() function later on
  if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
      if (this.parentNode) {
          this.parentNode.removeChild(this);
      }
    };
  }

  function getQueryVariable(variable) {
    var query = window.location.hash.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) == variable) {
        return decodeURIComponent(pair[1]);
      }
    }
    var hash = query.split('/');

    console.log('Query variable %s not found', variable);
  }
  var igToken = getQueryVariable('access_token');


var mapboxgl = require('mapbox-gl');
var getOptimizedTrip = require('./getOptimizedTrip.js');
var $ = require("jquery");

var total_stops = document.getElementById('total-stops'),
  total_time = document.getElementById('total-time'),
  info_wrapper = document.getElementById('info-wrapper'),
  total_distance = document.getElementById('total-distance'),
  map_spinner = document.getElementById('map-spinner'),
  spinner_div = document.getElementById('spinner-div'),
  green = '#04ff00',
  origin,
  origin_coords = [-122.6576754579404,45.51468575940848],
  stops_coordinates = [],
  counter = 0,
  // Holds mousedown state for events. if this
  // flag is active, we move the point on `mousemove`.
  isDragging,
  // Is the cursor over a point? if this
  // flag is active, we listen for a mousedown event.
  isCursorOverPoint,
  sonarMarker,
  trip;

// mapbox.mapbox-traffic-v1
mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhZmEiLCJhIjoiY2oxbnJkOHlpMDB2eTJ3a2EyaW8zYTg3NyJ9.KpattAxL6iFzfpxt5rFrVw';

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/grafa/cj1tpfitc001y2so6bci14wug', //DWP Greenloop style
    center: [-122.6576754579404,45.51468575940848], // starting position
    zoom: 15,
    bearing: -45,
    pitch: 40 // starting zoom
});

// if using foursquare  ---------------------------------------

// // Create a Foursquare developer account: https://developer.foursquare.com/
// // NOTE: CHANGE THESE VALUES TO YOUR OWN:
// // Otherwise they can be cycled or deactivated with zero notice.
// var CLIENT_ID = 'XNQ0MRVNNZBHZYQ3B2YVVC0KLWG03P1J3W45M1EHLEDU4BIS';
// var CLIENT_SECRET = 'UVMW41TUNZJSRSITT22NVQACYEXTOT4EY0V2O4AA12OWX1A5';

// // https://developer.foursquare.com/start/search
// var API_ENDPOINT = 'https://api.foursquare.com/v2/venues/search' +
// '?client_id=CLIENT_ID' +
// '&client_secret=CLIENT_SECRET' +
// '&v=20130815' +
// '&ll=LATLON' +
// '&categoryId=4d4b7105d754a06376d81259' +
// '&limit=50' +
// '&radius=500' +
// '&callback=?';

// // Use jQuery to make an AJAX request to Foursquare to load markers data.
// $.getJSON(API_ENDPOINT
//     .replace('CLIENT_ID', CLIENT_ID)
//     .replace('CLIENT_SECRET', CLIENT_SECRET)
//     .replace('LATLON', map.getCenter().lat +
//         ',' + map.getCenter().lng), function(result, status) {

//         if (status !== 'success') return alert('Request to Foursquare failed');

//     // Transform each venue result into a marker on the map.
//     var pubs = [];
//     for (var i = 0; i < result.response.venues.length; i++) {
//         var venue = result.response.venues[i],
//             lng = parseFloat(venue.location.lng),
//             lat = parseFloat(venue.location.lat);
//         venue.lnglat = [lng,lat];

//         pubs.push({
//                 "type": "Feature",
//                 "geometry": {
//                     "type": "Point",
//                     "coordinates": venue.lnglat
//                 },
//                 "properties": {
//                     "title": venue.name,
//                     "address": venue.location.address
//                 }
//             });
//     }

//     map.addSource("markers", {
//         "type": "geojson",
//         "data": {
//             "type": "FeatureCollection",
//             "features": pubs
//         }
//     });

//     map.addLayer({
//         "id": "markers",
//         "interactive": true,
//         "type": "symbol",
//         "source": "markers",
//         "paint": {
//             "text-color": "#fff"
//         },
//         "layout": {
//             "icon-image": "beer",
//             "icon-size": 0.5,
//             "icon-allow-overlap": true,
//             "text-field": "{title}",
//             "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
//             "text-offset": [1.5, 0.5],
//             "text-size": 12,
//             "text-anchor": "bottom-left",
//             "text-justify": "left",
//         }
//     });

// });

// ---------------------------------------


var canvas = map.getCanvasContainer();

var origin_feature = {
  "type": "FeatureCollection",
  "features": [{
      "type": "Feature",
      "geometry": {
          "type": "Point",
          "coordinates": origin_coords
      }
  }]
};
function mouseDown() {
  if (!isCursorOverPoint) return;

  isDragging = true;
  // Remove sonar marker from map
  sonarMarker.remove();
  // Set a cursor indicator
  canvas.style.cursor = 'grab';

  // Mouse events
  map.on('mousemove', onMove);
  map.once('mouseup', onUp);
}
function onMove(e) {
  if (!isDragging) return;
  var coords = e.lngLat;

  // Set a UI indicator for dragging.
  canvas.style.cursor = 'grabbing';

  // Update the Point feature in `geojson` coordinates
  // and call setData to the source layer `point` on it.
  origin_feature.features[0].geometry.coordinates = [coords.lng, coords.lat];
  map.getSource('trip-origin-casing').setData(origin_feature);
  map.getSource('trip-origin').setData(origin_feature);
}
function onUp(e) {
  if (!isDragging) return;
  var coords = e.lngLat;

  canvas.style.cursor = '';
  isDragging = false;

  // Add sonar marker back to map
  origin_coords = [coords.lng, coords.lat];

  sonarMarker.setLngLat(origin_coords)
  .addTo(map);

  // Re-draw map
  if (counter !== 0 && stops_coordinates.length > 0) {
    origin = tripOrigin(origin_coords);
    var api_coordinates = stops_coordinates.join(';');

    getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);
  }
  // Unbind mouse events
  map.off('mousemove', onMove);
}
function tripOrigin(origin_coords) {
  return origin_coords.join(',');
}
function buildSidebar(trip) {
  // Extract the info you need from trip
  var waypoints = trip.waypoints.length;
  var distance = trip.trips[0].distance;
  var duration = trip.trips[0].duration;

  // Convert meters to miles
  var miles = distance * 0.000621371192;
  var miles_clipped = Math.round(miles*100)/100;

  // Convert seconds to minutes
  var minutes = duration * 0.0166667;
  var minutes_clipped = Math.round(minutes);

  // Add total trip distance/duration to sidebar
  total_stops.textContent = waypoints - 1;
  total_time.textContent = minutes_clipped;
  total_distance.textContent = miles_clipped;
  info_wrapper.classList.remove('none');
}
function removeMarkers(){
  if (counter !== 1) {
    var markers = document.getElementsByClassName('marker');

    for (var i = markers.length - 1; i > -1; i--) {
      markers[i].parentNode.removeChild(markers[i]);
    }
  }
}
function addMarkers(waypoints){
  waypoints.forEach(function(waypoint, i){
    // Do not show 0 way point -- this is the origin point.
    if (waypoint.waypoint_index === 0) return;
    
    var el = document.createElement('div');
      el.className = 'marker';
      el.textContent = waypoint.waypoint_index; 
      el.classList.add('marker', 'shadow-darken25');
      el.style.cursor = 'pointer';

    var marker = new mapboxgl.Marker(el);

    el.addEventListener('click', function(e) {
      e.stopPropagation();
      marker_coords = i - 1;
      stops_coordinates.splice(marker_coords, 1);
      marker.remove();

      if (stops_coordinates.length === 0) {
        map.getSource('trip-feature').setData(empty_feature);
        info_wrapper.classList.add('none');
      } else {
        map_spinner.classList.remove('none');

        origin = tripOrigin(origin_coords);
        var api_coordinates = stops_coordinates.join(';');

        getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);
      }
    });

    marker.setLngLat(waypoint.location)
    marker.addTo(map);
  });
}
function drawMapFeatures(){
  var trip_feature = {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "properties": {},
      "geometry": trip.trips[0].geometry
    }]
  };
  // Add trip feature + remove points
  map.getSource('trip-feature').setData(trip_feature);
  map.getSource('trip-stops').setData(empty_feature);
  map.getSource('trip-stops-casing').setData(empty_feature);
  map.getSource('trip-stops-box-shadow').setData(empty_feature);
  stops_feature = {
    "type": "FeatureCollection",
    "features": []
  } 
}
function updateMapAndSidebar(err, body){
  trip = body;
  
  // Remove sidebar spinner
  spinner_div.classList.add('none');
  // Build sidebar
  buildSidebar(trip);
  // Remove markers
  removeMarkers();
  // Add markers
  addMarkers(trip.waypoints);
  // Update map
  drawMapFeatures();
  // Remove map spinner
  map_spinner.classList.add('none');
}
var stops_feature = {
  "type": "FeatureCollection",
  "features": []
}
var empty_feature = {
  "type": "FeatureCollection",
  "features": []
}

map.on('load', function(){


// Initialize the list
buildLocationList(backgroundPosts);
getInstagrams(-122.67773866653444, 45.52245801087795);

map.addControl(new mapboxgl.NavigationControl());

map.addLayer({
  'id': 'background-posts',
  'type': 'symbol',
  'source': {
    'type': 'geojson',
    'data': backgroundPosts
  },
  "layout": {
    "icon-image": "badge-green",
        // "icon-allow-overlap": true,
        "icon-size": 0.25
      }
    });

$('#refresh').click(function() {
  var center = map.getCenter();
  getInstagrams(center.lng, center.lat);
});

 map.addSource('trip-origin-casing',{
    "type": "geojson",
    "data": origin_feature
  });   
 map.addLayer({   
   "id": "trip-origin-casing-layer",    
   "source": "trip-origin-casing",    
   "type": "circle",    
   "paint": {   
     "circle-color": "#fff",    
     "circle-radius": 8   
    }    
  });
  map.addSource('trip-origin', {
    "type": "geojson",
    "data": origin_feature
  });    
 map.addLayer({   
  "id": "trip-origin-layer",   
    "source": "trip-origin",   
  "type": "circle",    
    "paint": {   
      "circle-color": '#00626e',   
      "circle-radius": 6   
    }    
  });
  map.addSource('trip-feature', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip",
    "source": "trip-feature",
    "type": "line",
    "layout": {
      "line-join": "round"
    },
    "paint": {
      "line-color": green,
      "line-width": 3,
    }
  },'building');
  map.addLayer({
    "id": "trip-blur",
    "source": "trip-feature",
    "type": "line",
    "layout": {
      "line-join": "round"
    },
    "paint": {
      "line-color": green,
      "line-width": 18,
      "line-blur": 8
    }
  },'building');
  map.addSource('trip-stops-box-shadow', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-stops-box-shadow-layer",
    "source": "trip-stops-box-shadow",
    "type": "circle",
    "paint": {
      "circle-color": "hsl(0, 0%, 62%)",
      "circle-radius": 9,
      "circle-opacity": 0.5,
      "circle-blur": 0.3
    }
  });
  map.addSource('trip-stops-casing', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-stops-casing-layer",
    "source": "trip-stops-casing", 
    "type": "circle",
    "paint": {
      "circle-color": "#fff",
      "circle-radius": 7
    }
  });
  map.addSource('trip-stops', {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": []
    }
  });
  map.addLayer({
    "id": "trip-markers",
    "source": "trip-stops",
    "type": "circle",
    "paint": {
      "circle-color": 'hsl(185, 3%, 77%)',
      "circle-radius": 5
    }
  });

  // Add sonar marker
  var divSonar = document.createElement('div');
  divSonar.classList.add('sonar-marker');

  sonarMarker = new mapboxgl.Marker(divSonar, {
    offset: [-10, -10]
  }).setLngLat(origin_coords)
    .addTo(map);

  // If a feature is found on map movement,
  // set a flag to permit a mousedown events.
  map.on('mousemove', function(e) {
    var origin_features = map.queryRenderedFeatures(e.point, { layers: ['trip-origin-casing-layer', 'trip-origin-layer'] });
    // Change point and cursor style as a UI indicator
    // and set a flag to enable other mouse events.
    if (origin_features.length) {
      map.setPaintProperty('trip-origin-layer', 'circle-color', '#23d2be');
      canvas.style.cursor = 'move';
      isCursorOverPoint = true;
      map.dragPan.disable();
    } else {
      map.setPaintProperty('trip-origin-layer', 'circle-color', '#23d2be');
      canvas.style.cursor = '';
      isCursorOverPoint = false;
      map.dragPan.enable();
    }
  });
  // Set `true` to dispatch the event before other functions call it. This
  // is necessary for disabling the default map dragging behaviour.
  map.on('mousedown', mouseDown, true);
});


function removePopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    if (popUps[0]) popUps[0].remove();
  }
  
  function flyToStore(currentFeature) {
    map.flyTo({
        center: currentFeature.geometry.coordinates,
        zoom: 17,
        minZoom: 15
      });
  }
  // Create a popup, but don't add it to the map yet.
  var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
  });

  map.on('mouseenter', 'background-posts', function(e) {
      // Change the cursor style as a UI indicator.
      map.getCanvas().style.cursor = 'pointer';

      // map.easeTo({center: e.lnglat});
      // Populate the popup and set its coordinates
      // based on the feature found.
      popup.setLngLat(e.features[0].geometry.coordinates)
          .setHTML('<h3>' + e.features[0].properties['Location'] + '</h3>' + 
          '<img src="' + e.features[0].properties['ImageLink'] + '" />' + 
          '<h4>' + e.features[0].properties['Address'] + ' ' + e.features[0].properties['Date'] + ' ' + e.features[0].properties['Time'] + '</h4>')
          .addTo(map);
  });

  map.on('mouseleave', 'background-posts', function() {
      map.getCanvas().style.cursor = '';
      popup.remove();
  });

  // map.on('click', removePopUp);

  function createPopUp(currentFeature) {
    var popUps = document.getElementsByClassName('mapboxgl-popup');
    if (popUps[0]) popUps[0].remove();

    var popup = new mapboxgl.Popup({closeOnClick: false})
          .setLngLat(currentFeature.geometry.coordinates)
          .setHTML('<h3>' + currentFeature.properties['Location'] + '</h3>' + 
          '<img src="' + currentFeature.properties['ImageLink'] + '" />' + 
          '<h4>' + currentFeature.properties['Address'] + '</h4>')
          .addTo(map);
  }
 
  function buildLocationList(data) {
    for (i = 0; i < data.features.length; i++) {
      var currentFeature = data.features[i];
      var prop = currentFeature.properties;
      
      var listings = document.getElementById('listings');
      var listing = listings.appendChild(document.createElement('div'));
      listing.className = 'item';
      listing.id = "listing-" + i;
      listing.dataPosition = i;
      
      var link = listing.appendChild(document.createElement('a'));
      link.href = '#access_token=' + igToken;
      link.className = 'title';
      link.innerHTML = prop['Location'];     
      
      var details = listing.appendChild(document.createElement('div'));
      details.innerHTML = prop['Address'];

      listing.addEventListener('click', function(e){
        // Update the currentFeature to the store associated with the clicked link
        var clickedListing = data.features[this.dataPosition];
        
        // 1. Fly to the point
        flyToStore(clickedListing);

        // 2. Close all other popups and display popup for clicked store
        createPopUp(clickedListing);
        
        // 3. Highlight listing in sidebar (and remove highlight for all other listings)
        var activeItem = document.getElementsByClassName('active');

        if (activeItem[0]) {
           activeItem[0].classList.remove('active');
        }
        this.parentNode.classList.add('active');
      });
    }
  }

  function getInstagrams(lng, lat) {
    var API_ENDPOINT = 'https://api.instagram.com/v1/media/search?lat=' + lat + '&lng=' + lng + '&distance=50000&scope=public_scope&callback=?&access_token=' + igToken;

    $.getJSON(API_ENDPOINT, function(result, status) {

      if (status !== 'success') return alert('Request to IG failed');

      // remove all markers from the previous call
      $('.marker').remove();

      for (var i = result.data.length - 1; i >= 0; i--) {
        lng = parseFloat(result.data[i].location.longitude);
        lat = parseFloat(result.data[i].location.latitude);
        result.data[i].lnglat = [lng, lat];

        isInteresting(result.data[i]) ? addToMarker(result.data[i], i) : addToLayer(result.data[i]);
      }

      function isInteresting(post) {
        const tagsInteresting = ['dwp', 'designweek', 'designweekpdx', 'dwpdx', 'greenlooppdx'];
        var interesting = false;
        // console.log(post.tags);
        post.tags.forEach(function(tag) {
          if (tagsInteresting.indexOf(tag) !== -1) interesting = true;
        });
        return interesting;
      };

      function addToMarker(post, i) {

        // create DOM element for the marker
        var el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url(' + post.images.thumbnail.url + ')';
        el.data = i;

        // create the marker
        var markerOffset = Math.random() * 20 + 20;

        var marker = new mapboxgl.Marker(el, {
            offset: [-markerOffset, -markerOffset]
          })
          .setLngLat(post.lnglat)
          .addTo(map);
      };

      // function compareStrings(a, b) {
      //   // Assuming you want case-insensitive comparison
      //   a = a.toLowerCase();
      //   b = b.toLowerCase();

      //   return (a < b) ? -1 : (a > b) ? 1 : 0;
      // }

      // backgroundPosts.features.sort(function(a, b) {
      //   return compareStrings(a.properties['Location'], b.properties['Location']);
      // })


      function addToLayer(post) {
        var point = {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "Point",
            "coordinates": post.lnglat
          }
        };
        // compareStrings();
        backgroundPosts.features.push(point);
        // console.log(backgroundPosts.features);
      }

      $('.marker').mouseover( function() {
        if (this.data) {
          showModal(result.data[this.data]);
        } else {
          console.log('Post not found.');
        }
      })

      $('#modal-bg').click(function() {
        hideModal();
      });

      function showModal( post ) {
        // fly the map
        map.easeTo({center: post.lnglat});

        // update content
        var img = 'url(' + post.images.standard_resolution.url + ')';
        $('#modal-img').css('backgroundImage', img);
        var txt = '<a href="' + post.link + '" target="_blank">' + post.location.name + '</a> ';
        txt += post.caption.text ? post.caption.text : '';
        $('#modal-txt').html(txt);

        // show modal window
        $('#modal-bg').addClass('bg-darken25')
         .css('pointer-events', 'auto');
        $('#modal-window').removeClass('opacity0');
      }

      function hideModal() {
        $('#modal-bg').removeClass('bg-darken25')
         .css('pointer-events', 'none');
        $('#modal-window').addClass('opacity0');
      }

    });
  };

  var options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  function success(pos) {
    var crd = pos.coords;
  };

  function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
  };

  navigator.geolocation.getCurrentPosition(success, error, options);


// Add points on click (if not dragging point)
map.on('click', function(e){
  if (!isDragging) {
    var features = map.queryRenderedFeatures(e.point, { layers: ['trip-stops-box-shadow-layer', 'trip-stops-casing-layer', 'trip-markers']});

    var lngLat = map.unproject(e.point);
    stops_feature.features.push({
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [lngLat.lng,lngLat.lat]
      }
    });

    // If the number of stops is less than 11...
    if (stops_coordinates.length <= 10) {
     stops_coordinates.push([lngLat.lng,lngLat.lat]); 
      // Add points to the map
      map.getSource('trip-stops-box-shadow').setData(stops_feature);
      map.getSource('trip-stops-casing').setData(stops_feature);
      map.getSource('trip-stops').setData(stops_feature);

      counter++;

      // Add spinners
      if (counter === 1) { spinner_div.classList.remove('none'); }
      map_spinner.classList.remove('none');

      origin = tripOrigin(origin_coords);
      var api_coordinates = stops_coordinates.join(';');

      getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar);

    // Remove the first stops the user added and re-run
    } else if (stops_coordinates.length > 10) {
      stops_coordinates.push([lngLat.lng,lngLat.lat]); 
      // Add points to the map
      map.getSource('trip-stops-box-shadow').setData(stops_feature);
      map.getSource('trip-stops-casing').setData(stops_feature);
      map.getSource('trip-stops').setData(stops_feature);

      stops_coordinates.shift();

      origin = tripOrigin(origin_coords);
      var api_coordinates = stops_coordinates.join(';');

      getOptimizedTrip(origin, api_coordinates, updateMapAndSidebar); 
    }    
  }
});
