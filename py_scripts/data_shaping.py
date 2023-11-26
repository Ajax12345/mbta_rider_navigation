import json, requests, sqlite3
import csv, collections, re, datetime

def get_reliability() -> None:
    data = requests.get("https://services1.arcgis.com/ceiitspzDAHrdGO1/arcgis/rest/services/MBTA_Rail_and_Bus_Reliability/FeatureServer/0/query?where=gtfs_route_desc%20%3D%20'COMMUTER%20RAIL'&outFields=*&outSR=4326&supportsPagination&resultOffset=2&f=json").json()
    
    with open('cr_reliablility.json', 'w') as f:
        json.dump(data, f)
    
    
def format_header(d:dict, ignore_denom = False, as_string = True) -> dict:
    for i in ['service_date', 'notif_start', 'notif_end', 'created_dt', 'last_modified_dt', 'closed_dt']:
        if i in d:
            if d[i].lower() == 'na':
                continue
            
            d[i] = datetime.datetime(*map(int, re.findall('\d+', d[i])[:6]))
            if as_string:
                d[i] = str(d[i])

    if ignore_denom:
        if (denom:=int(d['otp_denominator'])):
            d['reliability'] = int(d['opt_numerator'])/denom
        
        else:
            d['reliability'] = None

    return d

def format_service_alert_header(d:dict) -> dict:
    '''
    3 => up to 10 minutes
    4 => up to 15 minutes
    5 => up to 20 minutes
    6 => up to 25 minutes
    7 => up to 30 minutes
    8 => more than 30 minutes
    9 => more than 1 hour
    '''
    d['service_effect_text'] = re.sub('(?<=Line).+$', '', d['service_effect_text'])
    return d

def shape_reliability() -> None:
    with open('reliability.csv') as f:
        header, *_data = csv.reader(f)
        '''
        conn = sqlite3.connect('reliability_db.db')
        conn.execute('create table if not exists all_data (service_date text,gtfs_route_id text,gtfs_route_short_name text,gtfs_route_long_name text,gtfs_route_desc text,route_category text,mode_type text,peak_offpeak_ind text,metric_type text,otp_numerator int,otp_denominator int,cancelled_numerator int,ObjectId int)')
        conn.executemany('insert into all_data values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', _data)
        conn.commit()
        conn.close()
        '''
        data = [format_header(dict(zip([j.replace('\ufeff', '') for j in header], i))) for i in _data]
    
def shape_ridership() -> None:
    with open('ridership.csv') as f:
        header, *_data = csv.reader(f)
        data = [format_header(dict(zip([j.replace('\ufeff', '') for j in header], i))) for i in _data]
    
        conn = sqlite3.connect('reliability_db.db')
        conn.execute('create table if not exists ridership (service_date text, line text, estimated_boardings int,ObjectId int)')
        conn.executemany('insert into ridership values (?, ?, ?, ?)', [[str(i['service_date']), i['line'] + ' Line', i['estimated_boardings'], i['ObjectId']] for i in data])
        conn.commit()
        conn.close()

def shape_service_alerts() -> None:
    with open('service_alerts.csv') as f:
        header, *_data = csv.reader(f)
        data = [format_service_alert_header(format_header(dict(zip([j.replace('\ufeff', '') for j in header], i)))) for i in _data]
        conn = sqlite3.connect('reliability_db.db')
        conn.execute(f'create table if not exists service_alerts ({", ".join(a + " "+ ("int" if a in ["alert_id", "severity_code"] else "text") for a in header)})')
        conn.executemany(f'insert into service_alerts values ({", ".join("?" for _ in header)})', [[i[a.replace('\ufeff', '')] for a in header] for i in data])
        conn.commit()
        conn.close()

        #print(json.dumps(data[0], indent=4))

    
def create_all_lines() -> None:
    conn = sqlite3.connect('reliability_db.db')
    conn.execute('create table if not exists lines (id int, name text)')
    conn.execute('create table if not exists stops (id int, line_id int, name text)')
    with open('mbta_lines_and_stops.json') as f:
        data = json.load(f)
    
    conn.executemany('insert into lines values (?, ?)', [*enumerate(data, 1)])
    s_id = 1
    for i, a in enumerate(data, 1):
        for stop in data[a]:
            conn.execute('insert into stops values (?, ?, ?)', [s_id, i, stop['name']])
            s_id += 1

    conn.commit()
    conn.close()


if __name__ == '__main__':
    shape_service_alerts()