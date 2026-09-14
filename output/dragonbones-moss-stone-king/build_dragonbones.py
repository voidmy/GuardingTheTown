"""Package approved ImageGen cutout art and author a small DragonBones 5.5 rig.

Image generation/extraction is done with image_gen. This script only slices and
packs the resulting RGBA assets, and writes editable skeletal animation data.
It never writes Cocos assets, .meta files, or fake .dbproj files.
"""
from pathlib import Path
import json
import math
import zipfile
from PIL import Image

HERE = Path(__file__).resolve().parent
FPS = 30
for folder in ('parts', 'import', 'project'):
    (HERE / folder).mkdir(exist_ok=True)

sheet = Image.open(HERE / 'source/parts-sheet-transparent.png')
assert sheet.mode == 'RGBA', 'Source must already have real alpha'
specs = {
    'body': ((0, 50, 630, 510), .42, None),
    'head': ((640, 100, 1020, 470), .37, None),
    'arm_l': ((1030, 40, 1536, 515), .36, (1410, 143)),
    'arm_r': ((0, 515, 580, 1024), .36, (143, 614)),
    'foot_l': ((600, 680, 1015, 1024), .34, None),
    'foot_r': ((1050, 680, 1536, 1024), .34, None),
}
images, pivots, extraction = {}, {}, {}
for name, (region, scale, joint) in specs.items():
    cell = sheet.crop(region)
    box = cell.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    assert box is not None
    # Retain antialiasing around the existing alpha edge, without recoloring it.
    box = (max(0, box[0]-3), max(0, box[1]-3),
           min(cell.width, box[2]+3), min(cell.height, box[3]+3))
    sprite = cell.crop(box)
    size = (round(sprite.width*scale), round(sprite.height*scale))
    sprite = sprite.resize(size, Image.Resampling.LANCZOS)
    images[name] = sprite
    if joint:
        pivots[name] = ((joint[0]-region[0]-box[0])/(box[2]-box[0]),
                        (joint[1]-region[1]-box[1])/(box[3]-box[1]))
    else:
        pivots[name] = (.5, .5)
    extraction[name] = dict(region=region, crop=box, size=size, pivot=pivots[name])

ring = Image.open(HERE / 'source/shockwave.png')
assert ring.mode == 'RGBA'
box = ring.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
ring = ring.crop(box)
ring = ring.resize((496, round(ring.height*496/ring.width)), Image.Resampling.LANCZOS)
images['shockwave'] = ring
pivots['shockwave'] = (.5, .5)

# One 512-square atlas. Deterministic packing keeps all textures unrotated.
positions = {
    'body': (4, 4), 'head': (244, 4),
    'foot_l': (342, 4), 'foot_r': (342, 74),
    'arm_l': (4, 174), 'arm_r': (154, 174),
    'shockwave': (8, 340),
}
atlas = Image.new('RGBA', (512, 512))
subtextures, boxes = [], []
for name, sprite in images.items():
    x, y = positions[name]
    assert x+sprite.width <= 512 and y+sprite.height <= 512, (name, sprite.size)
    box = (x, y, x+sprite.width, y+sprite.height)
    for other_name, other in boxes:
        assert box[2] <= other[0] or box[0] >= other[2] or box[3] <= other[1] or box[1] >= other[3], (name, other_name)
    boxes.append((name, box))
    atlas.paste(sprite, (x, y))
    sprite.save(HERE / 'parts' / (name+'.png'), optimize=True)
    subtextures.append(dict(name=name, x=x, y=y, width=sprite.width, height=sprite.height))
atlas.save(HERE / 'import/moss_stone_king_tex.png', optimize=True)

def bone(name, parent=None, x=0, y=0, length=0):
    data = dict(name=name, length=length, transform=dict(x=x, y=y))
    if parent:
        data['parent'] = parent
    return data

bones = [
    bone('root'),
    bone('body', 'root', 0, -116, 80),
    bone('head', 'body', 0, -85, 34),
    bone('arm_l', 'body', -93, -42, 100),
    bone('arm_r', 'body', 93, -42, 100),
    bone('foot_l', 'root', -61, -images['foot_l'].height/2, 30),
    bone('foot_r', 'root', 61, -images['foot_r'].height/2, 30),
    bone('shockwave', 'root', 0, -3, 0),
]
# Shoulder insertion ends are covered by the torso; feet sit behind the body.
order = ['shockwave', 'foot_l', 'foot_r', 'arm_l', 'arm_r', 'body', 'head']
slots = [dict(name=n, parent=n, displayIndex=0, z=i,
              color=dict(aM=0 if n == 'shockwave' else 100)) for i, n in enumerate(order)]
# DragonBones Pro's data importer normalizes image pivots to their center.
# Encode the shoulder attachment as image translation so editor and runtime agree.
skin = [dict(name=n, display=[dict(name=n, path=n, type='image',
        transform=dict(x=(.5-pivots[n][0])*images[n].width,
                       y=(.5-pivots[n][1])*images[n].height),
        pivot=dict(x=.5, y=.5))]) for n in order]

