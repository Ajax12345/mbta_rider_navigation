var svg = d3.select("body").append("svg").append("g");

svg.append("g").attr("class", "slices");
svg.append("g").attr("class", "labels");
svg.append("g").attr("class", "lines");

var width = 960,
  height = 450,
  radius = Math.min(width, height) / 2;

var pie = d3.layout
  .pie()
  .sort(null)
  .value(function (d) {
    return d.freq;
  });

var arc = d3.svg
  .arc()
  .outerRadius(radius * 0.8)
  .innerRadius(radius * 0.4);

var outerArc = d3.svg
  .arc()
  .innerRadius(radius * 0.9)
  .outerRadius(radius * 0.9);

svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var key = function (d) {
  return d.data.cause_name;
};

// Use a fixed set of data instead of randomData()
var fixedData = [
  {
    cause_name: "Amtrak train traffic",
    freq: "9",
    severity: "3.6666666666666665",
  },
  { cause_name: "crossing issue", freq: "5", severity: "4" },
  { cause_name: "fire department activity", freq: "1", severity: "7" },
  { cause_name: "freight train interference", freq: "2", severity: "3.5" },
  { cause_name: "heavy ridership", freq: "1", severity: "3" },
  { cause_name: "maintenance", freq: "1", severity: "5" },
  {
    cause_name: "mechanical issue",
    freq: "31",
    severity: "6.161290322580645",
  },
  { cause_name: "medical emergency", freq: "2", severity: "5" },
  {
    cause_name: "police activity",
    freq: "21",
    severity: "7.095238095238095",
  },
  { cause_name: "signal issue", freq: "17", severity: "5.294117647058823" },
  { cause_name: "switch issue", freq: "9", severity: "5.888888888888889" },
  { cause_name: "tie replacement", freq: "2", severity: "4.5" },
  { cause_name: "track work", freq: "11", severity: "4.363636363636363" },
  {
    cause_name: "train traffic",
    freq: "22",
    severity: "4.681818181818182",
  },
];

const causeNames = fixedData.map((entry) => entry.cause_name);
var color = d3.scale
  .ordinal()
  .domain(causeNames)
  .range([
    "#ff5a5f",
    "#ffa07a",
    "#ffd700",
    "#ff8c00",
    "#e59866",
    "#f08080",
    "#cd5c5c",
    "#ff6347",
    "#db7093",
    "#da70d6",
    "#9370db",
    "#5f9ea0",
    "#66cdaa",
    "#20b2aa",
  ]);

piechart(fixedData);

function piechart(data) {
  /* ------- PIE SLICES -------*/
  var slice = svg
    .select(".slices")
    .selectAll("path.slice")
    .data(pie(data), key);

  slice
    .enter()
    .insert("path")
    .style("fill", function (d) {
      return color(d.data.cause_name);
    })
    .attr("class", "slice");

  slice
    .transition()
    .duration(1000)
    .attrTween("d", function (d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function (t) {
        return arc(interpolate(t));
      };
    });

  slice.exit().remove();

  /* ------- TEXT LABELS -------*/

  var text = svg.select(".labels").selectAll("text").data(pie(data), key);

  text
    .enter()
    .append("text")
    .attr("dy", ".35em")
    .text(function (d) {
      return d.data.cause_name;
    });

  function midAngle(d) {
    return d.startAngle + (d.endAngle - d.startAngle) / 2;
  }

  text
    .transition()
    .duration(1000)
    .attrTween("transform", function (d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function (t) {
        var d2 = interpolate(t);
        var pos = outerArc.centroid(d2);
        pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
        return "translate(" + pos + ")";
      };
    })
    .styleTween("text-anchor", function (d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function (t) {
        var d2 = interpolate(t);
        return midAngle(d2) < Math.PI ? "start" : "end";
      };
    });

  text.exit().remove();

  /* ------- SLICE TO TEXT POLYLINES -------*/

  var polyline = svg
    .select(".lines")
    .selectAll("polyline")
    .data(pie(data), key);

  polyline.enter().append("polyline");

  polyline
    .transition()
    .duration(1000)
    .attrTween("points", function (d) {
      this._current = this._current || d;
      var interpolate = d3.interpolate(this._current, d);
      this._current = interpolate(0);
      return function (t) {
        var d2 = interpolate(t);
        var pos = outerArc.centroid(d2);
        pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
        return [arc.centroid(d2), outerArc.centroid(d2), pos];
      };
    });

  polyline.exit().remove();
}
