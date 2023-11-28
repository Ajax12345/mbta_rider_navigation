$(document).ready(function(){
    var route_mappings = {}
    var line_geo = {}
    var line_registry = {}
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
            $('.route-map-outer').html(`<div id="map"></div>`)
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
                    $('.stop-tooltip').css('visibility', 'visible')
                    if (first_coords === null){
                        first_coords = [e.pageY - 20, e.pageX]
                    }
                    $('.stop-tooltip').css('top', first_coords[0]);
                    $('.stop-tooltip').css('left', first_coords[1]);
                }).on('mouseout', function(){
                    first_coords = null;
                    $('.stop-tooltip').css('visibility', 'hidden')
                });
            })
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