import requests, json, time

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
            json.dump(running_data + d['data'], f1)
    
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

if __name__ == '__main__':
    check_lines()