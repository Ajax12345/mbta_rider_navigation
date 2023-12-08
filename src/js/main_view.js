$(document).ready(function(){
    /*below: containers for caching large data readins */
    var route_mappings = {}
    var line_geo = {}
    var line_registry = {}
    var vehicle_registry = {}
    var route_stop_delays = {}
    var evtSource = null;
    var ROUTE_ID = null;
    var ROUTE_WIDTH = null;
    var ROUTE_P = null;
    var ROUTE_RELIABILITY_YEAR = {}
    var stop_registry = {'BNT-0000':"North Station", 'NEC-2287':"South Station", 'ER-0042':'Chelsea'}

    d3.csv('raw_datasets/MBTA_rail_stops.csv', function(data){
        // associate stop ids with name
        for (let i of data){
            stop_registry[i.stop_id] = i.stop_name;
        }
    });
    /* DELAYS VIEW JS */
    /*Positionings and scalings of GEO Rail Line maps*/
    const anchorings = {
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
        //color and img arrow to correspond with an average stop delay duration
        if (delay < 5){
            return ['stop-color-green', 'caret-arrow-up.png'];
        }
        else if (delay >= 5 && delay < 15){
            return ['stop-color-orange', 'medium-delay-arrow.png'];
        }
        else{
            return ['stop-color-red', 'severe-delay-arrow.png']
        }
    }   
    function render_route_delay_colors(route_id){
        /*render each line with a color that corresponds to the severity of its delays*/
        for (let i of route_stop_delays[route_id]){
            let [color, img] = stop_delay_color(i.mdt);
            $(`.route-view-stop[name="${i.stop_name}"]`).addClass(color);
            $(`.cell-stop-name-S[name="${i.stop_name}"]`).append(`<img src='src/img/${img}' style='width:12px;height:12px;margin-left:5px;margin-top:3px;'>`)
        }
    }
    function render_delay_table(route_id){
        //display table of all stops for a given route and their corresponding delays
        let all_stops = route_stop_delays[route_id].sort(function(a, b){
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
        for (let i of all_stops){
            $('#stop-delay-table').append(`<div class='cell cell-stop-name cell-stop-name-S' name='${i.stop_name}'>${i.stop_name}</div><div class='cell cell-stop-name' name='${i.stop_name}'>${i.mdt} minute${i.mdt === 1 ? "" : "s"}</div><div class='cell cell-stop-name' name='${i.stop_name}'>${i.average_boarding} ${i.average_boarding != 'N/A' ? 'passengers' : ''}</div>`)
        }
        $('.cell.cell-stop-name').on('mouseenter', function(e){
            $('.stop-tooltip').html(this.getAttribute('name'));
            let rect = $(`.route-view-stop[name="${this.getAttribute('name')}"]`)[0].getBoundingClientRect();
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
        /*load route GEOJSON and save for later */
        for (let i of json_data){
            if (i.attributes.long_name.startsWith('Foxboro')){
                continue;
            }
            $('.rail-line-options').append(`<div class='route-choice' data-id='${i.id}'>${i.attributes.long_name}</div>`);
            route_mappings[i.id] = i.attributes.long_name;
        }
        
    });
    function display_route_results(route_id){
        /*display a route's GEO line, associated and associated stops*/
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
            let train_reliability = Object.fromEntries(csv_data.map(function(x){return [x.name, parseFloat(x.reliability)]}))
            $('.route-reliability-header').html(`${route_mappings[route_id]} reliability: ${Math.round(train_reliability[route_mappings[route_id]]*100)}%<a href='#mbta-rail-reliability' style='text-decoration:none'><span style='color:#4884c9'>&#42;</span></a>`)
            $('.route-reliability.description-text').html(`Hover over stops on the line map below or scan across the table rows to find the average delay duration for stops along this route.`)
            $('.realtime-view-header').html(`${route_mappings[route_id]} live view`)
            $('.live-view-about').css('display', 'block');
            let width = parseInt($('.route-map-outer').css('width').match('^\\d+'));
            let height = 500;
            ROUTE_WIDTH = width;
            let [scale, boston_coords] = anchorings[route_id]
            let projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
            let pathGenerator = d3.geoPath().projection(projection);
            let svg = d3.select("#map").append("svg").attr("width", width).attr("height", 500);
            let p = svg.selectAll("path")
            d3.json('json_data/lines_and_stops_geo.json', function(data){
                let p = svg.selectAll("path")
                for (let i of data.features){
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
                for (let i of Object.keys(line_registry)){
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
                let first_coords = null;
                $('.route-view-stop').on('mouseenter', function(e){
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
                    d3.csv('agg_datasets/route_stop_delays_avg_boardings_1.csv', function(data){
                        for (let i of data){
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
    }
    $('body').on('click', '.route-choice', function(){
        /*handler for when user clicks on a specific line from the list of options*/
        $('.route-choice').each(function(){
            $(this).removeClass('route-choice-selected');
        });
        $(this).addClass('route-choice-selected');
        display_route_results($(this).data('id'));
    });
    /* LIVE VIEW JS */
    function min_to_color(min_behind){
        /*return CSS color classes and associated message for a train's status*/
        /*i.e .train-pulse.green */
        if (min_behind < 2){
            return {color:'green', message: 'on time'}
        }   
        else if (min_behind >= 2 && min_behind < 5){
            return {color:'orange', message: `${Math.round(min_behind, 0)} minutes behind schedule`}
        }
        else if (min_behind >= 5){
            return {color:'red', message: `${Math.round(min_behind, 0)} minutes behind schedule`}
        }
    }
    function record_new_schedule_prediction(vehicle_id, direction_id, route_id, trip_id, stop_id, s_p, prediction, pred_date, d1){
        /*save prediction made from prior function calls and render train on its line */
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
        let min_behind = (pred_date - d1)/(1000*60);
        let pred_hour_min = `${pred_date.getHours() < 13 ? pred_date.getHours() : pred_date.getHours() - 12}:${pred_date.getMinutes().toString().padStart(2, '0')} ${pred_date.getHours() < 12 ? "AM" : "PM"}`
        let response_payload = min_to_color(min_behind);
        vehicle_registry[vehicle_id].color = response_payload.color;
        for (let i of ['green', 'orange', 'red', 'purple']){
            $(`.train-pulse[vid="${vehicle_id}"]`).removeClass(i);
        }
        //stop_registry
        //#live-display-table
        $(`.cell.cell-live-view[vid="${vehicle_id}"]`).each(function(){
            $(this).remove();
        });
        let full_minutes_behind = Math.round(min_behind, 0)
        if (full_minutes_behind < 0){
            full_minutes_behind = 0;
        }
        if (!(stop_id in stop_registry)){
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
            let rect = $(`.train-pulse[vid="${this.getAttribute('vid')}"]`)[0].getBoundingClientRect();
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
        /*determine by how much a train is late*/
        let pred_date = new Date(prediction.attributes.arrival_time);
        $.ajax({
            url: `https://api-v3.mbta.com/schedules?filter[direction_id]=${direction_id}&filter[route]=${route_id}&filter[route_type]=2&filter[stop]=${stop_id}&filter[trip]=${trip_id}&page[limit]=100&page[offset]=0&sort=arrival_time`,
            type: "get",
            success: function(response) {
                let s_p = null;
                let d1 = null;
                let dt = null;
                for (let i of response.data){
                    let _d1 = new Date(i.attributes.arrival_time);
                    if (dt === null || Math.abs(pred_date - _d1) <= dt){
                        s_p = i;
                        dt = Math.abs(pred_date - _d1);
                        d1 = _d1;
                    }
                }
                record_new_schedule_prediction(vehicle_id, direction_id, route_id, trip_id, stop_id, s_p, prediction, pred_date, d1)
                
                
            },
            error: function(xhr) {
              //Do Something to handle error
            }
        });
    }
    function make_predictions(vehicle_id, direction_id, route_id, trip_id, stop_id){
        /*call MBTA prediction API with a train ID*/
        $.ajax({
            url: `https://api-v3.mbta.com/predictions?filter[direction_id]=${direction_id}&filter[route]=${route_id}&filter[route_type]=2&filter[stop]=${stop_id}&filter[trip]=${trip_id}&page[limit]=100&page[offset]=0&sort=arrival_time`,
            type: "get",
            success: function(response) {
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
        /*track a train's journey along its route*/
        p = ROUTE_P;
        let height = 500;
        width = ROUTE_WIDTH;
        let [scale, boston_coords] = anchorings[ROUTE_ID]
        let projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
        let pathGenerator = d3.geoPath().projection(projection);
        vehicle_registry[payload.id] = null
        let vehicle_id = payload.id;
        let direction_id = payload.attributes.direction_id;
        let route_id = payload.relationships.route.data.id;
        let trip_id = payload.relationships.trip.data.id;
        let stop_id = payload.relationships.stop.data.id
        let lat = payload.attributes.latitude;
        let long = payload.attributes.longitude;
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
            let elem = document.querySelector(`path[vid="${payload.id}"]`)
            let b = elem.getBoundingClientRect()
            $(`.train-icon[vid="${payload.id}"]`).remove();
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
            let first_coords = null;
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
        let coords = []
        let seen_coords = []
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
        /*perform a train location update when new stream response is received*/
        if (handler != 'remove'){
            let data = JSON.parse(response.data)
            if (Array.isArray(data)){
                for (let i of data){
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
        /*render the line for a train currently being tracked (per user selection)*/
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
        let width = parseInt($('.live-view-container').css('width').match('^\\d+'));
        let height = 500;
        let [scale, boston_coords] = anchorings[route_id]
        let projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([scale])
        let pathGenerator = d3.geoPath().projection(projection);
        let svg = d3.select("#live-view-map").append("svg").attr("width", width).attr("height", 500);
        let p = svg.selectAll("path")
        ROUTE_P = p;
        d3.json('json_data/lines_and_stops_geo.json', function(data){
            for (let i of data.features){
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
            for (let i of Object.keys(line_registry)){
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
                let rect = this.getBoundingClientRect();
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
            /*live stream a train's journey*/
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
                handle_vehicle_endpoint(e, 'remove')
            });
        });
    }
    function get_relability_color(r){
        /*required to return color code for precise fill later*/
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
        /*main function for rendering a line with its associated stops*/
        const boston_coords = [
            -71.0589,
            42.260
        ]
        let width = parseInt($('.all-lines-container').css('width').match('^\\d+'));
        let height = 500;
        let projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([18000])
        let pathGenerator = d3.geoPath().projection(projection);
        let svg = d3.select("#full-route-map").append("svg").attr("width", width).attr("height", 500);
        let p = svg.selectAll("path")
        d3.json('json_data/lines_and_stops_geo.json', function(data){
            d3.csv('agg_datasets/estimated_boardings.csv', function(est_boardings){
                let estimated_boardings = Object.fromEntries(est_boardings.map(function(x){return [x.line, parseInt(x.estimated_boardings)]}))
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
                    for (let i of csv_data){
                        $('#full-route-table').append(`
                        <div class='cell full-route-cell' route='${i.name}'>${i.name}</div>
                        <div class='cell full-route-cell' route='${i.name}'>${Math.round(parseFloat(i.reliability)*100,0)}%</div>
                        <div class='cell full-route-cell' route='${i.name}'>${estimated_boardings[i.name]}</div>
                        `);
                        $('.choose-line-reliability').append(`<option value="${i.name}">${i.name}</option>`)
                    }
                    display_individual_line_reliability_plot()
                    let train_reliability = Object.fromEntries(csv_data.map(function(x){return [x.name, parseFloat(x.reliability)]}))
                    let p = svg.selectAll("path");
                    function get_train_reliability_details(name){
                        let reliability = null;
                        let color = null;
                        if (name in train_reliability){
                            reliability = train_reliability[name]
                        }
                        else{
                            for (let n of Object.keys(train_reliability)){
                                for (let sn of name.split('/')){
                                    for (let N of n.split(' ')){
                                        if (sn.includes(N)){
                                            reliability = train_reliability[n]
                                            break
                                        }
                                    }
                                }
                            }
                        }
                        let r = Math.round(reliability*100, 0)
                        color = get_relability_color(r)
                        return {
                            name:name,
                            reliability: r > 0 ? r.toString()+'% reliable' : 'No data available',
                            color:color
                        }
                    }
                    for (let i of data.features){
                        if (i.geometry.type === 'LineString'){
                            if (!(i.properties.route_id in line_geo)){
                                line_geo[i.properties.route_id] = []
                            }
                            line_geo[i.properties.route_id].push(i)
                            line_registry[i.properties.route_id] = i.properties.name
                        }
                        if (i.geometry.type === 'LineString'){
                            if (!(i.properties.name in train_reliability)){
   
                            }
                            let details = get_train_reliability_details(i.properties.name)
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
                    $('.line-full').on("mouseover", function(e){
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '13');
                        let details = JSON.parse(this.getAttribute('details'))
                        $('.stop-tooltip').html(`${details.name}: ${details.reliability}`);
                        $('.stop-tooltip').css('visibility', 'visible')
                        let rect = this.getBoundingClientRect();
                        $('.stop-tooltip').css('top', e.pageY);
                        $('.stop-tooltip').css('left', e.pageX);
                        $(`.cell[route="${details.name}"]`).addClass('cell-hover')
                    })
                    .on("mousemove", function(){

                    })
                    .on("mouseout", function(){
                        $(`.line-full[route="${this.getAttribute('route')}"]`).css('stroke-width', '8');
                        let details = JSON.parse(this.getAttribute('details'))
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
    function scatterplot_utilities(data, svg, margin, width, height, cid){
        /*builds axis and points for any base scatterplot svg*/
        let x = d3.scaleLinear()
                .domain([Math.min(...data.map(function(x){return x.year})), Math.max(...data.map(function(x){return x.year}))])
                .range([ 0, width + 250]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickFormat(d3.format('d')));
    
        // Add Y axis
        let y = d3.scaleLinear()
            .domain( [60, 100])
            .range([ height, 0 ]);
        svg.append("g")
        .call(d3.axisLeft(y));

        let line = svg
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
        let dot = svg
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
                let details = JSON.parse(this.getAttribute('details'))
                $('.stop-tooltip').html(`${details.year} reliability: ${details.reliability}%`);
                $('.stop-tooltip').css('visibility', 'visible')
                let rect = this.getBoundingClientRect();
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

        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .text("Year");

        /*
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", -40)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text("Reliability %");

        */
        $(cid).append(`<text class="y label plot-label">Reliability %</text>`)
    }
    function display_reliability_by_year(){
        d3.csv('agg_datasets/reliability_year.csv', function(data){
            let margin = {top: 10, right: 100, bottom: 30, left: 30},
            width = 400 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
            data = data.map(function(x){return {year:parseInt(x.year), reliability:Math.round(parseFloat(x.reliability)*100)}});
            let svg_width = width + margin.left + margin.right;
            $('.scatterplot-title').css('margin-left', (parseInt($('#total-reliability').css('width').match(/^\d+/g)[0])/2 - 30 - parseInt($('.scatterplot-title').css('width').match(/^\d+/g)[0])/2).toString()+'px')
            let svg = d3.select("#total-reliability")
            .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            scatterplot_utilities(data, svg, margin, width, height, '#total-reliability');
            
        });
    }
    function render_line_reliability_by_year(line){
        let margin = {top: 10, right: 100, bottom: 30, left: 30},
            width = 400 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        let data = ROUTE_RELIABILITY_YEAR[line];
        $('#line-total-reliability').html('');
        let svg = d3.select("#line-total-reliability")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        scatterplot_utilities(data, svg, margin, width, height, '#line-total-reliability');

    }
    function display_individual_line_reliability_plot(){
        /*render a scatterplot of a line's reliability across the years*/
        d3.csv('agg_datasets/reliability_year_line.csv', function(data){
            for (let i of data){
                if (!(i.name in ROUTE_RELIABILITY_YEAR)){
                    ROUTE_RELIABILITY_YEAR[i.name] = []
                }
                ROUTE_RELIABILITY_YEAR[i.name].push({year:parseInt(i.year), reliability:Math.round(parseFloat(i.reliability)*100)});
            }
            let margin = {top: 10, right: 100, bottom: 30, left: 30},
            width = 400 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
            data = data.map(function(x){return {year:parseInt(x.year), reliability:Math.round(parseFloat(x.reliability)*100)}})
            let svg_width = width + margin.left + margin.right;
            $('.individual-line-selection').css('margin-left', (parseInt($('#line-total-reliability').css('width').match(/^\d+/g)[0])/2 - 30 - parseInt($('.individual-line-selection').css('width').match(/^\d+/g)[0])/2).toString()+'px')
            render_line_reliability_by_year($('.choose-line-reliability').val())
        });
    }
    $('body').on('input', '.choose-line-reliability', function(){
        render_line_reliability_by_year($(this).val())
    });
    display_full_line_reliability();
    display_reliability_by_year();
});