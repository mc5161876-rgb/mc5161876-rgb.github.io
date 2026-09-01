# build a single-file artifact version: inline assets as data URIs, strip document skeleton
import re,base64,os,sys
root=r"C:/rex/mario-site"; s=open(os.path.join(root,'index.html'),encoding='utf-8').read()
mime={'.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'}
cache={}
def data(path):
    if path not in cache:
        p=os.path.join(root,path); ext=os.path.splitext(p)[1].lower()
        cache[path]='data:'+mime[ext]+';base64,'+base64.b64encode(open(p,'rb').read()).decode()
    return cache[path]
s2=re.sub(r"(['\"])assets/([^'\"]+)\1", lambda m: m.group(1)+data('assets/'+m.group(2))+m.group(1), s)
head=re.search(r"<head>(.*?)</head>",s2,re.S).group(1)
body=re.search(r"<body>(.*?)</body>",s2,re.S).group(1)
keep=[]
for tag in re.findall(r"<title>.*?</title>|<link[^>]*>|<style>.*?</style>",head,re.S):
    if 'rel="icon"' in tag: continue
    keep.append(tag)
out="\n".join(keep)+"\n"+body
open(os.path.join(sys.argv[1]),'w',encoding='utf-8').write(out)
print('artifact bytes',len(out.encode()), 'assets inlined',len(cache))
