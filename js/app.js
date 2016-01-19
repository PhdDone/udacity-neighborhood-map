// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
"use strict";

var appViewModel = function () {

    var self = this;
    this.currentLat = ko.observable(33.6447758);
    this.currentLng = ko.observable(-117.8314231);//this.currentLocation() will return location
    this.currentTitle = ko.observable();
    this.markers = ko.observableArray([]);
    this.meetupList = ko.observableArray([]);

    var map;
    var bounds;
    var infowindow;
    this.centerMarker = ko.observable();
    var centerString = '&lat=' + this.currentLat() + '&lon=' + this.currentLng();
    var meetupApiUrl = 'https://api.meetup.com/2/open_events?and_text=False&offset=0&format=json&limited_events=False&photo-host=public&text=coding+programmi%5C+ng+ruby+python+javascript+html&page=100&radius=5&category=34&status=upcoming&desc=False&sig_id=198284779&sig=30751a8f59e209f4f77267c1ad65bd10de416681' + centerString;

    function initMap() {
        map = new google.maps.Map(document.getElementById('google-map'), {
            center: {lat: self.currentLat(), lng: self.currentLng()},
            zoom: 11
        });
        self.centerMarker(new google.maps.Marker({
            map: map,
            position: {lat: self.currentLat(), lng: self.currentLng()}
        }));
        self.centerMarker().setMap(null);
        infowindow = new google.maps.InfoWindow({maxWidth: 300});
    };

    function initAutocomplete() {

        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());
        });

        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();
            console.log(places.length);
            if (places.length == 0) {
                return;
            }
            console.log(places[0].geometry.location.lat());
            console.log(places[0].geometry.location.lng());
            self.currentLat(places[0].geometry.location.lat());
            self.currentLng(places[0].geometry.location.lng());
            self.currentTitle(places[0].title);
            // Clear out the old markers.
            self.centerMarker().setMap(null);
            // For each place, get the icon, name and location.

            var icon = {
                url: places[0].icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };

            // Create a marker for each place.
            self.centerMarker(new google.maps.Marker({
                map: map,
                icon: icon,
                title: self.currentTitle(),
                position: {lat: self.currentLat(), lng: self.currentLng()}
            }));

            self.bounds = new google.maps.LatLngBounds();

            if (places[0].geometry.viewport) {
                // Only geocodes have viewport.
                self.bounds.union(places[0].geometry.viewport);
            } else {
                self.bounds.extend(places[0].geometry.location);
            }

            var currentLocation = places[0].geometry.location;
            self.centerString = '&lat=' + self.currentLat() + '&lon=' + self.currentLng();
            var url = meetupApiUrl + self.centerString;
            console.log(url);
            self.cleanMeetupList();
            self.fetchMeetups(url);
            //self.updateStores();
            //map.setCenter(currentLocation);
            //console.log(self.bounds.length);
            //console.log(self.bounds);
            //map.setZoom(14);  //not working here, have to put zoon in self.updateStore() function??
            //map.fitBounds(self.bounds);
        });
    };
    var Meetup = function (meetup) {
        var self = this;

        // attach venue object
        self.venue = ko.observable(meetup.venue);
        self.id = ko.observable(meetup.id);
        self.name = ko.observable(meetup.name);
        self.group = ko.observable(meetup.group.name);
        self.address_1 = ko.observable(meetup.address_1);
        self.event_url = ko.observable(meetup.event_url);
        self.date = ko.computed(function () {
            var milliseconds = meetup.time;
            var date = new Date(milliseconds);
            return date.toLocaleDateString();
        });
        self.url = ko.observable(meetup.event_url);
    };

    this.fetchMeetups = function (url) {
        var data;

        $.ajax({
            type: "GET",
            url: url,
            timeout: 5000,
            contentType: "application/json",
            dataType: "jsonp",
            cache: false,
        }).done(function(response) {
            console.log(response);
            data = response.results;
            console.log(data);
            data.forEach(function(meetup) {
                self.meetupList.push(new Meetup(meetup));
            });
            self.createMarkers();
        }).fail(function (response, status, error) {
            $('#search-summary').text('Meetup data could not load...');
        });
    };

    this.updateStores = function () {
        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
            location: {lat: self.currentLat(), lng: self.currentLng()},
            radius: 1000,
            types: ['grocery_or_supermarket']
        }, self.processResults);
    };

    this.processResults = function (results, status, pagination) {
        //if (status !== google.maps.places.PlacesServiceStatus.OK) {
        //return;
        //} else {
        self.createMarkers(results);

        if (pagination.hasNextPage) {
            var moreButton = document.getElementById('more'); //?

            moreButton.disabled = false;

            moreButton.addEventListener('click', function () {
                moreButton.disabled = true;
                pagination.nextPage();
            });
        }
        //}
    };

    this.cleanMarkers = function () {
        for (var i = 0; i < self.markers().length; ++i) {
            self.markers()[i].marker.setMap(null);
        }
        self.markers([]);
    };

    this.cleanMeetupList = function () {
        self.meetupList([]);
    };

    this.createMarkers = function () {
        // clean up
        infowindow.close();
        self.cleanMarkers();

        self.meetupList().forEach(function(meetup) {
            if (meetup.venue()) {
                var lat = meetup.venue().lat;
                var lon = meetup.venue().lon;
                var name = meetup.name();
                var url = meetup.event_url;
                var meetLocation = {lat: lat, lng: lon};
                var marker = new google.maps.Marker({
                    map: map,
                    title: name,
                    position: meetLocation
                });
                console.log(url);
                self.markers.push({marker: marker, url: url}); //clean before push?
                //self.bounds.extend(new google.maps.LatLng(meetLocation));
            }
            map.fitBounds(self.bounds);
            map.setZoom(11);
            map.setCenter({lat: self.currentLat(), lng: self.currentLng()});
        });
    };

    this.goToMarker = function (clickedMeetName) {
        var clickedMeetName = clickedMeetName.name();
        for (var key in self.markers()) {
            if (clickedMeetName === self.markers()[key].marker.title) {
                map.panTo(self.markers()[key].marker.position);
                map.setZoom(11);
                var url = self.markers()[key].url();
                //var contentString = '<h5>' + clickedMeetName + '</h5>' + '<h6>' + url + '</h6>';
                var contentString = '<a href="' + url + '">' + clickedMeetName + '</a>';
                infowindow.setContent(contentString);
                infowindow.open(map, self.markers()[key].marker);
                map.panBy(0, -150);
            }
        }
    };

    initMap();
    initAutocomplete();
};

ko.applyBindings(new appViewModel());