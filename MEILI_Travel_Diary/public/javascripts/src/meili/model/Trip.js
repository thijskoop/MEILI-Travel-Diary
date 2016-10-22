
var util = Util();

var Trip = Trip || function(trip, triplegs) {
  Emitter($.extend(this, trip));

  this.mapLayer = L.featureGroup();
  if(triplegs) {
    this.updateTriplegs(triplegs);
  }
  // Make sure purposes is sorted at init
  if(this.purposes) {
    this._sortPurposes();
  }
  // Make sure places is sorted at init
  if(this.destination_places) {
    this._sortDestinationPlaces();
  }

  return this;
};

Trip.prototype = {

  // Getters
  // -------------------------------------------
  // -------------------------------------------

  getId: function() {
    return this.trip_id;
  },

  getPurposes: function() {
    return this.purposes;
  },

  getPlaces: function() {
    return this.destination_places;
  },

  getTriplegById: function(triplegId) {
    return this._getTripleg(triplegId);
  },

  getPrevTripleg: function(tripleg) {
    return this._getTripleg(tripleg.triplegid, -2);
  },

  getNextTripleg: function(tripleg) {
    return this._getTripleg(tripleg.triplegid, +2);
  },

  getPrevPassiveTripleg: function(tripleg) {
    return this._getTripleg(tripleg.triplegid, -1);
  },

  getNextPassiveTripleg: function(tripleg) {
    return this._getTripleg(tripleg.triplegid, +1);
  },

  getStartTime: function(formatted) {
    return util.formatTime(this.current_trip_start_date, formatted ? CONFIG.default_time_format : false);
  },

  getEndTime: function(formatted) {
    return util.formatTime(this.current_trip_end_date, formatted ? CONFIG.default_time_format : false);
  },

  getNextTripStartTime: function(formatted) {
    return util.formatTime(this.next_trip_start_date, formatted ? CONFIG.default_time_format : false);
  },

  getPreviousTripEndTime: function(formatted) {
    return util.formatTime(this.previous_trip_end_date, formatted ? CONFIG.default_time_format : false);
  },

  getPreviousTripPOIName: function() {
    return this.previous_trip_poi_name;
  },

  getPreviousTripPurpose: function() {
    return this.previous_trip_purpose;
  },

  getTimeDiffToNextTrip: function() {
    var timeDiff = Math.abs(this.getNextTripStartTime().getTime() - this.getEndTime().getTime());
    var hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
    return hoursDiff;
  },

  // Local changes on trip
  // -------------------------------------------
  // -------------------------------------------

  updateTriplegs: function(newTriplegs) {
    this.removeTriplegs();
    if(newTriplegs && newTriplegs.length > 0) {
      newTriplegs[0].isFirst = true;
      newTriplegs[newTriplegs.length-1].isLast = true;
    }
    for (var i = 0; i < (newTriplegs.length+1); i++) {
      if(newTriplegs[i]) {
        newTriplegs[i] = new Tripleg(newTriplegs[i]);
        newTriplegs[i].on('tripleg-updated', function() { this.emit('triplegs-update', this); }.bind(this));
      }
      // Add reference to next and previous tripleg
      if(i-1 >= 0) {
        newTriplegs[i-1].setPrevNext(newTriplegs[i-2], newTriplegs[i]);
      }
    };
    this.triplegs = newTriplegs;
    this.emit('triplegs-update', this);
    return this.triplegs;
  },

  removeTriplegs: function() {
    this._reset
    this.emit('triplegs-remove', this);
    this.triplegs = [];
    return this;
  },

  // API connected
  // -------------------------------------------
  // -------------------------------------------

  updateStartTime: function(triplegId, newTime) {
    return this._updateTime('start', triplegId, newTime);
  },

  updateEndTime: function(triplegId, newTime) {
    return this._updateTime('end', triplegId, newTime);
  },

  insertTransitionBetweenTriplegs: function(startTime, endTime, fromMode, toMode) {
    var dfd = $.Deferred();
    api.triplegs.insertTransitionBetweenTriplegs(this.getId(), startTime, endTime, fromMode, toMode)
      .done(function(result) {
        if(result.triplegs) {
          this.updateTriplegs(result.triplegs);
          dfd.resolve(this.triplegs);
        } else {
          var msg = 'No triplegs returned';
          throw msg
          dfd.reject(msg);
        }
      }.bind(this))
      .fail(function(err) {
        dfd.reject(err);
      });
    return dfd.promise();
  },

  updatePurposeOfTrip: function(purposeId) {
    var dfd = $.Deferred();
    api.trips.updatePurposeOfTrip(this.getId(), purposeId).done(function(result) {
      if(result.status == true) {
        this._updatePurpose(purposeId);
        this.emit('trip-update', this);
      }
    }.bind(this)).fail(function(err) {
        dfd.reject(err);
    });
    return dfd.promise();
  },

  updateDestinationPoiIdOfTrip: function(destinationPoiId) {
    var dfd = $.Deferred();
    api.trips.updateDestinationPoiIdOfTrip(this.getId(), destinationPoiId).done(function(result) {
      if(result.status == true) {
        this._updateDestinationPlace(destinationPoiId);
        this.emit('trip-update', this);
      }
    }.bind(this)).fail(function(err) {
        dfd.reject(err);
    });
    return dfd.promise();
  },

  // Internal methods
  // -------------------------------------------
  // -------------------------------------------

  _updatePurpose: function(purposeId) {
    for (var i = 0; i < this.purposes.length; i++) {
      if(this.purposes[i].id == purposeId) {
        this.purposes[i].accuracy = 100;
      }
    }
    this._sortPurposes();
  },

  _updateDestinationPlace: function(destinationPlaceId) {
    for (var i = 0; i < this.destination_places.length; i++) {
      if(this.destination_places[i].gid == destinationPlaceId) {
        this.destination_places[i].accuracy = 100;
      }
    }
    this._sortDestinationPlaces();
  },

  _sortPurposes: function() {
    this.purposes = util.sortByAccuracy(this.purposes);
  },

  _sortDestinationPlaces: function() {
    this.destination_places = util.sortByAccuracy(this.destination_places);
  },

  _updateTime: function(timeToUpdate, triplegId, newTime) {
    var dfd = $.Deferred();
    var tripleg = this.getTriplegById(triplegId);
    if(tripleg) {
      var apiMethod = timeToUpdate === 'start' ? 'updateStartTime' : 'updateEndTime';
      var apiEndPoint = api.triplegs;
      var id = tripleg.getId();
      // If this is is the first tripleg do operations on trip
      if((tripleg.isFirst && timeToUpdate === 'start') || (tripleg.isLast && timeToUpdate === 'end')) {
        apiEndPoint = api.trips;
        id = this.getId();
      }

      apiEndPoint[apiMethod](id, newTime)
        .done(function(result) {
          this.updateTriplegs(result.triplegs);
          dfd.resolve(this.triplegs);
        }.bind(this))
        .fail(function(err) {
          dfd.reject(err);
        });

    } else {
      var msg = 'Tripleg ' + triplegId + ' not found on trip' + this.getId();
      log.error(msg);
      dfd.reject(msg);
    }
    return dfd.promise();
  },

  _getTripleg: function(id, indexDiff) {
    indexDiff = indexDiff ? indexDiff : 0;
    for (var i = 0; i < this.triplegs.length; i++) {
      if(this.triplegs[i].triplegid == id) {
        var tripleg = this.triplegs[i + indexDiff];
        // If tripleg with diff is undefined try returning current
        tripleg = tripleg ? tripleg : this.triplegs[i];
        return tripleg;
      }
    }
    return null;
  }

};
