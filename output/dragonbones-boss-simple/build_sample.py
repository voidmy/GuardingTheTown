"""Generate a deliberately simple, original DragonBones 5.5 Boss sample.

Run with Python + Pillow. Animation JSON and texture atlas are editable/importable
in DragonBones Pro. This does not create or overwrite any Cocos game asset.
"""
from pathlib import Path
import json
import math
import zipfile
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
DATA = HERE / 'import'
PARTS = HERE / 'parts'
DATA.mkdir(exist_ok=True)
PARTS.mkdir(exist_ok=True)
FPS = 30
INK = '#403958'
PURPLE = '#bba7e7'

def part(name, size, draw):
    s = 3
    im = Image.new('RGBA', (size[0]*s, size[1]*s))
    d = ImageDraw.Draw(im)
    def ellipse(box, fill, outline=None, width=3):
        d.ellipse(tuple(int(v*s) for v in box), fill=fill, outline=outline, width=width*s)
    def polygon(points, fill, outline=INK, width=3):
        pp=[(int(x*s),int(y*s)) for x,y in points]
        d.polygon(pp, fill=fill)
        if outline: d.line(pp+[pp[0]], fill=outline, width=width*s, joint='curve')
    def line(points, fill=INK, width=3):
        d.line([(int(x*s),int(y*s)) for x,y in points], fill=fill, width=width*s, joint='curve')
    draw(ellipse,polygon,line)
    im=im.resize(size,Image.Resampling.LANCZOS)
    im.save(PARTS / (name+'.png'))
    return im

def body(e,p,l):
    # One silhouette: no mesh, hair simulation, or layered shading.
    pts=[]
    for i in range(96):
        a=i*math.tau/96
        r=72+4*math.cos(a*12)
        pts.append((80+math.cos(a)*r,80+math.sin(a)*r))
    p(pts,PURPLE)
    e((26,24,61,43),'#d9cdf2')

def face(e,p,l):
    e((15,20,27,36),INK)
    e((61,20,73,36),INK)
    l([(12,11),(29,17)],width=4)
    l([(59,17),(76,11)],width=4)
    l([(33,43),(44,48),(55,43)],width=3)

def crown(e,p,l):
    p([(9,38),(4,8),(24,20),(36,3),(48,20),(68,8),(63,38)],'#f4ca58')
    l([(11,31),(61,31)],'#c28a42',3)

images={
    'body':part('body',(160,160),body),
    'face':part('face',(88,56),face),
    'crown':part('crown',(72,48),crown),
    'hand':part('hand',(48,48),lambda e,p,l:e((5,7,43,42),PURPLE,INK)),
    'foot':part('foot',(56,36),lambda e,p,l:e((3,5,53,32),'#80729f',INK)),
    'shadow':part('shadow',(180,40),lambda e,p,l:e((3,4,177,36),(38,29,56,55))),
}
atlas=Image.new('RGBA',(512,256))
positions={'body':(4,4),'face':(168,4),'crown':(260,4),
           'hand':(336,4),'foot':(388,4),'shadow':(168,68)}
subs=[]
for name,im in images.items():
    x,y=positions[name];atlas.paste(im,(x,y))
    subs.append(dict(name=name,x=x,y=y,width=im.width,height=im.height))
atlas.save(DATA/'cotton_king_tex.png',optimize=True)
texture=dict(name='CottonKingSimple',imagePath='cotton_king_tex.png',width=512,height=256,SubTexture=subs)

def bone(name,parent=None,x=0,y=0,length=0):
    b=dict(name=name,transform=dict(x=x,y=y),length=length)
    if parent:b['parent']=parent
    return b

bones=[bone('root'),bone('body','root',0,-88,70),
       bone('foot_l','body',-43,73,22),bone('foot_r','body',43,73,22),
       bone('hand_l','body',-77,0,25),bone('hand_r','body',77,0,25),
       bone('crown','body',0,-85,24)]
# Image bindings in painter order; multiple slots can share a bone or texture.
bindings=[('shadow','root','shadow',0,0),('foot_l','foot_l','foot',0,0),
          ('foot_r','foot_r','foot',0,0),('body','body','body',0,0),
          ('hand_l','hand_l','hand',0,0),('hand_r','hand_r','hand',0,0),
          ('face','body','face',0,-3),('crown','crown','crown',0,0)]
slots=[dict(name=n,parent=b,displayIndex=0,z=i) for i,(n,b,_,_,_) in enumerate(bindings)]
skin=[dict(name=n,display=[dict(name=p,path=p,type='image',
      transform=dict(x=x,y=y),pivot=dict(x=.5,y=.5))]) for n,b,p,x,y in bindings]

def track(keys,total,kind):
    # Each tuple starts with absolute frame index. Last key is an explicit endpoint.
    fields={'translateFrame':('x','y'),'rotateFrame':('rotate',),'scaleFrame':('x','y')}[kind]
    result=[]
    for i,k in enumerate(keys):
        end=keys[i+1][0] if i+1<len(keys) else total
        f=dict(duration=end-k[0],tweenEasing=0 if end>k[0] else None)
        f.update(zip(fields,k[1:]))
        result.append(f)
    return result

def animation(name,total,loop=False,poses=None):
    poses=poses or {}
    timelines=[]
    # Explicit reset on all bones avoids carrying a pose from an earlier action.
    for b in bones:
        channels=poses.get(b['name'],{})
        tl={'name':b['name']}
        for k,default in [('translateFrame',(0,0,0)),('rotateFrame',(0,0)),('scaleFrame',(0,1,1))]:
            tl[k]=track(channels.get(k,[default]),total,k)
        timelines.append(tl)
    return dict(name=name,duration=total,playTimes=0 if loop else 1,fadeInTime=0,bone=timelines)

