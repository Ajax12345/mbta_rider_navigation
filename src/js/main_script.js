
$(document).ready(function(){
    var line_geo = {}
    var width = window.innerWidth
    var height = window.innerHeight;
    var boston_coords = [
        -71.0589,
        42.3601
    ]
    var projection = d3.geoMercator().translate([width / 2, height / 2]).center(boston_coords).scale([50000])
    var pathGenerator = d3.geoPath().projection(projection);
    var svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);
    var p = svg.selectAll("path")
    function draw_train_progress(payload){
        console.log('payload in draw_train_progress')
        console.log(payload)
        var direction_id = payload.attributes.direction_id;
        var route_id = payload.relationships.route.data.id;
        var lat = payload.attributes.latitude;
        var long = payload.attributes.longitude;
        $(`path[vid="${payload.id}"]`).remove();
        p.data([{
                "type": "Feature",
                "properties": {
                    "name": "train"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [long, lat]
                }
            }])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '10').attr('stroke', 'red').attr('vid', payload.id);
        //42.37422180175781
        //-71.23595428466797
        //Boston: -71.0589
        console.log('checking line_geo here')
        console.log(line_geo[route_id])
        var coords = []
        for (var i of line_geo[route_id]){
            for (var [_long, _lat] of i.geometry.coordinates){
                if (direction_id === 1){
                    if (Math.abs(_long) >= Math.abs(long)){
                        coords.push([_long, _lat])
                    }
                }
                else{
                    if (Math.abs(_long) <= Math.abs(long)){
                        coords.push([_long, _lat])
                    }
                }
            }
        }
        $(`path[vpid="${payload.id}"]`).remove();
        p.data([{
                "type": "Feature",
                "properties": {
                    "name": "na",
                    "route_id": "na"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                }
        }])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', 'orange').attr('vpid', payload.id)
        
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

    }
    d3.json('json_data/lines_and_stops_geo.json', function(data){
        var p = svg.selectAll("path")
        for (var i of data.features){
            if (i.geometry.type === 'LineString'){
                if (!(i.properties.route_id in line_geo)){
                    line_geo[i.properties.route_id] = []
                }
                line_geo[i.properties.route_id].push(i)
            }
            if (i.geometry.type === 'LineString' && i.properties.name === "Fitchburg Line"){
                p.data([i])
                .enter()
                .append("path")
                .attr("d", pathGenerator).attr('stroke-width', '15').attr('stroke', '#cdcdcd')
            }
            else if (i.properties.route === 'Fitchburg Line'){
                p.data([i])
                .enter()
                .append("path")
                .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', 'gray')
                .attr('class', 'stop')
                .attr('name', i.properties.name)
            }
        }
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
            console.log('got reset')
            handle_vehicle_endpoint(e, 'reset')
        })
        evtSource.addEventListener('update', function(e){
            console.log('got update')
            handle_vehicle_endpoint(e, 'update')
        })
        evtSource.addEventListener('add', function(e){
            console.log('got add')
            handle_vehicle_endpoint(e, 'add')
        });
        evtSource.addEventListener('remove', function(e){
            console.log('got remove')
            console.log(e)
            handle_vehicle_endpoint(e, 'remove')
        });
    });
    
})