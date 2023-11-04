
d3.json('json_data/lines_and_stops_geo.json', function(data){
    var width = window.innerWidth
    var height = window.innerHeight;
    var projection = d3.geoMercator().translate([width / 2, height / 2]).center([
        -71.0589,
        42.3601
    ]).scale([30000])
    var pathGenerator = d3.geoPath().projection(projection);
    var svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);
    var p = svg.selectAll("path")
    for (var i of data.features){
        if (i.geometry.type === 'LineString'){
            p.data([i])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '2').attr('stroke', 'purple')
        }
        else{
            p.data([i])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '3').attr('stroke', 'green')
        }
    }
        
    
})