def pose(t=None, r=None, s=None):
    return {k:v for k,v in [('translateFrame',t),('rotateFrame',r),('scaleFrame',s)] if v is not None}

def channel(keys, total, fields):
    result = []
    for i, key in enumerate(keys):
        stop = keys[i+1][0] if i+1 < len(keys) else total
        assert stop >= key[0]
        frame = dict(duration=stop-key[0])
        if stop > key[0]:
            frame['tweenEasing'] = 0
        frame.update(zip(fields, key[1:]))
        result.append(frame)
    return result

defaults = dict(translateFrame=(0,0,0), rotateFrame=(0,0), scaleFrame=(0,1,1))
fields = dict(translateFrame=('x','y'), rotateFrame=('rotate',), scaleFrame=('x','y'))

def make_animation(name, frames, poses, loop=False, opacity=None, events=None):
    timeline = []
    for b in bones:
        data = {'name': b['name']}
        for kind in defaults:
            keys = poses.get(b['name'], {}).get(kind, [defaults[kind]])
            data[kind] = channel(keys, frames, fields[kind])
        timeline.append(data)
    slot_timeline = []
    for name_ in order:
        base_alpha = 0 if name_ == 'shockwave' else 100
        keys = (opacity or {}).get(name_, [(0, base_alpha)])
        color = channel(keys, frames, ('aM',))
        for f in color:
            f['value'] = dict(aM=f.pop('aM'), rM=100, gM=100, bM=100)
        slot_timeline.append(dict(name=name_, colorFrame=color))
    a = dict(name=name, duration=frames, playTimes=0 if loop else 1,
             fadeInTime=0, bone=timeline, slot=slot_timeline)
    if events:
        indices = sorted(set([0, frames] + list(events)))
        a['frame'] = []
        for i, start in enumerate(indices[:-1]):
            f = dict(duration=indices[i+1]-start)
            if start in events:
                f['events'] = [dict(name=events[start])]
            a['frame'].append(f)
    return a

idle = {
    'body': pose(t=[(0,0,0),(36,0,-1.5),(72,0,0)]),
    'head': pose(r=[(0,-1),(36,1),(72,-1)]),
    'arm_l': pose(r=[(0,0),(36,1.5),(72,0)]),
    'arm_r': pose(r=[(0,0),(36,-1.5),(72,0)]),
}
walk = {
    'body': pose(t=[(0,0,0),(9,0,-3),(18,0,0),(27,0,-3),(36,0,0)], r=[(0,-1.5),(18,1.5),(36,-1.5)]),
    'head': pose(r=[(0,1),(18,-1),(36,1)]),
    'arm_l': pose(r=[(0,-6),(18,6),(36,-6)]),
    'arm_r': pose(r=[(0,-6),(18,6),(36,-6)]),
    'foot_l': pose(t=[(0,-3,0),(9,1,-7),(18,3,0),(27,0,0),(36,-3,0)]),
    'foot_r': pose(t=[(0,3,0),(9,0,0),(18,-3,0),(27,1,-7),(36,3,0)]),
}
enter = {
    'root': pose(t=[(0,0,-66),(10,0,0),(14,0,-3),(20,0,0),(36,0,0)]),
    'body': pose(t=[(0,0,0),(10,0,8),(20,0,0),(36,0,0)], s=[(0,1,1),(10,1.025,.96),(20,1,1),(36,1,1)]),
    'arm_l': pose(r=[(0,18),(10,-5),(20,2),(36,0)]),
    'arm_r': pose(r=[(0,-18),(10,5),(20,-2),(36,0)]),
    'head': pose(t=[(0,0,0),(12,0,4),(24,0,0),(36,0,0)]),
}
charge = {
    'body': pose(t=[(0,0,0),(6,0,4),(25,0,-10),(30,0,-10),(33,-1,-10),(36,0,-10)], s=[(0,1,1),(6,1.01,.98),(25,.985,1.025),(36,.985,1.025)]),
    'head': pose(t=[(0,0,0),(25,0,-3),(36,0,-3)], r=[(0,0),(25,-3),(36,-3)]),
    'arm_l': pose(t=[(0,0,0),(25,-2,-3),(36,-2,-3)], r=[(0,0),(6,-7),(25,108),(30,110),(33,108),(36,110)]),
    'arm_r': pose(t=[(0,0,0),(25,2,-3),(36,2,-3)], r=[(0,0),(6,7),(25,-108),(30,-110),(33,-108),(36,-110)]),
}
slam = {
    'body': pose(t=[(0,0,-10),(3,0,-13),(5,0,22),(7,0,18),(10,0,22),(27,0,22)], s=[(0,.985,1.025),(3,.985,1.025),(5,1.025,.93),(10,1.025,.93),(27,1.025,.93)]),
    'head': pose(t=[(0,0,-3),(5,0,8),(10,0,5),(27,0,5)], r=[(0,-3),(5,4),(10,2),(27,2)]),
    'arm_l': pose(t=[(0,-2,-3),(3,-2,-3),(5,7,3),(7,7,1),(10,7,3),(27,7,3)], r=[(0,110),(3,118),(5,-8),(7,-5),(10,-8),(27,-8)]),
    'arm_r': pose(t=[(0,2,-3),(3,2,-3),(5,-7,3),(7,-7,1),(10,-7,3),(27,-7,3)], r=[(0,-110),(3,-118),(5,8),(7,5),(10,8),(27,8)]),
    'shockwave': pose(s=[(0,.05,.05),(5,.05,.05),(9,.45,.45),(17,1.02,1.02),(25,1.3,1.3),(27,1.3,1.3)]),
}
recover = {
    'body': pose(t=[(0,0,22),(8,0,22),(23,0,14),(40,0,3),(54,0,0)], s=[(0,1.025,.93),(8,1.025,.93),(23,1.02,.95),(40,1,1),(54,1,1)]),
    'head': pose(t=[(0,0,5),(8,0,5),(30,0,2),(54,0,0)], r=[(0,2),(8,2),(23,-3),(38,1),(54,0)]),
    'arm_l': pose(t=[(0,7,3),(8,7,3),(34,0,0),(54,0,0)], r=[(0,-8),(8,-8),(34,-2),(54,0)]),
    'arm_r': pose(t=[(0,-7,3),(8,-7,3),(34,0,0),(54,0,0)], r=[(0,8),(8,8),(34,2),(54,0)]),
}
death = {
    'body': pose(t=[(0,0,0),(6,-3,0),(12,3,3),(20,0,18),(30,0,34),(42,0,34)], r=[(0,0),(6,-3),(12,3),(20,-4),(30,-7),(42,-7)], s=[(0,1,1),(20,1,.96),(42,1,.96)]),
    'head': pose(t=[(0,0,0),(12,0,4),(30,0,17),(42,0,17)], r=[(0,0),(12,-4),(30,10),(42,10)]),
    'arm_l': pose(t=[(0,0,0),(12,-4,2),(30,-20,8),(42,-20,8)], r=[(0,0),(12,6),(30,-16),(42,-16)]),
    'arm_r': pose(t=[(0,0,0),(12,4,2),(30,20,8),(42,20,8)], r=[(0,0),(12,-6),(30,16),(42,16)]),
}
wave_opacity = {'shockwave':[(0,0),(4,0),(5,88),(9,70),(17,30),(25,0),(27,0)]}
death_opacity = {n:[(0,100),(23,100),(35,30),(42,0)] for n in order if n != 'shockwave'}

