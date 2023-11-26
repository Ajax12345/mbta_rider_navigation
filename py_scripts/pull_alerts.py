import requests, datetime, bs4
from bs4 import BeautifulSoup as soup
import json, sqlite3

def get_text(elem):
    return None if elem is None else elem.get_text(strip=True)

def get_content_text(elem) -> str:
    if not isinstance(elem, bs4.element.NavigableString):
        if elem.name.lower() == 'div':
            return

        if elem.name.lower() == 'br':
            if not (c:=[*filter(None, elem.contents)]):
                return

            return [elem.name, c[0].get_text(strip=True)]

        return [elem.name, elem.get_text(strip=True)]

    return [elem.name, elem.get_text(strip=True)]

def flatten_content(elem, tag = None, level = 0):    
    if isinstance(elem, bs4.element.NavigableString):
        yield [tag, elem.get_text(strip=True)]
        return

    for i in getattr(elem, 'contents', []):
        yield from flatten_content(i, tag = elem.name if level else None, level = 1)

def group_chunks(listing) -> dict:

    seen_strong, elems = None, []
    strong_dict = {}
    junk_text = []
    for name, text in listing:
        if name == 'strong':
            if seen_strong is not None:
                strong_dict[seen_strong] = elems
            
            seen_strong = text
            elems = []
        
        elif name != 'div' and text:
            elems.append(text)

        else:
            junk_text.append(text)

    if seen_strong:
        strong_dict[seen_strong] = elems
    
    return {'headers':strong_dict, 'junk':junk_text}

def get_details(elem):
    if not (t:=elem.select_one('div.c-alert-item__bottom > div.c-alert-item__description')):
        return []

    return group_chunks([k for k in flatten_content(t) if k])


def pull_alerts() -> dict:
    page = soup(requests.get('https://www.mbta.com/alerts/commuter-rail').text, 'html.parser')
    return [{
        'line':i.previous_sibling.previous_sibling.select_one('h2').get_text(strip=True),
        'alerts':[
            {
                'header':j.select_one('div.c-alert-item__top-text-container > .c-alert-item__effect').get_text(strip=True),
                'header_badge':get_text(j.select_one('div.c-alert-item__top-text-container  .c-alert-item__badge')),
                'body':j.select_one('div.c-alert-item__effect + div').get_text(strip=True),
                'details': get_details(j),
                'updated':get_text(j.select_one('div.c-alert-item__bottom div.c-alert-item__updated'))
            }
            for j in i.select('ul.c-alert-group > li')
        ]
    } for i in page.select('div.m-alerts-header + div')]


if __name__ == '__main__':  
    '''
    conn = sqlite3.connect('mbta_alerts.db')
    conn.execute('create table if not exists rail_alerts (dt datetime, data text)')
    conn.execute('insert into rail_alerts values (datetime(), ?)', [json.dumps(pull_alerts())])
    conn.commit()
    conn.close()
    '''
    print([*sqlite3.connect('mbta_alerts.db').cursor().execute('select count(*) from rail_alerts')])