import sys,re,subprocess,os,urllib.parse,json
from PIL import Image
def get(u,binary=False):
    r=subprocess.run(['curl','-s','-L','-m','25','-A','Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120','-e',u,u],capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf8','ignore')
def cands(url):
    h=get(url); out=[]
    for m in re.finditer(r'<meta[^>]+(?:og:image|twitter:image)[^>]+content=["\']([^"\']+)',h): out.append(m.group(1))
    for m in re.finditer(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:og:image|twitter:image)',h): out.append(m.group(1))
    for m in re.finditer(r'(?:src|data-src|data-lazy-src|href|content|url\()["\'=(]*([^"\'\s)>]+\.(?:jpe?g|webp|png)[^"\'\s)>]*)',h,re.I): out.append(m.group(1))
    seen=[];bad=re.compile(r'logo|icon|favicon|sprite|floor|plan|map|avatar|badge|svg|thumb|-\d{2,3}x\d{2,3}\.',re.I)
    for c in out:
        c=urllib.parse.urljoin(url,c.replace('&amp;','&'))
        if c.startswith('http') and c not in seen and not bad.search(c.split('?')[0]): seen.append(c)
    return seen
if __name__=='__main__':
    key,url=sys.argv[1],sys.argv[2]; n=int(sys.argv[3]) if len(sys.argv)>3 else 6
    d=f'/tmp/cand/{key}';os.makedirs(d,exist_ok=True)
    got=[]
    for c in cands(url)[:25]:
        b=get(c,True)
        if len(b)<20000: continue
        p=f'{d}/{len(got)}.img';open(p,'wb').write(b)
        try:
            im=Image.open(p);w,h=im.size
            if w>=800 and 1.2<=w/h<=2.2:
                im.convert('RGB').save(f'{d}/{len(got)}.jpg',quality=88);got.append((c,w,h))
        except Exception: pass
        if len(got)>=n: break
    json.dump(got,open(f'{d}/meta.json','w'))
    print(key,len(got),[g[1:] for g in got])
