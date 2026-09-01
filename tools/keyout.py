# usage: keyout.py in out height [thresh]
import sys
from PIL import Image, ImageDraw, ImageFilter
src, out, H = sys.argv[1], sys.argv[2], int(sys.argv[3]); thresh = int(sys.argv[4]) if len(sys.argv)>4 else 28
im = Image.open(src).convert('RGB')
im = im.resize((round(im.width*H/im.height), H), Image.LANCZOS)
w,h = im.size
work = im.copy()
SENT=(255,0,255)
for xy in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
    if work.getpixel(xy)!=SENT: ImageDraw.floodfill(work, xy, SENT, thresh=thresh)
px=work.load(); mask=Image.new('L',(w,h),255); mp=mask.load()
for y in range(h):
    for x in range(w):
        if px[x,y]==SENT: mp[x,y]=0
# shrink edge 1px then feather
mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
rgba = im.convert('RGBA'); rgba.putalpha(mask)
# crop to content bbox with margin
bb = mask.getbbox(); m=6
rgba = rgba.crop((max(0,bb[0]-m),max(0,bb[1]-m),min(w,bb[2]+m),min(h,bb[3]+m)))
rgba.save(out, quality=92 if out.endswith('.webp') else None, method=6 if out.endswith('.webp') else None)
print(out, rgba.size)
