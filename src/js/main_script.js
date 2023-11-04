
d3.json('json_data/f_line_shapes.json', function(data){
    var width = window.innerWidth
    var height = window.innerHeight;
    var projection = d3.geoTransverseMercator().translate([width / 2, height / 2]).center([
        -710.8029,
        423.7448
    ]).scale([100])
    var pathGenerator = d3.geoPath().projection(projection);
    var svg = d3.select("#map").append("svg").attr("width", width).attr("height", height);
    svg.selectAll("path")
        .data([data])
        .enter()
        .append("path")
        .attr("d", pathGenerator)
        .style('fill', function(d, i){
            
        })
})