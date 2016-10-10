
var Timeline = function(options) {
  var elementId = options.elementId;

  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function onTimeSet(e) {

    var $target = $(e.target);
    var triplegId = parseInt($target.attr('id').split('_')[1],10);

    var tripId = currentTrip.trip_id;
    var tripleg = currentTrip.getTriplegById(triplegId);

    var initialTime = tripleg.points[0].time;
    var endTime = tripleg.points[tripleg.points.length-1].time;
    var initialTimeDate = new Date(tripleg.points[0].time);

    var newTime = new Date(initialTime);
    newTime.setMinutes(e.time.minutes);
    newTime.setHours(e.time.hours);
    newTime = newTime.getTime();

    log.info('changed timepicker start value of tripleg '+tripleg.triplegid+' to '+ newTime);

    /**
    * CONSEQUENCE 0 - Start time sooner than end time
    */

    function resetTimePicker(target, time) {
      $(target).timepicker('setTime', initialTimeDate.getHours()+":"+initialTimeDate.getMinutes());
    }

    if ($target.hasClass('start')) {
        // New time should be allowed outside of the bounds of start time and end time
        // -> operations on the first and last triplegs point to trip api endpoints, other on tripleg api endpoints

        // !TODO fix separation of first and last in a better way
        if(tripleg.isFirst) {
           api.trips.updateStartTime(tripId, newTime)
            .done(function(result) {
              currentTrip.updateTriplegs(result.triplegs);
            })
            .fail(function() {
              resetTimePicker(e.target, initialTimeDate);
            });
        } else {
          api.triplegs.updateStartTime(tripleg.triplegid, newTime)
            .done(function(result) {
              currentTrip.updateTriplegs(result.triplegs);
            })
            .fail(function() {
              resetTimePicker(e.target, initialTimeDate);
            });
        }

    } else if($target.hasClass('end')) {
        // New time should be allowed outside of the bounds of start time and end time
        // -> operations on the first and last triplegs point to trip api endpoints, other on tripleg api endpoints
        if(tripleg.isLast) {
           api.trips.updateEndTime(tripId, newTime)
            .done(function(result) {
              currentTrip.updateTriplegs(result.triplegs);
            })
            .fail(function() {
              resetTimePicker(e.target, initialTimeDate);
            });
        } else {
          api.triplegs.updateEndTime(tripleg.triplegid, newTime)
            .done(function(triplegs) {
              currentTrip.updateTriplegs(result.triplegs);
            })
            .fail(function() {
              resetTimePicker(e.target, initialTimeDate);
            });
        }
    }
    e.preventDefault();
  }

  /**
   * Returns the outerHTML of a MODE selector
   * @param mode - an array containing mode ids and their inference confidence
   * @param triplegid - the id of the tripleg with which the modes are associated with
   * @returns {string} - outerHTML of the mode selector
   */
  function getModeSelector(tripleg){
      var maxVal = tripleg.mode[0].accuracy;
      var classes = 'form-control';
      var options = [];

      if(maxVal<50) {
        classes += ' form-need-check';
        options.push('<option lang="en" value="-1" disabled selected style="display:none;">Specify your travel mode</option>');
      }

      for (var i = 0; i < tripleg.mode.length; i++) {
        var mode = tripleg.mode[i];
        options.push('<option lang="en" value="' + mode.id + '">' + mode.name + '</option>');
      }

      var selector = [
        '<select id="selectmode_' + tripleg.getId() + '" name="selectmode" class="' + classes + '">',
          options.join(''),
        '</select>'
      ].join('');

      return selector;
  }

  /**
   * Generates the outerHTML for the timeline element corresponding to a tripleg
   * @param tripleg - the tripleg element
   * @returns {string} - outerHTML of the timeline element
   */
  function getContent(tripleg) {
    var triplegId = tripleg.getId();
    var thisHtml= '<div class="tl-circ" id="telem_circle'+triplegId+'" style="cursor:pointer"><span class="glyphicon glyphicon-search"></span></div>';

    thisHtml+='<li>';
    thisHtml+= '<div class="timeline-panel" id="telem'+triplegId+'">';
    thisHtml+= '<div class="tl-heading">';
    thisHtml+= '<h4>';
    thisHtml+= getModeSelector(tripleg);
    thisHtml+= '</h4>';
    thisHtml+= '</div>';
    thisHtml+= '<div class="tl-body">';

    thisHtml+= '<br>';
    thisHtml+= '<div class="input-group bootstrap-timepicker">';
    thisHtml+= 'Start: <input id="timepickerstart_'+tripleg.getId()+'" class="time-picker start input-small" type="text"><span class="input-group-addon"><i class="glyphicon glyphicon-time"></i></span>';


    thisHtml+= '</div>';

    thisHtml+= '<p lang="en" style="font-style:italic; cursor: pointer;" id="addtransition'+triplegId+'" onclick="generateTransitionPopup(\''+triplegId+'\')">Did we miss a transfer? Click to add it.</p>';// <p lang="sv" style="font-style:italic" id="addtransition'+tripleg.triplegid+'" onclick="generateTransitionPopup(\''+tripleg.triplegid+'\')">Har vi missat ett byte? Klicka för att lägga till.</p>';
    thisHtml+= '<p lang="en" id="distPar'+triplegId+'">Distance:'+tripleg.getDistance()+'</p>';// <p lang="sv" id="distPar'+tripleg.triplegid+'">Avstånd:'+getDistanceOfTripLeg(tripleg.triplegid)+'</p>';
    thisHtml+= '<div class="input-group bootstrap-timepicker">'
    thisHtml+= 'Stop: <input id="timepickerend_'+triplegId+'" type="text" class="time-picker end input-small"><span class="input-group-addon"><i class="glyphicon glyphicon-time"></i></span>';
    if (!tripleg.isLast) thisHtml+= '<hr>';
    //thisHtml+= getTransitionPlace(tripleg, isLast);
    console.warn('getTransitionPlace?');
    thisHtml+= '<p id="transitiontime'+triplegId+'">Transfer time: ' + tripleg.getTransitionTime() + ' min <span class="glyphicon glyphicon-trash" style="float: right;" onclick="mergeWithNext(\''+triplegId+'\')"></span></p>';      
    thisHtml+= '</div>';

    return thisHtml;
  };


    /**
   * Adds listeners to a timeline element associated with a tripleg and checks for consequences of time change
   * @param tripleg - tripleg
   */
  function addListeners(tripId, tripleg) {
      var transitionSelectOption = document.getElementById('transitionSelect'+tripleg.triplegid);

      if (transitionSelectOption!=null)
          transitionSelectOption.onchange = transitionSelectListener;

      $(('selectmode_'+tripleg.triplegid)).on('change', function(e) {
        var triplegId = $(e.target).attr('id').split('_')[1];
        api.triplegs.updateMode(triplegId, this.value)
          .done(function() {
            currentTrip.getTriplegById(tripleg.triplegid).updateMode(this.value);
            log.debug('tripleg mode succefully updated');
          })
          .fail(function() {
            var msg = 'failed to set mode on tripleg';
            alert(msg);
            log.error(msg);
          });
      });

      /********************************************
       * Adding listeners to the timeline elements*
       ********************************************/

      /**
       * Mouse over
       */
      $("#telem"+tripleg.triplegid).mouseover(function()
      {
        var layer = currentTrip.getTriplegById(tripleg.triplegid).polylineLayer;
        layer.setStyle({
            opacity:1
        });

      });

      /**
       * Mouse exit
       */

      $("#telem"+tripleg.triplegid).mouseout(function()
      {
          var layer = currentTrip.getTriplegById(tripleg.triplegid).polylineLayer;
          layer.setStyle({
              opacity:0.6
          });

      });

      /**
       * Mouse click
       */

      $("#telem_circle"+tripleg.triplegid).click(function()
      {
          var layer = currentTrip.getTriplegById(tripleg.triplegid).polylineLayer;
          map.fitBounds(layer.getBounds());

          log.info('zoomed to layer '+tripleg.triplegid);
      });

      /**
       * Initialize time pickers
       */

      $('#timepickerstart_'+tripleg.triplegid).timepicker({
          minuteStep: 1,
          showMeridian: false,
          disableMousewheel:false,
          defaultTime: tripleg.getStartTime(true)
      }).on('hide.timepicker', onTimeSet);


      $('#timepickerend_'+tripleg.triplegid).timepicker({
          minuteStep: 1,
          showMeridian: false,
          disableMousewheel:false,
          defaultTime: tripleg.getEndTime(true)
      }).on('hide.timepicker', onTimeSet);


  };

  return {
      /**
     * Generates the first timeline element and adds it at the head of the timeline
     */
    generateFirstElement: function(currentTrip){
        var ul = document.getElementById("timeline");
        var li = document.createElement("li");
        li.id= 'firstTimelineElement';


        var previousPurpose = currentTrip.previous_trip_purpose;
        var previousPlace = currentTrip.previous_trip_poi_name;
        var previousTripEndDate = new Date(parseInt(currentTrip.previous_trip_end_date));
        var currentTripStartDate = new Date(parseInt(currentTrip.current_trip_start_date));

        console.log(previousPurpose);
        console.log(previousTripEndDate+" " +currentTrip.previous_trip_end_date);
        console.log(previousPlace);


        var timeDiff = Math.abs(currentTripStartDate.getTime() - previousTripEndDate.getTime());
        var htmlToAddTime=''
        if ((timeDiff/1000*60)<60){
            htmlToAddTime =Math.ceil(timeDiff/1000*60)+' minutes';
        }
        else
        {
            htmlToAddTime= Math.ceil(timeDiff / (1000 * 60 * 60))+' hours';
        }

        var thisHtml = '<li>';

        if (previousPurpose!=null) {
            /* Add see previous button */

            thisHtml += '<div class="tldatecontrol" id="seePrevious"> <p lang="en"> <i class="glyphicon glyphicon-arrow-up"></i> See previous trip <i class="glyphicon glyphicon-arrow-up"></i> </p>';// <p lang="sv"><i class="glyphicon glyphicon-arrow-up"></i> Gå tillbaka till den senaste förflyttningen <i class="glyphicon glyphicon-arrow-up"></i> </p>';
            thisHtml += '</div>';
            thisHtml += '</li>';

            var previousTripEndDateLocal = moment(previousTripEndDate).format('dddd')+", "+moment(previousTripEndDate).format("YY-MM-DD");
            var previousTripEndHour = moment(previousTripEndDate).format('hh:ss');

            /* Add previous trip ended panel*/
            thisHtml += '<li>';
            thisHtml += '<div class="tldate" style="width:330px"> <p lang="en">('+previousTripEndDateLocal  +') '+previousTripEndHour+' - Previous trip ended</p>';// <p lang="sv">('+previousTripEndDateLocalSv  +') '+previousTripEndHour+' - -Senaste förflyttningen slutade</p>';
            thisHtml += '</div>';
            thisHtml += '</li>';

            /* Add previous trip summary */
            thisHtml += '<li class="timeline-inverted">';
            thisHtml += '<div class="timeline-panel" id ="firstTimelinePanel">';
            thisHtml += '<div class="tl-heading">';
            thisHtml += '<h4 lang="en">Time spent at '+previousPlace+'</h4>';

            thisHtml += '<p id="tldatefirstparagraph"><small class="text-muted"><i class="glyphicon glyphicon-time"></i> '+(previousTripEndDate.getHours()<10?'0':'')+previousTripEndDate.getHours()+':'+(previousTripEndDate.getMinutes()<10?'0':'')+previousTripEndDate.getMinutes()+' - '+(currentTripStartDate.getHours()<10?'0':'')+currentTripStartDate.getHours()+':'+(currentTripStartDate.getMinutes()<10?'0':'')+currentTripStartDate.getMinutes()+'</small></p>';
            thisHtml += '</div>';
            thisHtml += '<div class="tl-body">';
            thisHtml += '<p lang="en">Place: '+previousPlace+'</p>';
            thisHtml += '<p lang="en">Purpose: '+previousPurpose+'</p>';
            thisHtml += '<p lang="en" id="firsttimeend">Time: '+htmlToAddTime+'</p>';
            thisHtml += '</div>';
            thisHtml += '</div>';
            thisHtml += '</li>';
        }
        else{
            thisHtml += '<li>';
            thisHtml += '<div class="tldate" id ="firstTimelinePanel"> <p lang="en">This is where you started using MEILI</p>' 

            thisHtml += '</div>';
            thisHtml += '</li>';
        }
        /* Add started trip info */
        var currentTripStartDateLocal = moment(previousTripEndDate).format('dddd')+", "+moment(currentTripStartDate).format("YY-MM-DD");
        var currentTripStartHour = moment(currentTripStartDate).format("hh:ss");

        thisHtml+='<li>';
        thisHtml+='<div class="tldate" id="tldatefirst" style="width:330px"><p lang="en" id="tldatefirstassociatedparagraph"><span class="glyphicon glyphicon-flag"></span>('+currentTripStartDateLocal  +') '+currentTripStartHour+' - Started trip</p>';// <p id="tldatefirstassociatedparagraphsv" lang="sv"><span class="glyphicon glyphicon-flag"></span>('+currentTripStartDateLocalSv  +') '+currentTripStartHour+' - Påbörjade förflyttning</p>';
        thisHtml+='<p lang="en"><i>Is this a fake trip? Click <span class="glyphicon glyphicon-trash" onclick="deleteTripModal()"></span> to delete.</i></p>';
        thisHtml+='</div>';
        thisHtml+='</li>';

        li.innerHTML = thisHtml;

        ul.appendChild(li)

        console.log(currentTripStartDate);

        var seePrevious = document.getElementById('seePrevious');

        /**
         * LISTENERS
         */
        if (seePrevious!=null)
            seePrevious.onclick = previousFunction;
    },

    /**
     * Generates the last timeline element and adds it at the tail of the timeline
     */
    generateLastElement: function(currentTrip){
        var ul = document.getElementById("timeline");
        var li = document.createElement("li");
        li.id= 'lastTimelineElement';

        var currentTripEndDate = new Date(parseInt(currentTrip.current_trip_end_date));

        var hours = currentTripEndDate.getHours();
        var minutes = currentTripEndDate.getMinutes();
        var seconds = currentTripEndDate.getSeconds();

        hours = hours < 10 ? '0'+ hours: hours;
        minutes = minutes < 10 ? '0'+minutes : minutes;
        seconds = seconds < 10 ? '0'+seconds : seconds;

        var currentTripEndDateLocal = moment(currentTripEndDate).format('dddd')+", "+moment(currentTripEndDate).format("YY-MM-DD");

        var currentTripEndDateHour = moment(currentTripEndDate).format("hh:ss");

        var thisHtml = '<li><div class="tldate" id="tldatelast" style="width: 350px;">';
        thisHtml += '<p id="tldatelastassociatedparagraph" lang="en"> <span class="glyphicon glyphicon-flag"> </span>('+currentTripEndDateLocal  +') '+currentTripEndDateHour+' - Ended trip</p>';
        thisHtml += '<p lang="en"><i> Is this a fake stop? Click <span class="glyphicon glyphicon-share-alt" onclick="mergeTripModal()"> </span> to merge with next trip.</i></p>';
        thisHtml += '</div></li>';
        var places = currentTrip.destination_places;
        var purposes = currentTrip.purposes;

        if (currentTrip.next_trip_start_date!=null) {
        /* Add ended trip info */

            nextTripStartDate = new Date(parseInt(currentTrip.next_trip_start_date));
            var timeDiff = Math.abs(nextTripStartDate.getTime() - currentTripEndDate.getTime());
            var hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));


            /* Add previous trip ended panel*/
            thisHtml += '<li class="timeline-inverted">';
            thisHtml += '<div class="timeline-panel"  id ="lastTimelinePanel">';
            thisHtml += '<div class="tl-heading">';
            thisHtml += '<h4 lang="en">End of trip</h4>';
            thisHtml += '<p id="tldatelastparagraph"><small class="text-muted"><i class="glyphicon glyphicon-time"></i> '+(currentTripEndDate.getHours()<10?'0':'')+currentTripEndDate.getHours()+':'+(currentTripEndDate.getMinutes()<10?'0':'')+currentTripEndDate.getMinutes()+' - '+(nextTripStartDate.getHours()<10?'0':'')+nextTripStartDate.getHours()+':'+(nextTripStartDate.getMinutes()<10?'0':'')+nextTripStartDate.getMinutes()+'</small></p>';
            thisHtml += '</div>';
            thisHtml += '<div class="tl-body">';
  //              thisHtml += '<p lang="en">Place: '+getPlaceSelector(places)+'</p>';
  //               thisHtml += '<p lang="en">Purpose: '+getPurposeSelector(purposes)+'</p>';
               thisHtml += '<p lang="en" id="lasttimeend">Time: '+hoursDiff+' hours</p>';
            thisHtml += '</div>';
            thisHtml += '</div>';
            thisHtml += '</li>';

            /* Add process next trip */
            thisHtml += '<li id="processNext">';
            thisHtml += '<div class="tldatecontrol"> <p lang="en"><i class="glyphicon glyphicon-arrow-down"></i> Process the next trip <i class="glyphicon glyphicon-arrow-down"></i> </p>';// <p lang="sv"><i class="glyphicon glyphicon-arrow-down"></i> Gå till nästa förflyttning <i class="glyphicon glyphicon-arrow-down"></i> </p>';
            thisHtml += '</div>';
            thisHtml += '</li>';
        }
        else{
            thisHtml += '<li class="timeline-inverted">';
            thisHtml += '<div class="timeline-panel" id ="lastTimelinePanel">';
            thisHtml += '<div class="tl-heading">';
            thisHtml += '<h4 lang="en">End of the trip</h4>';
            thisHtml += '<p id="tldatelastparagraph"><small class="text-muted"><i class="glyphicon glyphicon-time"></i> '+(currentTripEndDate.getHours()<10?'0':'')+currentTripEndDate.getHours()+':'+(currentTripEndDate.getMinutes()<10?'0':'')+currentTripEndDate.getMinutes()+'</small></p>';
            thisHtml += '</div>';
            thisHtml += '<div class="tl-body">';
   //            thisHtml += '<p lang="en">Place: '+getPlaceSelector(places)+'</p>';
   //              thisHtml += '<p lang="en">Purpose: '+getPurposeSelector(purposes)+'</p>';
              thisHtml += '</div>';
            thisHtml += '</div>';
            thisHtml += '</li>';

            thisHtml += '<li><div class="tldate">';
            thisHtml += '<p lang="en"> These are all the trip data available now</p>';
            thisHtml += '</div></li>';
        }

        li.innerHTML = thisHtml;

        ul.appendChild(li)

        /**
         * NO LISTENERS YET
         */

    /*    var processNext = document.getElementById('processNext');

        if (processNext!=null)
            processNext.onclick = nextFunction;

        var selectOption = document.getElementById('placeSelect');
        selectOption.onchange = placeSelectListener;

        var selectPurposeOption = document.getElementById('purposeSelect');
        selectPurposeOption.onchange = purposeSelectListener;
      */
    },

    /**
     * Appends the timeline element of a tripleg to the timeline list and adds its listeners
     * @param tripleg - the tripleg element
     */
    generateElement: function(tripId, tripleg) {

      if (tripleg.getType() == 1){
        var ul = document.getElementById(elementId);
        var li = document.createElement("li");
        li.id = "listItem"+tripleg.getId();
        var thisHtml = getContent(tripleg);

        console.warn('generateModal?');
        //thisHtml+=generateModal(tripleg.triplegid, isFirst, isLast);

        console.warn('getTransitionPanel?');
        //if(getTransitionPanel(tripleg, isLast)!=undefined)
        //    thisHtml+= getTransitionPanel(tripleg, isLast);

        li.innerHTML = thisHtml;

        ul.appendChild(li);
        addListeners(tripId, tripleg);
      }
    },

    addListeners: addListeners

  };
};