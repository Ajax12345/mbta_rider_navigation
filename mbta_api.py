import requests, json, time
import datetime, re, polyline

API_KEY = 'ec477916907d435d9cdc835309d1a9f0'

def lines() -> None:
    url = 'https://api-v3.mbta.com/lines?page[limit]=100&page[offset]=0&sort=color'
    c = 1
    while True:
        d = requests.get(url).json()
        print(c)
        with open('json_data/lines.json') as f:
            running_data = json.load(f)

        with open('json_data/lines.json', 'w') as f1:
            json.dump(running_data + d['data'], f1, indent=4)
    
        if d['links']['last'] == d['links']['next']:
            break

        c += 1
        url = d['links']['next']

def check_lines() -> None:
    with open('json_data/lines.json') as f:
        d = json.load(f)

    for i in d:
        print(i['attributes']['long_name'], i['id'])
        print('-'*20)


def routes() -> None:
    with open('json_data/routes.json', 'a') as f:
        json.dump(requests.get('https://api-v3.mbta.com/routes?filter[direction_id]=1&filter[type]=2&page[limit]=100&page[offset]=0&sort=long_name').json()['data'], f, indent = 4)


def stops() -> None:
    with open('json_data/routes.json') as f:
        all_routes = json.load(f)


    with open('json_data/all_stops.json', 'w') as f:
        json.dump([{**j, 'route':k['attributes']['long_name'], 'route_id':k['id']} for k in all_routes for j in requests.get(f'https://api-v3.mbta.com/stops?filter[direction_id]=0&filter[route]={k["id"]}&page[limit]=100&page[offset]=0&sort=name').json()['data']], f, indent = 4)

def stops_and_lines() -> None:
    with open('json_data/all_stops.json') as f:
        all_stops = json.load(f)

    with open('json_data/f_line_shapes.json') as f1:
        line_geo = json.load(f1)
    

    line_geo['features'].extend([{
            "type": "Feature",
            "properties": {
                "name": i['attributes']['name'],
                "route":i['route'],
                "route_id":i['route_id']
            },
            "geometry": {
                "type": "Point",
                "coordinates": 
                    [
                        float(i['attributes']['longitude']),
                        float(i['attributes']['latitude'])
                    ]
            }
    } for i in all_stops])

    with open('json_data/lines_and_stops_geo.json', 'w') as f2:
        json.dump(line_geo, f2, indent=4)

def to_dt(s:str) -> datetime.datetime:
    return datetime.datetime(*map(int, re.findall('\d+', s)[:6]))

def vehicles() -> None:
    for d_id in [0, 1]:
        trains = requests.get(f'https://api-v3.mbta.com/vehicles?filter[direction_id]={d_id}&filter[route]=CR-Fitchburg&filter[route_type]=2&page[limit]=100&page[offset]=0&sort=current_stop_sequence').json()['data']
        for d in trains:
            direction_id = d['attributes']['direction_id']
            updated_at = d['attributes']['updated_at']
            route, stop, trip = [d['relationships'][i]['data']['id'] for i in ['route', 'stop', 'trip']]
            print(direction_id, route, stop, trip)
            print(json.dumps(d, indent=4))
            [prediction] = requests.get(f'https://api-v3.mbta.com/predictions?filter[direction_id]={direction_id}&filter[route]={route}&filter[route_type]=2&filter[stop]={stop}&filter[trip]={trip}&page[limit]=100&page[offset]=0&sort=arrival_time').json()['data']
            print('prediction')
            print(json.dumps(prediction, indent=4))
            schedule = requests.get(f'https://api-v3.mbta.com/schedules?filter[direction_id]={direction_id}&filter[route]={route}&filter[route_type]=2&filter[stop]={stop}&filter[trip]={trip}&page[limit]=100&page[offset]=0&sort=arrival_time').json()['data']
            scheduled = [i for i in schedule if to_dt(i['attributes']['arrival_time']) <= to_dt(prediction['attributes']['arrival_time'])][-1]
            print('scheduled')
            print(json.dumps(scheduled, indent=4))
            print('-'*30)

        print('+'*20)

def shapes() -> None:
    with open('json_data/routes.json') as f:
        all_routes = json.load(f)
    
    root = {'type':'FeatureCollection', 'features':[]}

    for route in all_routes:
        s = requests.get(f'https://api-v3.mbta.com/shapes?sort=polyline&filter[route]={route["id"]}').json()['data']
        root['features'].extend([{
            "type": "Feature",
            "properties": {
                "name": route['attributes']['long_name']
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [*map(lambda x:[x[0]*100000, x[1]*100000], polyline.decode(i['attributes']['polyline'], 10, geojson = True))]
            }
        } for i in s])

    with open('json_data/f_line_shapes.json', 'w') as f:
        json.dump(root, f, indent=4)

if __name__ == '__main__':
    vehicles()