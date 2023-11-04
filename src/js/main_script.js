
d3.json('json_data/lines_and_stops_geo.json', function(data){
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
    for (var i of data.features){
        if (i.geometry.type === 'LineString' && i.properties.name === "Fitchburg Line"){
            p.data([i])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '10').attr('stroke', '#cdcdcd')
        }
        else if (i.properties.route === 'Fitchburg Line'){
            p.data([i])
            .enter()
            .append("path")
            .attr("d", pathGenerator).attr('stroke-width', '3').attr('stroke', 'gray')
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
    
});