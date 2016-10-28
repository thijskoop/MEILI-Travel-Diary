'use strict';

var log = Log(CONFIG);
var api = Api(CONFIG);
var ui;

$(function() {

    var user = new User();
    var login = new Login(user);

    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        log.error(errorMsg, url, lineNumber, column, errorObj);
        ui.errorMsg.show(errorMsg);
    };

    function render(path, callback) {
        request.get(path)
            .done(function(content) {
                var $contentRef = $('#content');
                $contentRef.empty().append(content);
                callback($contentRef);
            });
    }

    function verifyLoggedIn(callback) {
        user.verifyLoggedIn()
            .done(function() {
                callback();
            })
            .fail(function() {
                page('/login');
            });
    }

     function renderTrip(trip) {
      // TODO! move into Trip..

      // Reset.
      if(trip.mapLayer) {
        trip.mapLayer.clearLayers();
        map.removeLayer(trip.mapLayer);
      }

      // Render timeline
      ui.timeline.render(trip);

      // Render map
     for (var i=0; i < trip.triplegs.length; i++) {
        var tripleg = trip.triplegs[i];
        var triplegLayer = tripleg.generateMapLayer();
        trip.mapLayer.addLayer(triplegLayer);
      }
      trip.mapLayer.addTo(map);
    }

    // Resolve old paths
    page('/#/*', function(ctx, next) {
        var p = ctx.path.split('/');
        var path = p[p.length-1];
        if(path) {
            page('/'+path);
        } else {
            page('/');
        }
    })

    page('/', function(ctx, next) {
        verifyLoggedIn(function() {
            page('/map');
        });
    });

    page('/login', function(ctx, next) {
        render('views/login.html', function() { next(); });
    });

    page('/map', function(ctx, next) {
        verifyLoggedIn(function() {
            render('views/map.html', function() {

                ui = {
                  map: new LMap(),
                  timeline: new Timeline({ elementId: 'timeline'}),
                  errorMsg: new ErrorMsg()
                };

                user.getNumberOfTrips()
                  .done(function(result) {
                    document.getElementById('tripsLeft').innerHTML = result.rows[0].user_get_badge_trips_info;
                    document.getElementById('badge_holder').style.visibility = "visible";
                });

                user.getLastTrip()
                  .done(function(trip) {
                    // TODO move me
                    trip.on('trip-update', function(trip) {
                      renderTrip(trip);
                    });
                    trip.on('triplegs-update', function(trip) {
                      renderTrip(trip);
                    });

                    ui.timeline.on('start-time-change', function(triplegId, newStartTime) {
                        var tripleg = trip.getTriplegById(triplegId);
                        if(tripleg.isFirst) {
                            trip.updateStartTime(newStartTime);
                        } else {
                            trip.updateTriplegStartTime(triplegId, newStartTime);
                        }
                    }.bind(trip));
                    ui.timeline.on('end-time-change', function(triplegId, newEndTime) {
                        var tripleg = trip.getTriplegById(triplegId);
                        if(tripleg.isLast) {
                            trip.updateEndTime(newEndTime);
                        } else {
                            trip.updateTriplegEndTime(triplegId, newEndTime);
                        }
                    }.bind(trip));

                    ui.map.init(CONFIG.map, user.id);

                    renderTrip(trip);
                    map.fitBounds(trip.mapLayer.getBounds());
                });
            });
        });
    });

    page('/faq', function(ctx, next) {
        render('views/faq.html', function() { next(); });
    });

    page('/about', function(ctx, next) {
        render('views/about.html', function() { next(); });
    });

    page('/contact', function(ctx, next) {
        render('views/contact.html', function() { next(); });
    });

    page('/statistics', function(ctx, next) {
        render('views/statistics.html', function() { next(); });
    });

    page({ hashbang: true });
});
