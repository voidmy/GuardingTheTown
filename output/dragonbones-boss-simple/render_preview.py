"""Render a GIF from matrices sampled by the actual DragonBones runtime."""
import sys,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
HERE=Path(__file__).resolve().parent
samples=json.loads(Path(sys.argv[1]).read_text())
ske=json.loads((HERE/'import/cotton_king_ske.json').read_text())['armature'][0]
parts={p.stem:Image.open(p).convert('RGBA') for p in (HERE/'parts').glob('*.png')}
skin={s['name']:s['display'][0] for s in ske['skin'][0]['slot']}
sequence=['enter','idle','summon','walk','charge','roll','recover','death']
labels={'enter':'ENTER','idle':'IDLE','summon':'SUMMON','walk':'MOVE',
        'charge':'ROLL WINDUP','roll':'ROLL','recover':'RECOVER','death':'DEFEATED'}
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',19)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',12)
frames=[]
for name in sequence:
    clip=samples['clips'][name]
    for i,matrices in enumerate(clip['frames'][:-1]):
        if i%2:continue
        im=Image.new('RGBA',(420,340),'#f1eef7')
        d=ImageDraw.Draw(im)
        d.text((18,14),'COTTON KING / SIMPLE BOSS',font=font,fill='#403958')
        d.text((18,44),f"{labels[name]}  {clip['duration']:g}s",font=small,fill='#6c6280')
        d.line((32,292,388,292),fill='#d5cedf',width=2)
        # Preview stays in place, exactly as the exported skeleton does.
        ox,oy=210,284
        for slot in ske['slot']:
            disp=skin[slot['name']]
            source=parts[disp['path']]
            a,b,c,dd,tx,ty=matrices[slot['parent']]
            local=disp.get('transform',{})
            px=local.get('x',0)-source.width*.5
            py=local.get('y',0)-source.height*.5
            ex=ox+tx+a*px+c*py;ey=oy+ty+b*px+dd*py
            det=a*dd-b*c
            if abs(det)<1e-7:continue
            inv=(dd/det,-c/det,(c*ey-dd*ex)/det,
                 -b/det,a/det,(b*ex-a*ey)/det)
            layer=source.transform(im.size,Image.Transform.AFFINE,inv,Image.Resampling.BICUBIC)
            im=Image.alpha_composite(im,layer)
        d=ImageDraw.Draw(im)
        d.text((18,314),'7 BONES  /  1 ATLAS  /  IN-PLACE ANIMATION',font=small,fill='#6c6280')
        frames.append(im.convert('RGB'))
frames[0].save(HERE/'boss_actions.gif',save_all=True,append_images=frames[1:],
               duration=67,loop=0,optimize=True,disposal=2)
print('Rendered',len(frames),'frames from DragonBones runtime matrices')
