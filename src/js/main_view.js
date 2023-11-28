$(document).ready(function(){
    var route_mappings = {}
    var line_geo = {}
    var line_registry = {}
    var route_stop_delays = {}
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
            return ['#4AE525', 'caret-arrow-up.png'];
        }
        else if (delay >= 5 && delay < 15){
            return ['#EEC419', 'medium-delay-arrow.png'];
        }
        else{
            return ['#EE5119', 'severe-delay-arrow.png']
        }
    }   
    function render_route_delay_colors(route_id){
        for (var i of route_stop_delays[route_id]){
            var [color, img] = stop_delay_color(i.mdt);
            $(`.route-view-stop[name="${i.stop_name}"]`).css('stroke', color);
            $(`.cell-stop-name[name="${i.stop_name}"]`).append(`<img src='src/img/${img}' style='width:12px;height:12px;margin-left:5px;margin-top:3px;'>`)
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
            <div class='cell cell-header'>Average boarding size</div>
        </div>`);
        for (var i of all_stops){
            $('#stop-delay-table').append(`<div class='cell cell-stop-name' name='${i.stop_name}'>${i.stop_name}</div><div class='cell' name='${i.stop_name}'>${i.mdt} minute${i.mdt === 1 ? "" : "s"}</div><div class='cell' name='${i.stop_name}'>${i.average_boarding} ${i.average_boarding != 'N/A' ? 'passengers' : ''}</div>`)
        }
        $('.cell').on('mouseenter', function(e){
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
        d3.csv('agg_datasets/train_reliability.csv', function(csv_data){
            $('.route-map-outer').html(`
            <div class="legend">
                <div class="legend-text">Legend</div>
                <div style="height:10px"></div>
                <div class='legend-items-horizontal'>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#4AE525'></div>
                        <div class="legend-block-text">less than 5 min</div>
                    </div>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#EEC419'></div>
                        <div class="legend-block-text">between 5 and 15 min </div>
                    </div>
                    <div class='legend-delay-stops'>
                        <div class='legend-circle' style='background-color:#EE5119'></div>
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
            $('.route-reliability-header').html(`${route_mappings[route_id]} reliability: ${Math.round(train_reliability[route_mappings[route_id]]*100)}%`)

            var width = parseInt($('.route-map-outer').css('width').match('^\\d+'));
            var height = 500;
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
});