# A convenient full attack loop in the editor, built from the exact same keys.
phases = [(charge, 36, {}), (slam, 27, wave_opacity), (recover, 54, {})]
combo, combo_alpha = {}, {}
for b in bones:
    tracks = {}
    for kind, default in defaults.items():
        keys, offset = {}, 0
        for poses, total, _ in phases:
            source = poses.get(b['name'], {}).get(kind, [default])
            for key in source:
                keys[offset+key[0]] = (offset+key[0], *key[1:])
            offset += total
        tracks[kind] = [keys[i] for i in sorted(keys)]
    combo[b['name']] = tracks
for n in order:
    keys, offset = {}, 0
    for _, total, alpha in phases:
        for frame, value in alpha.get(n, [(0,0 if n == 'shockwave' else 100)]):
            keys[offset+frame] = (offset+frame, value)
        offset += total
    keys[117] = (117, 0 if n == 'shockwave' else 100)
    combo_alpha[n] = [keys[i] for i in sorted(keys)]

animations = [
    make_animation('idle',72,idle,True),
    make_animation('walk',36,walk,True),
    make_animation('enter',36,enter),
    make_animation('charge',36,charge),
    make_animation('slam',27,slam,opacity=wave_opacity,events={5:'slam_impact'}),
    make_animation('recover',54,recover),
    make_animation('death',42,death,opacity=death_opacity),
    make_animation('attack',117,combo,True,combo_alpha,events={41:'slam_impact'}),
]
armature = dict(name='MossStoneKing',type='Armature',frameRate=FPS,
                aabb=dict(x=-330,y=-380,width=660,height=470),bone=bones,slot=slots,
                skin=[dict(name='',slot=skin)],animation=animations,
                defaultActions=[dict(gotoAndPlay='idle')])
skeleton = dict(name='MossStoneKing',version='5.5',compatibleVersion='5.5',
                frameRate=FPS,isGlobal=0,armature=[armature])
texture = dict(name='MossStoneKing',imagePath='moss_stone_king_tex.png',
               width=512,height=512,SubTexture=subtextures)
for name, value in [('moss_stone_king_ske.json',skeleton),('moss_stone_king_tex.json',texture)]:
    (HERE/'import'/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
(HERE/'source/cutout-map.json').write_text(json.dumps(extraction,indent=2)+'\n')
with zipfile.ZipFile(HERE/'MossStoneKing-DragonBones-import.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((HERE/'import').iterdir()):
        archive.write(path,path.name)
print(json.dumps({'bones':len(bones),'characterBones':7,'effectBones':1,
                  'atlas':[512,512],'parts':{n:im.size for n,im in images.items()},
                  'animations':{a['name']:a['duration']/FPS for a in animations}},indent=2))
