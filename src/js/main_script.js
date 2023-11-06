
$(document).ready(function(){
    var line_geo = {}
    var line_registry = {}
    var vehicle_registry = {}
    var width = window.innerWidth
    var height = window.innerHeight;
    var boston_coords = [
        -71.0589,
        42.3601
    ]
    var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([50000])
    var pathGenerator = d3.geoPath().projection(projection);
    var svg = d3.select("#map").append("svg").attr("width", 1000).attr("height", 500);
    var p = svg.selectAll("path")
    //"2023-11-05T10:54:44-05:00"
    //"2023-11-05T10:54:00-05:00"
    function min_to_color(min_behind){
        console.log('min_behind')
        console.log(min_behind);
        if (min_behind < 2){
            console.log('got green!')
            return {color:'#21D648', message: 'on time'}
        }   
        else if (min_behind >= 2 && min_behind < 5){
            console.log('got orange!')
            return {color:'orange', message: `${Math.round(min_behind, 0)} minutes behind schedule`}
        }
        else if (min_behind >= 5){
            console.log('got red!')
            return {color:'red', message: `${Math.round(min_behind, 0)} minutes behind schedule`}
        }
    }
    function record_new_schedule_prediction(vehicle_id, direction_id, route_id, trip_id, stop_id, s_p, prediction, pred_date, d1){
        vehicle_registry[vehicle_id] = {
            direction_id: direction_id,
            route_id: route_id,
            trip_id: trip_id,
            stop_id: stop_id,
            schedule: s_p,
            prediction: prediction,
            pred_date: pred_date,
            scheduled_date: d1
        }
        var min_behind = (pred_date - d1)/(1000*60);
        var response_payload = min_to_color(min_behind);
        d3.selectAll(`path[vpid="${vehicle_id}"]`).attr('stroke', response_payload.color)
        $('.line-about span').html(`- ${response_payload.message}`)

    }
    function check_against_schedule(vehicle_id, direction_id, route_id, trip_id, stop_id, prediction){
        var pred_date = new Date(prediction.attributes.arrival_time);
        $.ajax({
            url: `https://api-v3.mbta.com/schedules?filter[direction_id]=${direction_id}&filter[route]=${route_id}&filter[route_type]=2&filter[stop]=${stop_id}&filter[trip]=${trip_id}&page[limit]=100&page[offset]=0&sort=arrival_time`,
            type: "get",
            success: function(response) {
                console.log('schedule response here')
                console.log(response);
                var all_results = []
                var s_p = null;
                var d1 = null;
                var dt = null;
                for (var i of response.data){
                    var _d1 = new Date(i.attributes.arrival_time)
                    if (dt === null || Math.abs(pred_date - _d1) <= dt){
                        s_p = i;
                        dt = Math.abs(pred_date - _d1);
                        d1 = _d1
                    }
                }
                console.log('found scheduled inference')
                console.log(pred_date)
                console.log(d1)
                console.log(pred_date - d1)
                record_new_schedule_prediction(vehicle_id, direction_id, route_id, trip_id, stop_id, s_p, prediction, pred_date, d1)
                
                
            },
            error: function(xhr) {
              //Do Something to handle error
            }
        });
    }
    function make_predictions(vehicle_id, direction_id, route_id, trip_id, stop_id){
        $.ajax({
            url: `https://api-v3.mbta.com/predictions?filter[direction_id]=${direction_id}&filter[route]=${route_id}&filter[route_type]=2&filter[stop]=${stop_id}&filter[trip]=${trip_id}&page[limit]=100&page[offset]=0&sort=arrival_time`,
            type: "get",
            success: function(response) {
                console.log('prediction response here')
                console.log(response);
                if (response.data.length > 0){
                    check_against_schedule(vehicle_id, direction_id, route_id, trip_id, stop_id, response.data[0])
                }
            },
            error: function(xhr) {
              //Do Something to handle error
            }
        });
    }
    function draw_train_progress(payload){
        console.log('payload in draw_train_progress')
        console.log(payload)
        vehicle_registry[payload.id] = null
        var vehicle_id = payload.id;
        var direction_id = payload.attributes.direction_id;
        var route_id = payload.relationships.route.data.id;
        var trip_id = payload.relationships.trip.data.id;
        var stop_id = payload.relationships.stop.data.id
        var lat = payload.attributes.latitude;
        var long = payload.attributes.longitude;
        $(`path[vid="${payload.id}"]`).remove();
        $(`path[vpid="${payload.id}"]`).remove();
        if (direction_id === 1){
            p.data([{
                "type": "Feature",
                "properties": {
                    "name": "train"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [long, lat]
                },
                "skey": 5,
                "s_len": 0
            }])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '10').attr('stroke', 'red').attr('vid', payload.id).attr('skey', '5')
            var elem = document.querySelector(`path[vid="${payload.id}"]`)
            var b = elem.getBoundingClientRect()
            $(`.train-icon[vid="${payload.id}"]`).remove();
            $('body').append(`<img src='/src/img/train_icon.svg' class='train-icon' vid="${payload.id}">`)
            console.log('b below')
            console.log(b)
            $(`.train-icon[vid="${payload.id}"]`).css('left', b.left-18)
            $(`.train-icon[vid="${payload.id}"]`).css('top', b.top-7)
        }
        //42.37422180175781
        //-71.23595428466797
        //Boston: -71.0589
        var coords = []
        for (var i of line_geo[route_id]){
            for (var [_long, _lat] of i.geometry.coordinates){
                if (direction_id === 1){
                    if (Math.abs(_long) >= Math.abs(long)){
                        coords.push([_long, _lat])
                    }
                }
                else{
                    continue;
                    if (Math.abs(_long) <= Math.abs(long)){
                        coords.push([_long, _lat])
                    }
                }
            }
        }
        p.data([{
                "type": "Feature",
                "properties": {
                    "name": "na",
                    "route_id": "na"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "skey": 3,
                "s_len": coords.length
        }])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', '#cdcdcd').attr('vpid', payload.id).attr('skey', '3')

        make_predictions(vehicle_id, direction_id, route_id, trip_id, stop_id)
        d3.selectAll("#map path").sort(function(a,b) {
            if (a.skey > b.skey){
                return 1
            }
            else if (a.skey < b.skey){
                return -1
            }
            else if (a.s_len > b.s_len){
                return -1
            }
            return 0
        }).order()
        
    }
    function handle_vehicle_endpoint(response, handler){
        if (handler != 'remove'){
            var data = JSON.parse(response.data)
            if (Array.isArray(data)){
                for (var i of data){
                    draw_train_progress(i)
                }
            }
            else{
                draw_train_progress(data)
            }
        }
        else{
            $(`path[vid="${data.id}"]`).remove();
            $(`path[vpid="${data.id}"]`).remove();
            delete vehicle_registry[data.id]
        }

    }
    d3.json('json_data/lines_and_stops_geo.json', function(data){
        var p = svg.selectAll("path")
        for (var i of data.features){
            if (i.geometry.type === 'LineString'){
                if (!(i.properties.route_id in line_geo)){
                    line_geo[i.properties.route_id] = []
                }
                line_geo[i.properties.route_id].push(i)
                line_registry[i.properties.route_id] = i.properties.name
            }
            if (i.geometry.type === 'LineString' && i.properties.name === "Fitchburg Line"){
                p.data([{...i, skey: 1, s_len: 0}])
                .enter()
                .append("path")
                .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', '#cdcdcd').attr('skey', '1')
            }
            else if (i.properties.route === 'Fitchburg Line'){
                p.data([{...i, skey: 4, s_len: 0}])
                .enter()
                .append("path")
                .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', 'gray').attr('skey', '4')
                .attr('class', 'stop')
                .attr('name', i.properties.name)
            }
        }
        for (var i of Object.keys(line_registry)){
            $('.line-options').append(`<option value="${i}">${line_registry[i]}</option>`)
        }
        $('.line-options').val('CR-Fitchburg')
        d3.selectAll("#map path").sort(function(a,b) {
            if (a.skey > b.skey){
                return 1
            }
            else if (a.skey < b.skey){
                return -1
            }
            return 0
        }).order()
        /*
        p.data([{
            "type": "Feature",
            "properties": {
                "name": "Boston Center"
            },
            "geometry": {
                "type": "Point",
                "coordinates": boston_coords
            }
        }])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '10').attr('stroke', 'red')
        */
        d3.selectAll(".stop")
        .on("mouseover", function(){
            $('.stop-tooltip').html(this.getAttribute('name'));
            $('.stop-tooltip').css('visibility', 'visible')
            var rect = this.getBoundingClientRect();
            $('.stop-tooltip').css('top', rect.top - 15);
            $('.stop-tooltip').css('left', rect.left + 15);
        })
        .on("mousemove", function(){
    
        })
        .on("mouseout", function(){
            $('.stop-tooltip').css('visibility', 'hidden')
        });
        var evtSource = new EventSource('https://api-v3.mbta.com/vehicles?filter[route]=CR-Fitchburg&filter[route_type]=2&page[limit]=100&page[offset]=0&sort=current_stop_sequence&api_key=ec477916907d435d9cdc835309d1a9f0');
        evtSource.addEventListener('reset', function(e){
            handle_vehicle_endpoint(e, 'reset')
        })
        evtSource.addEventListener('update', function(e){
            handle_vehicle_endpoint(e, 'update')
        })
        evtSource.addEventListener('add', function(e){
            handle_vehicle_endpoint(e, 'add')
        });
        evtSource.addEventListener('remove', function(e){
            console.log('got remove')
            console.log(e)
            handle_vehicle_endpoint(e, 'remove')
        });
    });
    
})