def pose(t=None,r=None,s=None):
    return {k:v for k,v in [('translateFrame',t),('rotateFrame',r),('scaleFrame',s)] if v is not None}

animations=[
 animation('idle',60,True,{'body':pose(t=[(0,0,0),(30,0,-3),(60,0,0)],s=[(0,1,1),(30,.98,1.035),(60,1,1)]),
   'crown':pose(r=[(0,-3),(30,3),(60,-3)])}),
 animation('enter',45,poses={'body':pose(t=[(0,0,-45),(15,0,8),(24,0,-5),(45,0,0)],s=[(0,.9,1.1),(15,1.15,.88),(24,.96,1.04),(45,1,1)]),
   'crown':pose(r=[(0,-12),(18,12),(30,-5),(45,0)])}),
 animation('summon',30,poses={'body':pose(t=[(0,0,0),(10,0,-9),(18,0,-9),(24,0,5),(30,0,0)],s=[(0,1,1),(10,.95,1.1),(18,.95,1.1),(24,1.06,.94),(30,1,1)]),
   'hand_l':pose(t=[(0,0,0),(10,-9,-42),(18,-9,-42),(30,0,0)],r=[(0,0),(10,-25),(18,-25),(30,0)]),
   'hand_r':pose(t=[(0,0,0),(10,9,-42),(18,9,-42),(30,0,0)],r=[(0,0),(10,25),(18,25),(30,0)]),
   'crown':pose(t=[(0,0,0),(10,0,-8),(18,0,-8),(30,0,0)])}),
 animation('walk',30,True,{'body':pose(t=[(0,0,0),(8,0,-4),(15,0,0),(23,0,-4),(30,0,0)],r=[(0,-3),(15,3),(30,-3)]),
   'foot_l':pose(t=[(0,0,0),(8,0,-7),(15,0,0),(30,0,0)],r=[(0,-12),(15,12),(30,-12)]),
   'foot_r':pose(t=[(0,0,0),(15,0,0),(23,0,-7),(30,0,0)],r=[(0,12),(15,-12),(30,12)])}),
 animation('charge',45,poses={'body':pose(t=[(0,0,0),(24,0,17),(30,-2,17),(34,2,17),(38,-2,17),(42,2,17),(45,0,17)],
   s=[(0,1,1),(24,1.16,.78),(45,1.16,.78)]),
   'hand_l':pose(t=[(0,0,0),(24,13,13),(45,13,13)]),
   'hand_r':pose(t=[(0,0,0),(24,-13,13),(45,-13,13)]),
   'crown':pose(r=[(0,0),(24,-7),(30,7),(38,-7),(45,0)])}),
 animation('roll',24,poses={'body':pose(t=[(0,0,17),(3,0,0),(21,0,0),(24,0,0)],
   r=[(0,0),(6,90),(12,180),(18,270),(24,360)],s=[(0,1.16,.78),(3,1,1),(24,1,1)]),
   'hand_l':pose(t=[(0,13,13),(3,18,0),(21,18,0),(24,0,0)],s=[(0,1,1),(3,.65,.65),(21,.65,.65),(24,1,1)]),
   'hand_r':pose(t=[(0,-13,13),(3,-18,0),(21,-18,0),(24,0,0)],s=[(0,1,1),(3,.65,.65),(21,.65,.65),(24,1,1)]),
   'foot_l':pose(s=[(0,1,1),(3,.35,.35),(21,.35,.35),(24,1,1)]),
   'foot_r':pose(s=[(0,1,1),(3,.35,.35),(21,.35,.35),(24,1,1)]),
   'crown':pose(t=[(0,0,0),(3,0,12),(21,0,12),(24,0,0)])}),
 animation('recover',90,poses={'body':pose(t=[(0,0,0),(8,0,11),(25,0,5),(40,0,9),(55,0,4),(70,0,6),(90,0,0)],
   s=[(0,1,1),(8,1.12,.88),(25,1.05,.95),(40,1.09,.91),(55,1.03,.97),(70,1.06,.94),(90,1,1)]),
   'crown':pose(r=[(0,0),(8,13),(25,-8),(40,8),(55,-4),(70,4),(90,0)]),
   'hand_l':pose(t=[(0,0,0),(8,0,12),(70,0,8),(90,0,0)]),
   'hand_r':pose(t=[(0,0,0),(8,0,12),(70,0,8),(90,0,0)])}),
 animation('death',24,poses={'body':pose(t=[(0,0,0),(7,0,-10),(17,0,38),(24,0,75)],
   s=[(0,1,1),(7,1.12,1.12),(17,1.25,.52),(24,.01,.01)]),
   'crown':pose(t=[(0,0,0),(7,0,-22),(17,12,-15),(24,20,0)],r=[(0,0),(24,30)])})
]
armature=dict(name='CottonKing',type='Armature',frameRate=FPS,
    aabb=dict(x=-130,y=-230,width=260,height=260),bone=bones,slot=slots,
    skin=[dict(name='',slot=skin)],animation=animations,defaultActions=[dict(gotoAndPlay='idle')])
skeleton=dict(name='CottonKingSimple',version='5.5',compatibleVersion='5.5',frameRate=FPS,isGlobal=0,armature=[armature])
for name,data in [('cotton_king_ske.json',skeleton),('cotton_king_tex.json',texture)]:
    (DATA/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(HERE/'CottonKing-DragonBones-import.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(DATA.iterdir()):z.write(p,p.name)
print(json.dumps({'bones':len(bones),'slots':len(slots),'atlas':[512,256],
    'animations':{a['name']:a['duration']/FPS for a in animations}},indent=2))
