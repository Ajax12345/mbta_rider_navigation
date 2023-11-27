import requests, json, time
import datetime, re, polyline
import collections, csv

API_KEY = 'ec477916907d435d9cdc835309d1a9f0'
API_KEYv2 = 'wX9NwuHnZU2ToO7GmGR9uw'

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


class Sem:
    def __init__(self) -> None:
        self.s_time = time.time()
        self.request_time = 0
        self.request_num = 0
        self.start_r_time = 0

    def __enter__(self) -> None:
        self.start_r_time = time.time()
        self.request_num += 1

    def __exit__(self, *_) -> None:
        self.request_time += (time.time() - self.start_r_time)
        if self.request_num >= 999:
            time.sleep(0 if self.request_time >= 60 else 60 - self.request_time)
            self.request_num = 0
            self.request_time = 0

        if self.request_time >= 60:
            self.request_time = 0
            self.request_num = 0


        self.start_r_time = 0

def format_dt(dt:str) -> str:
    if dt is None:
        return

    #2023-11-27T10:27:31-05:00
    return re.sub('\-\d+\:\d+$', '', dt.replace('T', ' '))


def get_delay(predicted_arrival:str, scheduled_arrival:str) -> str:
    if not predicted_arrival or not scheduled_arrival:
        return

    return (datetime.datetime(*map(int, re.findall('\d+', predicted_arrival))) - datetime.datetime(*map(int, re.findall('\d+', scheduled_arrival)))).seconds


def all_train_traffic(sem) -> None:
    with open('/Users/jamespetullo/cr_project/json_data/routes.json') as f:
        routes = json.load(f)

    for _route in routes:
        route = _route['id']
        for d_id in [0, 1]:
            with sem:
                trains = requests.get(f'https://api-v3.mbta.com/vehicles?api_key={API_KEY}&filter[direction_id]={d_id}&filter[route]={route}&filter[route_type]=2&page[limit]=100&page[offset]=0&sort=current_stop_sequence').json()
            if 'data' not in trains:
                continue
            
            trains = trains['data']

            for d in trains:
                direction_id = d['attributes']['direction_id']
                updated_at = d['attributes']['updated_at']
                route, stop, trip = [d['relationships'][i]['data']['id'] for i in ['route', 'stop', 'trip']]
                vehicle_id = d['id'] + 'D' + str(datetime.datetime.now().date())
                #print(direction_id, route, stop, trip)
                #print(json.dumps(d, indent=4))
                with sem:
                    if 'data' not in (prediction:=requests.get(f'https://api-v3.mbta.com/predictions?api_key={API_KEY}&filter[direction_id]={direction_id}&filter[route]={route}&filter[route_type]=2&filter[stop]={stop}&filter[trip]={trip}&page[limit]=100&page[offset]=0&sort=arrival_time').json()):
                        continue

                if not prediction['data']:
                    continue

                [prediction, *_] = prediction['data']
                #print('prediction')
                #print(json.dumps(prediction, indent=4))
                predicted_arrival = format_dt(prediction['attributes']['arrival_time'])
                predicted_departure = format_dt(prediction['attributes']['departure_time'])

                with sem:
                    schedule = requests.get(f'https://api-v3.mbta.com/schedules?api_key={API_KEY}&filter[direction_id]={direction_id}&filter[route]={route}&filter[route_type]=2&filter[stop]={stop}&filter[trip]={trip}&page[limit]=100&page[offset]=0&sort=arrival_time').json()
                    #print(schedule)
                    if 'data' not in schedule:
                        continue
                    
                schedule = schedule['data']
                
                scheduled = [i for i in schedule if i['attributes']['arrival_time'] is not None and prediction['attributes']['arrival_time'] is not None and to_dt(i['attributes']['arrival_time']) <= to_dt(prediction['attributes']['arrival_time'])]
                if not scheduled:
                    continue

                scheduled = scheduled[-1]

                scheduled_arrival = format_dt(scheduled['attributes']['arrival_time'])
                scheduled_departure = format_dt(scheduled['attributes']['departure_time'])

                estimated_delay = get_delay(predicted_arrival, scheduled_arrival)
                

                #print('scheduled')
                #print(json.dumps(scheduled, indent=4))
                print('full db payload', [vehicle_id, route, stop, trip, direction_id, predicted_arrival, predicted_departure, scheduled_arrival, scheduled_departure, estimated_delay])
                #print('-'*30)
                #time.sleep(10)

            #print('+'*20)

    print([sem.request_time, sem.request_num])

def shapes() -> None:
    with open('json_data/routes.json') as f:
        all_routes = json.load(f)
    
    root = {'type':'FeatureCollection', 'features':[]}

    for route in all_routes:
        s = requests.get(f'https://api-v3.mbta.com/shapes?sort=polyline&filter[route]={route["id"]}').json()['data']
        root['features'].extend([{
            "type": "Feature",
            "properties": {
                "name": route['attributes']['long_name'],
                "route_id": route['id']
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [*map(lambda x:[x[0]*100000, x[1]*100000], polyline.decode(i['attributes']['polyline'], 10, geojson = True))]
            }
        } for i in s])

    with open('json_data/f_line_shapes.json', 'w') as f:
        json.dump(root, f, indent=4)

def dt_offset(days:int = 1) -> str:
    d = datetime.datetime.now()
    return re.sub('\.0+$', '',str((datetime.datetime(d.year, d.month, d.day) - datetime.timedelta(days = days)).timestamp()))

def travel_times() -> None:
    
    with open('raw_datasets/MBTA_rail_stops.csv') as f:
        header, *data = csv.reader(f)
        vals = [dict(zip(header, i)) for i in data]
        d = collections.defaultdict(list)
        for i in vals:
            d[re.sub('\-\w+$', '', i['stop_id'])].append(i['OBJECTID'])
    
    with open('json_data/all_stops.json') as f:
        all_stops = json.load(f)
    
    line_stops = collections.defaultdict(list)
    for i in all_stops:
        line_stops[(i['route'], i['route_id'])].append((i['id'], d.get(i['id'].replace('place-', '')), i['attributes']['name']))

    key = [*filter(None, requests.get('https://cdn.mbta.com/sites/default/files/2017-11/api-public-key.txt').text.split('\n'))][-1]
    for x in ['place-FR-0115']:
        for y in ['place-FR-0132']:
            #results = requests.get(f'https://performanceapi.mbta.com/developer/api/v2.1/dwells?api_key={key}&format=json&stop={x}&from_datetime={dt_offset(20)}&to_datetime={dt_offset(14)}').json()
            results = requests.get(f'https://performanceapi.mbta.com/developer/api/v2.1/traveltimes?api_key={key}&format=json&from_stop={y}&to_stop={x}&from_datetime={dt_offset(10)}&to_datetime={dt_offset(5)}').json()
            print(results)
    
    print(line_stops[('Fitchburg Line', 'CR-Fitchburg')])
    
    #print(json.dumps(results, indent=4))




if __name__ == '__main__':
    sem = Sem()
    all_train_traffic(sem)