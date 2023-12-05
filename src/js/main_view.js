$(document).ready(function(){
    var route_mappings = {}
    var line_geo = {}
    var line_registry = {}
    var vehicle_registry = {}
    var route_stop_delays = {}
    var evtSource = null;
    var ROUTE_ID = null;
    var ROUTE_WIDTH = null;
    var ROUTE_P = null;
    var stop_registry = {'BNT-0000':"North Station", 'NEC-2287':"South Station", 'ER-0042':'Chelsea'}

    d3.csv('raw_datasets/MBTA_rail_stops.csv', function(data){
        for (var i of data){
            stop_registry[i.stop_id] = i.stop_name;
        }
    });
    function degreesToRadians(degrees) {
        return (degrees % 360) * (Math.PI / 180);
    }
    function coord_dist(lat1, log1, lat2, log2){
        
        var r = Math.acos((Math.sin(degreesToRadians(lat1)) * Math.sin(degreesToRadians(lat2))) + (Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2))) * (Math.cos(degreesToRadians(log2) - degreesToRadians(log1)))) * 6371
        return r
    }
    /* DELAYS VIEW JS */
    var anchorings = {
        'CR-Fitchburg':[40000, [
            -71.35,
            42.3601
        ]],
        'CR-Fairmount':[80000, [
            -71.1,
            42.23
        ]],
        'CR-Worcester':[40000, [
            -71.3,
            42.2
        ]],
        'CR-Franklin':[50000, [
            -71.1,
            42.18
        ]],
        'CR-Greenbush':[80000, [
            -70.8,
            42.23
        ]],
        'CR-Haverhill':[50000, [
            -71.005,
            42.57
        ]],
        'CR-Kingston':[40000, [
            -70.8,
            42.1
        ]],
        'CR-Lowell':[60000, [
            -71.00001,
            42.48
        ]],
        'CR-Middleborough':[40000, [
            -71.00001,
            42.1
        ]],
        'CR-Needham':[80000, [
            -71.00001,
            42.23
        ]],
        'CR-Newburyport':[40000, [
            -70.8,
            42.55
        ]],
        'CR-Providence':[24000, [
            -71.001,
            42.000001
        ]]
    }
    function stop_delay_color(delay){
        if (delay < 5){
            return ['#33d962', 'caret-arrow-up.png'];
        }
        else if (delay >= 5 && delay < 15){
            return ['#fdc81a', 'medium-delay-arrow.png'];
        }
        else{
            return ['#ff5252', 'severe-delay-arrow.png']
        }
    }   
    function render_route_delay_colors(route_id){
        for (var i of route_stop_delays[route_id]){
            var [color, img] = stop_delay_color(i.mdt);
            $(`.route-view-stop[name="${i.stop_name}"]`).css('stroke', color);
            $(`.cell-stop-name-S[name="${i.stop_name}"]`).append(`<img src='src/img/${img}' style='width:12px;height:12px;margin-left:5px;margin-top:3px;'>`)
        }
    }
    function render_delay_table(route_id){
        var all_stops = route_stop_delays[route_id].sort(function(a, b){
            if (a.mdt < b.mdt){
                return -1
            }
            if (a.mdt > b.mdt){
                return 1
            }
            return 0
        });
        $('.route-table-display').html(`<div class='record-container' id='stop-delay-table'>
            <div class='cell cell-header'>Stop</div>
            <div class='cell cell-header'>Average delay</div>
            <div class='cell cell-header'>Average train boarding size</div>
        </div>`);
        for (var i of all_stops){
            $('#stop-delay-table').append(`<div class='cell cell-stop-name cell-stop-name-S' name='${i.stop_name}'>${i.stop_name}</div><div class='cell cell-stop-name' name='${i.stop_name}'>${i.mdt} minute${i.mdt === 1 ? "" : "s"}</div><div class='cell cell-stop-name' name='${i.stop_name}'>${i.average_boarding} ${i.average_boarding != 'N/A' ? 'passengers' : ''}</div>`)
        }
        $('.cell.cell-stop-name').on('mouseenter', function(e){
            $('.stop-tooltip').html(this.getAttribute('name'));
            var rect = $(`.route-view-stop[name="${this.getAttribute('name')}"]`)[0].getBoundingClientRect();
            $('.stop-tooltip').css('top', rect.top + window.scrollY);
            $('.stop-tooltip').css('left', rect.left + window.scrollX);
            $('.stop-tooltip').css('visibility', 'visible')
            $(`.route-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '20')
            $(`.cell[name="${this.getAttribute('name')}"]`).each(function(){
                $(this).addClass('cell-hover')
            });
        }).on('mouseout', function(){
            $(`.cell[name="${this.getAttribute('name')}"]`).each(function(){
                $(this).removeClass('cell-hover')
            });
            $('.stop-tooltip').css('visibility', 'hidden')
            $(`.route-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '8')
        });

    }
    d3.json('json_data/routes.json', function(json_data){
        for (var i of json_data){
            if (i.attributes.long_name.startsWith('Foxboro')){
                continue;
            }
            $('.rail-line-options').append(`<div class='route-choice' data-id='${i.id}'>${i.attributes.long_name}</div>`);
            route_mappings[i.id] = i.attributes.long_name;
        }
        
    });
    function display_route_results(route_id){
        ROUTE_ID = route_id;
        d3.csv('agg_datasets/train_reliability.csv', function(csv_data){
            $('.route-map-outer').html(`
            <div class="legend">
                <div class="legend-text">Stop delay codes</div>
                <div style="height:10px"></div>
                <div class='legend-items-horizontal'>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#33d962'></div>
                        <div class="legend-block-text">less than 5 min</div>
                    </div>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#fdc81a'></div>
                        <div class="legend-block-text">between 5 and 15 min </div>
                    </div>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#ff5252'></div>
                        <div class="legend-block-text">more than 15 min</div>
                    </div>
                </div>
            </div>
            <div id="map"></div>
            `)
            var train_reliability = Object.fromEntries(csv_data.map(function(x){return [x.name, parseFloat(x.reliability)]}))
            console.log(train_reliability)
            console.log(route_mappings)
            console.log(route_mappings[route_id])
            console.log(train_reliability[route_mappings[route_id]])
            $('.route-reliability-header').html(`${route_mappings[route_id]} reliability: ${Math.round(train_reliability[route_mappings[route_id]]*100)}%<a href='#mbta-rail-reliability' style='text-decoration:none'><span>&#42;</span></a>`)
            $('.route-reliability.description-text').html(`Inspect the line map below to find the average delay times for stops along this route.`)
            $('.realtime-view-header').html(`${route_mappings[route_id]} live view`)
            $('.live-view-about').css('display', 'block');
            var width = parseInt($('.route-map-outer').css('width').match('^\\d+'));
            var height = 500;
            ROUTE_WIDTH = width;
            var [scale, boston_coords] = anchorings[route_id]
            var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
            var pathGenerator = d3.geoPath().projection(projection);
            var svg = d3.select("#map").append("svg").attr("width", width).attr("height", 500);
            var p = svg.selectAll("path")
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
                    if (i.geometry.type === 'LineString' && i.properties.route_id === route_id){
                        p.data([{...i, skey: 1, s_len: 0}])
                        .enter()
                        .append("path")
                        .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', '#cdcdcd').attr('skey', '1')
                    }
                    else if (i.properties.route_id === route_id){
                        p.data([{...i, skey: 4, s_len: 0}])
                        .enter()
                        .append("path")
                        .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', 'gray').attr('skey', '4')
                        .attr('class', 'route-view-stop')
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
                var first_coords = null;
                $('.route-view-stop').on('mouseenter', function(e){
                    console.log(this);
                    //alert('here!')
                    $('.stop-tooltip').html(this.getAttribute('name'));
                    $(`.route-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '20')
                    $('.stop-tooltip').css('visibility', 'visible')
                    if (first_coords === null){
                        first_coords = [e.pageY - 20, e.pageX]
                    }
                    $('.stop-tooltip').css('top', first_coords[0]);
                    $('.stop-tooltip').css('left', first_coords[1]);
                    $(`.cell[name="${this.getAttribute('name')}"]`).addClass('cell-hover')
                }).on('mouseout', function(){
                    first_coords = null;
                    $('.stop-tooltip').css('visibility', 'hidden')
                    $(`.cell[name="${this.getAttribute('name')}"]`).removeClass('cell-hover')
                    $(`.route-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '8')
                });
                if (Object.keys(route_stop_delays).length > 0){
                    render_delay_table(route_id);
                    render_route_delay_colors(route_id);
                }
                else{
                    d3.csv('agg_datasets/route_stop_delays_avg_boardings.csv', function(data){
                        for (var i of data){
                            if (!(i.route in route_stop_delays)){
                                route_stop_delays[i.route] = []
                            }
                            route_stop_delays[i.route].push({...i, mdt:Math.ceil(parseFloat(i.average_min_delay)), average_boarding:i.average_boarding_rate != 'N/A'? Math.ceil(parseFloat(i.average_boarding_rate)) : 'N/A'});
                        }
                        render_delay_table(route_id);
                        render_route_delay_colors(route_id);
                    });
                }
                $('.train-pulse').each(function(){
                    $(this).remove()
                }); 
                $('.live-view-table').html(`
                <div class='record-container' id='live-display-table'>
                    <div class='cell cell-header'>Train</div>
                    <div class='cell cell-header'>Next Stop</div>
                    <div class='cell cell-header'>Status</div>
                    <div class='cell cell-header'>Estimated Arrival</div>
                </div>`);
                draw_live_line(route_id);
            });
        });
        //alert(route_id)
    }
    $('body').on('click', '.route-choice', function(){
        $('.route-choice').each(function(){
            $(this).removeClass('route-choice-selected');
        });
        $(this).addClass('route-choice-selected');
        display_route_results($(this).data('id'));
    });
    /* LIVE VIEW JS */
    function min_to_color(min_behind){
        console.log('min_behind')
        console.log(min_behind);
        if (min_behind < 2){
            console.log('got green!')
            return {color:'green', message: 'on time'}
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
    function render_train_stats(){
        var results = [];
        for (var i of Object.keys(vehicle_registry)){
            results.push(vehicle_registry[i].message)
        }
        return results.join(', ')
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
        var pred_hour_min = `${pred_date.getHours() < 13 ? pred_date.getHours() : pred_date.getHours() - 12}:${pred_date.getMinutes().toString().padStart(2, '0')} ${pred_date.getHours() < 12 ? "AM" : "PM"}`
        var response_payload = min_to_color(min_behind);
        vehicle_registry[vehicle_id].color = response_payload.color;
        for (var i of ['green', 'orange', 'red', 'purple']){
            $(`.train-pulse[vid="${vehicle_id}"]`).removeClass(i);
        }
        //stop_registry
        //#live-display-table
        $(`.cell.cell-live-view[vid="${vehicle_id}"]`).each(function(){
            $(this).remove();
        });
        console.log('stop id in record schedule')
        console.log(stop_id);
        console.log(stop_registry)
        var full_minutes_behind = Math.round(min_behind, 0)
        if (full_minutes_behind < 0){
            full_minutes_behind = 0;
        }
        if (!(stop_id in stop_registry)){
            console.log('missing this stop in the registry')
            console.log(stop_id)
        }
        $("#live-display-table").append(`
            <div class='cell cell-live-view' vid="${vehicle_id}">Train ${vehicle_id}</div>

            <div class='cell cell-live-view' vid="${vehicle_id}">${stop_registry[stop_id]}</div>
            <div class='cell cell-live-view' vid="${vehicle_id}">${full_minutes_behind === 0 ? "On time" : `${full_minutes_behind} minute${full_minutes_behind === 1 ? "" : "s"} behind`}</div>
            <div class='cell cell-live-view' vid="${vehicle_id}">${pred_hour_min}</div>
        `)
        $(`.train-pulse[vid="${vehicle_id}"]`).addClass(response_payload.color);
        //vehicle_registry[vehicle_id] = {...vehicle_registry[vehicle_id], response_payload}
        //d3.selectAll(`path[vpid="${vehicle_id}"]`).attr('stroke', response_payload.color)
        $('.cell-live-view').on('mouseenter', function(e){
            $('.stop-tooltip').html(`Train ${this.getAttribute('vid')}`);
            var rect = $(`.train-pulse[vid="${this.getAttribute('vid')}"]`)[0].getBoundingClientRect();
            $('.stop-tooltip').css('top', rect.top + window.scrollY - 10);
            $('.stop-tooltip').css('left', rect.left + window.scrollX + 20);
            $('.stop-tooltip').css('visibility', 'visible')
            $(`.train-pulse[vid="${this.getAttribute('vid')}"]`).css('stroke-width', '20')
            $(`.cell[vid="${this.getAttribute('vid')}"]`).each(function(){
                $(this).addClass('cell-hover')
            });
        }).on('mouseout', function(){
            $(`.cell[vid="${this.getAttribute('vid')}"]`).each(function(){
                $(this).removeClass('cell-hover')
            });
            $('.stop-tooltip').css('visibility', 'hidden')
        });
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
        //var svg = d3.select("#live-view-map > svg")
        //var p = svg.selectAll("path[pathid='2']")
        p = ROUTE_P;
        console.log('p in drain progress')
        console.log(p)
        console.log('payload in draw_train_progress')
        console.log(payload)
        //var width = parseInt($('.live-view-container').css('width').match('^\\d+'));
        var height = 500;
        width = ROUTE_WIDTH;
        var [scale, boston_coords] = anchorings[ROUTE_ID]
        console.log('coord stuff in train progress')
        console.log([scale, boston_coords])
        var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
        var pathGenerator = d3.geoPath().projection(projection);
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
            .attr("d", pathGenerator).attr('stroke-width', '6').attr('stroke', 'red').attr('vid', payload.id).attr('skey', '5')
            var elem = document.querySelector(`path[vid="${payload.id}"]`)
            var b = elem.getBoundingClientRect()
            $(`.train-icon[vid="${payload.id}"]`).remove();
            //$('body').append(`<img src='/src/img/train_icon.svg' class='train-icon' vid="${payload.id}">`)
            console.log('b below')
            console.log(b)
            //train-pulse
            $(`.train-pulse[vid="${payload.id}"]`).remove();
            if (payload.id in vehicle_registry && vehicle_registry[payload.id] != null){
                $('body').append(`<div class='train-pulse ${vehicle_registry[payload.id].color}' vid='${payload.id}'></div>`);
            }
            else{
                $('body').append(`<div class='train-pulse purple' vid='${payload.id}'></div>`);
            }
            $(`.train-pulse[vid="${payload.id}"]`).css('left', b.left + window.scrollX - 24)
            $(`.train-pulse[vid="${payload.id}"]`).css('top', b.top + window.pageYOffset - 24)
            $(`.train-icon[vid="${payload.id}"]`).css('left', b.left + window.scrollX - 26)
            $(`.train-icon[vid="${payload.id}"]`).css('top', b.top + window.pageYOffset - 16)
            var first_coords = null;
            $('.train-pulse').on('mouseenter', function(e){
                //alert('here!')
                $('.stop-tooltip').html(`Train ${this.getAttribute('vid')}`);
                $('.stop-tooltip').css('visibility', 'visible')
                if (first_coords === null){
                    first_coords = [e.pageY - 10, e.pageX + 10]
                }
                $('.stop-tooltip').css('top', first_coords[0]);
                $('.stop-tooltip').css('left', first_coords[1]);
                $(`.cell.cell-live-view[vid="${this.getAttribute('vid')}"]`).addClass('cell-hover')
            }).on('mouseout', function(){
                first_coords = null;
                $('.stop-tooltip').css('visibility', 'hidden')
                $(`.cell.cell-live-view[vid="${this.getAttribute('vid')}"]`).removeClass('cell-hover')
            });
        
        }
        //42.37422180175781
        //-71.23595428466797
        //Boston: -71.0589
        var coords = []
        var seen_coords = []
        /*
        while (true){
            var f = false;
            for (var i of line_geo[route_id]){
                for (var [_long, _lat] of i.geometry.coordinates){
                    if (direction_id === 1){
                        if (coord_dist(lat, long, _lat, _long) < 2){
                            if (!seen_coords.includes(JSON.stringify([_long, _lat]))){
                                coords.push([long, lat])
                                seen_coords.push(JSON.stringify([long, lat]))
                                lat = _lat
                                long = _long
                                var f = true
                            }
                        }
                    }
                }
            }
            if (!f){
                break;
            }
        }  
        
        console.log('fina coords') 
        console.log(coords)
        //console.log('testing max of coords')
        //console.log(Math.min(...coords))
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
        */
        make_predictions(vehicle_id, direction_id, route_id, trip_id, stop_id)
        d3.selectAll("#live-view-map path").sort(function(a,b) {
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
    function draw_live_line(route_id){
        $('.train-icon').each(function(){
            $(this).remove();
        });
        $('.live-view-container').html(`
        <div style="height:20px"></div>
        <div class="legend">
            <div class="legend-text">Train delay codes</div>
            <div style="height:10px"></div>
            <div class='legend-items-horizontal'>
                <div class='legend-delay-stops'>
                    <div class='legend-circle' style='background-color:rgb(51, 217, 98)'></div>
                    <div class="legend-block-text">On time</div>
                </div>
                <div class='legend-delay-stops'>
                    <div class='legend-circle' style='background-color:#fdc81a'></div>
                    <div class="legend-block-text">2 to 15 min behind</div>
                </div>
                <div class='legend-delay-stops'>
                    <div class='legend-circle' style='background-color:rgba(255, 82, 82, 1)'></div>
                    <div class="legend-block-text">more than 5 min behind</div>
                </div>
            </div>
        </div>
        <div id="live-view-map"></div>
        `);
        var width = parseInt($('.live-view-container').css('width').match('^\\d+'));
        var height = 500;
        var [scale, boston_coords] = anchorings[route_id]
        var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
        var pathGenerator = d3.geoPath().projection(projection);
        var svg = d3.select("#live-view-map").append("svg").attr("width", width).attr("height", 500);
        var p = svg.selectAll("path")
        ROUTE_P = p;
        d3.json('json_data/lines_and_stops_geo.json', function(data){
            for (var i of data.features){
                if (i.geometry.type === 'LineString'){
                    if (!(i.properties.route_id in line_geo)){
                        line_geo[i.properties.route_id] = []
                    }
                    line_geo[i.properties.route_id].push(i)
                    line_registry[i.properties.route_id] = i.properties.name
                }
                if (i.geometry.type === 'LineString' && i.properties.route_id === route_id){
                    p.data([{...i, skey: 1, s_len: 0}])
                    .enter()
                    .append("path")
                    .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', '#cdcdcd').attr('skey', '1').attr('pathid', '2')
                }
                else if (i.properties.route_id === route_id){
                    p.data([{...i, skey: 4, s_len: 0}])
                    .enter()
                    .append("path")
                    .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', 'gray').attr('skey', '4')
                    .attr('class', 'live-view-stop')
                    .attr('name', i.properties.name)
                }
            }
            if (Object.keys(route_stop_delays).length > 0){
                render_delay_table(route_id);
                render_route_delay_colors(route_id);
            }
            for (var i of Object.keys(line_registry)){
                $('.line-options').append(`<option value="${i}">${line_registry[i]}</option>`)
            }
            $('.line-options').val(route_id)
            d3.selectAll("#live-view-map path").sort(function(a,b) {
                if (a.skey > b.skey){
                    return 1
                }
                else if (a.skey < b.skey){
                    return -1
                }
                return 0
            }).order()
            d3.selectAll(".live-view-stop")
            .on("mouseover", function(){
                $('.stop-tooltip').html(this.getAttribute('name'));
                $('.stop-tooltip').css('visibility', 'visible')
                $(`.live-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '20')
                var rect = this.getBoundingClientRect();
                $('.stop-tooltip').css('top', rect.top + window.pageYOffset - 20);
                $('.stop-tooltip').css('left', rect.left + window.scrollX + 10);
            })
            .on("mousemove", function(){
        
            })
            .on("mouseout", function(){
                $(`.live-view-stop[name="${this.getAttribute('name')}"]`).css('stroke-width', '8')
                $('.stop-tooltip').css('visibility', 'hidden')
            });
            if (evtSource != null){
                evtSource.close();
            }
            evtSource = new EventSource(`https://api-v3.mbta.com/vehicles?filter[route]=${route_id}&filter[route_type]=2&page[limit]=100&page[offset]=0&sort=current_stop_sequence&direction_id=1&api_key=ec477916907d435d9cdc835309d1a9f0`);
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
    }
    function get_relability_color(r){
        if (r >= 90){
            return '#33d962'
        }
        else if (r < 90 && r > 87){
            return '#fdc81a'
        }
        else if (r <= 87 && r > 0){
            return '#ff5252'
        }
        return '#cdcdcd'
    }
    function display_full_line_reliability(){
        var boston_coords = [
            -71.0589,
            42.260
        ]
        var width = parseInt($('.all-lines-container').css('width').match('^\\d+'));
        var height = 500;
        var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([18000])
        var pathGenerator = d3.geoPath().projection(projection);
        var svg = d3.select("#full-route-map").append("svg").attr("width", width).attr("height", 500);
        var p = svg.selectAll("path")
        d3.json('json_data/lines_and_stops_geo.json', function(data){
            d3.csv('agg_datasets/estimated_boardings.csv', function(est_boardings){
                var estimated_boardings = Object.fromEntries(est_boardings.map(function(x){return [x.line, parseInt(x.estimated_boardings)]}))
                d3.csv('agg_datasets/train_reliability.csv', function(csv_data){
                    csv_data = csv_data.sort(function(a, b){
                        if (parseFloat(a.reliability) > parseFloat(b.reliability)){
                            return -1
                        }
                        if (parseFloat(a.reliability) < parseFloat(b.reliability)){
                            return 1
                        }
                        return 0
                    });
                    for (var i of csv_data){
                        $('#full-route-table').append(`
                        <div class='cell full-route-cell' route='${i.name}'>${i.name}</div>
                        <div class='cell full-route-cell' route='${i.name}'>${Math.round(parseFloat(i.reliability)*100,0)}%</div>
                        <div class='cell full-route-cell' route='${i.name}'>${estimated_boardings[i.name]}</div>
                        `)
                    }
                    var train_reliability = Object.fromEntries(csv_data.map(function(x){return [x.name, parseFloat(x.reliability)]}))
                    console.log(train_reliability);
                    var p = svg.selectAll("path")
                    function get_train_reliability_details(name){
                        var reliability = null;
                        var color = null;
                        if (name in train_reliability){
                            reliability = train_reliability[name]
                        }
                        else{
                            for (var n of Object.keys(train_reliability)){
                                for (var sn of name.split('/')){
                                    for (var N of n.split(' ')){
                                        if (sn.includes(N)){
                                            reliability = train_reliability[n]
                                            break
                                        }
                                    }
                                }
                            }
                        }
                        var r = Math.round(reliability*100, 0)
                        color = get_relability_color(r)
                        return {
                            name:name,
                            reliability: r > 0 ? r.toString()+'% reliable' : 'No data available',
                            color:color
                        }
                    }
                    for (var i of data.features){
                        if (i.geometry.type === 'LineString'){
                            if (!(i.properties.route_id in line_geo)){
                                line_geo[i.properties.route_id] = []
                            }
                            line_geo[i.properties.route_id].push(i)
                            line_registry[i.properties.route_id] = i.properties.name
                        }
                        if (i.geometry.type === 'LineString'){
                            if (!(i.properties.name in train_reliability)){
                                console.log('missed')
                                console.log(i.properties.name)
                            }
                            var details = get_train_reliability_details(i.properties.name)
                            p.data([{...i, skey: 1, s_len: 0}])
                            .enter()
                            .append("path")
                            .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', details.color).attr('skey', '1').attr('details', JSON.stringify(details)).attr('class', 'line-full').attr('route', details.name);
                        }
                    }
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
                    $('.line-full').on("mouseover", function(e){
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '13');
                        var details = JSON.parse(this.getAttribute('details'))
                        $('.stop-tooltip').html(`${details.name}: ${details.reliability}`);
                        $('.stop-tooltip').css('visibility', 'visible')
                        var rect = this.getBoundingClientRect();
                        $('.stop-tooltip').css('top', e.pageY);
                        $('.stop-tooltip').css('left', e.pageX);
                        $(`.cell[route="${details.name}"]`).addClass('cell-hover')
                    })
                    .on("mousemove", function(){

                    })
                    .on("mouseout", function(){
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '8');
                        var details = JSON.parse(this.getAttribute('details'))
                        $(`.cell[route="${details.name}"]`).removeClass('cell-hover')
                        $('.stop-tooltip').css('visibility', 'hidden')
                    });
                    $('.full-route-cell').on('mouseenter', function(e){
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '13')
                        $(`.full-route-cell[route="${this.getAttribute('route')}"]`).each(function(){
                            $(this).addClass('cell-hover')
                        });
                    }).on('mouseout', function(){
                        $(`.full-route-cell[route="${this.getAttribute('route')}"]`).each(function(){
                            $(this).removeClass('cell-hover')
                        });
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '8')
                    });
                });
            });
        });
    }
    function display_reliability_by_year(){
        d3.csv('agg_datasets/reliability_year.csv', function(data){
            //console.log(data);
            var margin = {top: 10, right: 100, bottom: 30, left: 30},
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

            data = data.map(function(x){return {year:parseInt(x.year), reliability:Math.round(parseFloat(x.reliability)*100)}})
            console.log(data);
            var svg = d3.select("#total-reliability")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");


            var x = d3.scaleLinear()
                .domain([Math.min(...data.map(function(x){return x.year})), Math.max(...data.map(function(x){return x.year}))])
                .range([ 0, width + 250]);

            svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).tickFormat(d3.format('d')));
        
            // Add Y axis
            var y = d3.scaleLinear()
                .domain( [60, 100])
                .range([ height, 0 ]);
            svg.append("g")
            .call(d3.axisLeft(y));

            var line = svg
            .append('g')
            .append("path")
                .datum(data)
                .attr("d", d3.line()
                .x(function(d) { return x(+d.year) })
                .y(function(d) { return y(+d.reliability) })
                )
                .attr("stroke", "rgb(181 181 181)")
                .style("stroke-width", 4)
                .style("fill", "none")

            // Initialize dots with group a
            var dot = svg
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
                .attr("cx", function(d) { return x(+d.year) })
                .attr("cy", function(d) { return y(+d.reliability) })
                .attr("r", 6)
                .attr('class', 'line-r-point')
                .attr('details', function(d){return JSON.stringify(d)})
                .style("fill", function(d){return get_relability_color(d.reliability)})

            d3.selectAll(".line-r-point")
                .on("mouseover", function(){
                    var details = JSON.parse(this.getAttribute('details'))
                    $('.stop-tooltip').html(`${details.year} reliability: ${details.reliability}%`);
                    $('.stop-tooltip').css('visibility', 'visible')
                    var rect = this.getBoundingClientRect();
                    $('.stop-tooltip').css('top', rect.top + window.pageYOffset - 20);
                    $('.stop-tooltip').css('left', rect.left + window.scrollX + 10);
                    $(this).css('r', '10')

                })
                .on("mousemove", function(){
            
                })
                .on("mouseout", function(){
                    $(this).css('r', '6')

                    $('.stop-tooltip').css('visibility', 'hidden')
                });
            
        });
    }
    display_full_line_reliability();
    display_reliability_by_year();
    //display_delay_causes()
});