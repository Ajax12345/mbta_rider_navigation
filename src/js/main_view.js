$(document).ready(function(){
    var route_mappings = {}
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
            var train_reliability = Object.fromEntries(csv_data.map(function(x){return [x.name, parseFloat(x.reliability)]}))
            console.log(train_reliability)
            console.log(route_mappings)
            $('.route-reliability-header').html(`${route_mappings[route_id]} reliability: ${Math.round(train_reliability[route_mappings[route_id]]*100)}%`)
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