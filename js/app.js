// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
"use strict";

var appViewModel = function () {

    var self = this;
    self.currentLat = ko.observable(33.6447758);
    self.currentLng = ko.observable(-117.8314231);//this.currentLocation() will return location
    self.currentTitle = ko.observable();
    self.markers = ko.observableArray([]);
    self.meetupList = ko.observableArray([]);
    self.searchSummary = ko.observable();
    self.filterKeyword = ko.observable('');
    self.filteredMeetups = ko.observableArray([]);
    self.animationKey = ko.observable();

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
    }

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
            if (places.length == 0) {
                return;
            }
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
            self.cleanMeetupList();
            self.fetchMeetups(url);
            //self.updateStores();
            //map.setCenter(currentLocation);
            //console.log(self.bounds.length);
            //console.log(self.bounds);
            //map.setZoom(14);  //not working here, have to put zoon in self.updateStore() function??
            //map.fitBounds(self.bounds);
        });
    }

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
            cache: false
        }).done(function(response) {
            data = response.results;
            data.forEach(function(meetup) {
                if (meetup.venue) {
                    self.meetupList.push(new Meetup(meetup));
                }
            });
            self.filteredMeetups(self.meetupList());
            self.searchSummary("Total: " + self.filteredMeetups().length + " meetups");
            self.createMarkers();
        }).fail(function (response, status, error) {
            self.searchSummary("Meetup data could not load...");
        });
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
            //should have the same size with meetupList
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

                self.markers.push({marker: marker, url: url}); //clean before push
                google.maps.event.addListener(marker, 'click', function () {
                    self.goToMarker({name: function () { return marker.title; } });
                });
            }
            //map.fitBounds(self.bounds);
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
                var contentString = '<a href="' + url + '">' + clickedMeetName + '</a>';
                infowindow.setContent(contentString);
                self.animationKey(key);
                infowindow.open(map, self.markers()[key].marker);
                google.maps.event.addListener(infowindow, 'closeclick', function() {
                    self.markers()[self.animationKey()].marker.setAnimation(null);
                });
                self.markers()[key].marker.setAnimation(google.maps.Animation.BOUNCE);
                map.panBy(0, -150);
            }
            else {
                self.markers()[key].marker.setAnimation(null);
            }
        }
    };

    this.clearFilter = function() {
        //self.filteredList(self.grouponDeals());
        //self.dealStatus(self.numDeals() + ' food and drink deals found near ' + self.searchLocation());
        self.filterKeyword('');
        self.filteredMeetups(self.meetupList());
        console.log(self.markers().length);
        for(var i = 0; i < self.markers().length; i++) {
            self.markers()[i].marker.setMap(map);
        }
        self.searchSummary("Total: " + self.filteredMeetups().length + " meetups");
    };

    this.filterResults = function() {
        console.log(self.filterKeyword());
        var searchWord = self.filterKeyword().toLowerCase();
        if(!searchWord) {
            return;
        } else {
            self.filteredMeetups([]);
            for (var i = 0; i < self.markers().length; i++) {
                if (self.meetupList()[i].name().toLowerCase().indexOf(searchWord) != -1) {
                    self.markers()[i].marker.setMap(map);
                    self.filteredMeetups.push(self.meetupList()[i]);
                } else {
                    self.markers()[i].marker.setMap(null);
                }
            }
            self.searchSummary("Total: " + self.filteredMeetups().length + " meetups");
        }
    }


    initMap();
    initAutocomplete();
};

var start = function() {
    ko.applyBindings(new appViewModel());
};
