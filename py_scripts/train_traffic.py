import requests, json, time
import datetime, re, sqlite3
import collections, csv

API_KEY = 'ec477916907d435d9cdc835309d1a9f0'
API_KEYv2 = 'wX9NwuHnZU2ToO7GmGR9uw'


def to_dt(s:str) -> datetime.datetime:
    return datetime.datetime(*map(int, re.findall('\d+', s)[:6]))

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

    conn = sqlite3.connect('/Users/jamespetullo/cr_project/reliability_db.db')
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
                #print('full db payload', [vehicle_id, route, stop, trip, direction_id, predicted_arrival, predicted_departure, scheduled_arrival, scheduled_departure, estimated_delay])
                conn.execute('insert into traffic values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))', [vehicle_id, route, stop, trip, direction_id, predicted_arrival, predicted_departure, scheduled_arrival, scheduled_departure, estimated_delay])
                conn.commit()
                #print('-'*30)
                #time.sleep(10)

            #print('+'*20)

    conn.close()
    print([sem.request_time, sem.request_num])


if __name__ == '__main__':
    '''
    sem = Sem()
    for _ in range(10):
        all_train_traffic(sem)
        time.sleep(60)

    '''
    
    
    with open('/Users/jamespetullo/cr_project/raw_datasets/MBTA_rail_stops.csv') as f:
        h, *data = csv.reader(f)


    conn = sqlite3.connect('/Users/jamespetullo/Downloads/reliability_db_4.db')
    conn.execute(f'create table if not exists rail_stops ({", ".join(i+" text" for i in h)})')
    conn.executemany(f'insert into rail_stops values ({", ".join("?" for _ in h)})', data)

    conn.commit()
    conn.close()
    


    with open('/Users/jamespetullo/cr_project/raw_datasets/MBTA_full_rail_ridership.csv') as f:
        h, *data = csv.reader(f)

    conn = sqlite3.connect('/Users/jamespetullo/Downloads/reliability_db_4.db')
    conn.execute(f'create table if not exists stop_ridership ({", ".join(i+" text" for i in h)})')
    conn.executemany(f'insert into stop_ridership values ({", ".join("?" for _ in h)})', data)

    conn.commit()
    conn.close()
  
    
    with open('/Users/jamespetullo/cr_project/raw_datasets/ridership.csv') as f:
        h, *data = csv.reader(f)

    conn = sqlite3.connect('/Users/jamespetullo/Downloads/reliability_db_4.db')
    conn.execute(f'create table if not exists ridership (service_date text,line text,estimated_boardings float,ObjectId int)')
    conn.executemany(f'insert into ridership values ({", ".join("?" for _ in h)})', data)

    conn.commit()
    conn.close()
    
