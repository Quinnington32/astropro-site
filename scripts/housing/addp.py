import json,sys,urllib.parse
from PIL import Image
R='./'
def add(place,slug,name,website,src,pick,summary,alt,address=None):
    d=json.load(open(R+'src/data/housing.json'))
    m=next(x for x in d if x['place'].startswith(place))
    pid=f"{m['id']}-property-{slug}"
    ex=next((p for p in m['properties'] if p['id']==pid),None)
    im=Image.open(src).convert('RGB');im.thumbnail((1400,1400))
    im.save(R+f'public/assets/housing/{pid}.jpg',quality=86)
    q=urllib.parse.quote_plus(f"{name}, {m['place']}")
    prop=dict(id=pid,name=name,website=website,verifiedAt="2026-11-16",maps=f"https://www.google.com/maps/search/?api=1&query={q}")
    if address: prop['address']=address
    prop.update(summary=summary,source=website,pick=pick,photo=f"assets/housing/{pid}.jpg",photoAlt=alt,photoApproved=True)
    if ex: ex.update(prop)
    else: m['properties'].append(prop)
    json.dump(d,open(R+'src/data/housing.json','w'),indent=2,ensure_ascii=False);open(R+'src/data/housing.json','a').write('\n')
    print('added',pid)
