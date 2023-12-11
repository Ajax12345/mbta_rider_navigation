var selectElement = document.getElementById('mySelect');
selectElement.addEventListener('change', function () {
    var selectedValue = selectElement.value;
    drawBarChart(selectedValue);
});

function drawBarChart(year) {
    var chartElement = d3.select("#chart");
    chartElement.selectAll("*").remove();
    function handleData(data) {
        for (let i = 0; i < data.length; i++) {
            data[i].name = data[i].name.split(' ')[0];
            data[i].reliability = parseFloat(parseFloat(data[i].reliability).toFixed(3));
        }
    }
    // set the dimensions and margins of the graph
    var margin = { top: 20, right: 20, bottom: 30, left: 40 },
        width = window.innerWidth - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // set the ranges
    var x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);
    var y = d3.scaleLinear()
        .range([height, 0]);

    var svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // get the data
    d3.json("json_data/reliability_year_line.json", function (data) {
        data = data[year];
        handleData(data);

        // Scale the range of the data in the domains
        x.domain(data.map(function (d) { return d.name; }));
        y.domain([0, d3.max(data, function (d) { return d.reliability; })]);

        // append the rectangles for the bar chart
        let bars = svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function (d) { return x(d.name); })
            .attr("width", x.bandwidth())
            .attr("y", function (d) { return y(d.reliability); })
            .attr("height", function (d) { return height - y(d.reliability); })
            .attr('fill', '#33d962')
        // Create tooltip
        var tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");

        // Add hover effect
        bars.on("mouseover", function (d) {
            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip.html("Category: " + d.name + "<br>Value: " + d.reliability)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
            .on("mouseout", function (d) {
                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // add the x Axis
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        // add the y Axis
        svg.append("g")
            .call(d3.axisLeft(y));

    });
}

drawBarChart("2023");