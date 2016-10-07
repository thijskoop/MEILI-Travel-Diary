
var Trip = function(trip, triplegs) {

  if(triplegs && triplegs.length > 0) {
    triplegs[0].isFirst = true;
    triplegs[triplegs.length-1].isLast = true;
  } else {
    triplegs = [];
  }

  var trip = trip;
  var triplegs = triplegs;

  function getTripleg(id, indexDiff) {
    indexDiff = indexDiff ? indexDiff : 0;
    for (var i = 0; i < triplegs.length; i++) {
      if(triplegs[i].triplegid == id) {
        var tripleg = triplegs[i + indexDiff];
        // If tripleg with diff is undefined try returning current
        tripleg = tripleg ? tripleg : triplegs[i];
        return Tripleg(tripleg);
      }
    }
    return null;
  }

  return Emitter($.extend({

    events: [],
    triplegs: triplegs,

    updateTriplegs: function(newTriplegs) {
      triplegs = newTriplegs.update_trip_start_time;
      this.emit('triplegs-update', triplegs);
    },

    getTriplegById: function(triplegId) {
      return getTripleg(triplegId);
    },

    getPrevTripleg: function(tripleg) {
      return getTripleg(tripleg.triplegid, -2);
    },

    getNextTripleg: function(tripleg) {
      return getTripleg(tripleg.triplegid, +2);
    },

    getPrevPassiveTripleg: function(tripleg) {
      return getTripleg(tripleg.triplegid, -1);
    },

    getNextPassiveTripleg: function(tripleg) {
      return getTripleg(tripleg.triplegid, +1);
    },

    // Actions
    on: function(type, listener) {
      this.events.push(name, callback);
    }

  }, trip));
};