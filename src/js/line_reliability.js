$(document).ready(function(){
    var width = window.innerWidth
    var height = window.innerHeight;
    var line_geo = {}
    var line_registry = {}
    var boston_coords = [
        -71.0589,
        42.3601
    ]
    var projection = d3.geoMercator().translate([width / 2, height / 5]).center(boston_coords).scale([20000])
    var pathGenerator = d3.geoPath().projection(projection);
    var svg = d3.select("#map").append("svg").attr("width", 1000).attr("height", 500);
    var p = svg.selectAll("path")
    d3.json('json_data/lines_and_stops_geo.json', function(data){
        d3.csv('agg_datasets/train_reliability.csv', function(csv_data){
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
                if (r >= 90){
                    color = '#21D648'
                }
                else if (r < 90 && r > 87){
                    color = 'orange'
                }
                else if (r <= 87 && r > 0){
                    color = 'red'
                }
                else{
                    color = '#cdcdcd'
                }
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
                    .attr("d", pathGenerator).attr('stroke-width', '10').attr('stroke', details.color).attr('skey', '1').attr('details', JSON.stringify(details)).attr('class', 'line')
                }
                else if (i.properties.route === 'Fitchburg Line'){
                    /*
                    p.data([{...i, skey: 4, s_len: 0}])
                    .enter()
                    .append("path")
                    .attr("d", pathGenerator).attr('stroke-width', '8').attr('stroke', 'gray').attr('skey', '4')
                    .attr('class', 'stop')
                    .attr('name', i.properties.name)
                    */
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
            d3.selectAll(".line")
            .on("mouseover", function(){
                var details = JSON.parse(this.getAttribute('details'))
                $('.stop-tooltip').html(`${details.name}: ${details.reliability}`);
                $('.stop-tooltip').css('visibility', 'visible')
                var rect = this.getBoundingClientRect();
                $('.stop-tooltip').css('top', rect.top);
                $('.stop-tooltip').css('left', rect.left);
            })
            .on("mousemove", function(){
        
            })
            .on("mouseout", function(){
                $('.stop-tooltip').css('visibility', 'hidden')
            });
        });
    });
});