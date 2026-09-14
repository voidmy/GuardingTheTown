// Sample real DragonBones bone matrices for the offline preview.
// Usage: node sample_runtime.mjs /path/to/dragonBones.js /tmp/poses.json
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const db = await import(pathToFileURL(path.resolve(process.argv[2])));
// DragonBones editor / image coordinates point down; Cocos uses its own adapter.
db.DragonBones.yDown = true;
const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(here, 'import/cotton_king_ske.json')));
const parser = new db.ObjectDataParser();
const data = parser.parseDragonBonesData(raw);
if (!data) throw new Error('DragonBones data did not parse');
const ad = data.getArmature('CottonKing');
if (!ad || ad.sortedBones.length !== 7) throw new Error('Unexpected skeleton');
const atlas = JSON.parse(fs.readFileSync(path.join(here,'import/cotton_king_tex.json')));
const resources = new Set(atlas.SubTexture.map(x => x.name));
for (const s of raw.armature[0].skin[0].slot) {
  for (const display of s.display) if (!resources.has(display.path)) throw new Error('Missing image: '+display.path);
}
const noop=()=>{};
const proxy={dbInit:noop,dbClear:noop,dbUpdate:noop,dispose:noop,
  hasDBEventListener:()=>false,dispatchDBEvent:noop,addDBEventListener:noop,removeDBEventListener:noop};
const runtime = new db.DragonBones(proxy);
const clips={};
for (const animation of raw.armature[0].animation) {
  const arm = db.BaseObject.borrowObject(db.Armature);
  arm.init(ad,proxy,{},runtime);
  for (const b of ad.sortedBones) db.BaseObject.borrowObject(db.Bone).init(b,arm);
  const state=arm.animation.play(animation.name,1);
  if(!state)throw new Error('Animation did not start: '+animation.name);
  arm.advanceTime(0);
  const frames=[];
  for (let i=0;i<=animation.duration;i++) {
    if(i) arm.advanceTime(1/raw.frameRate);
    const matrices={};
    for(const b of arm.getBones()) {
      const m=b.globalTransformMatrix;
      const values=[m.a,m.b,m.c,m.d,m.tx,m.ty];
      if(!values.every(Number.isFinite))throw new Error('Non-finite transform');
      matrices[b.name]=values;
    }
    frames.push(matrices);
  }
  clips[animation.name]={duration:animation.duration/raw.frameRate,frames,completed:state.isCompleted};
  if(!state.isCompleted) {
    arm.advanceTime(.001);
    if(!state.isCompleted)throw new Error('Clip did not complete: '+animation.name);
    clips[animation.name].completed=true;
  }
  arm.dispose();
  runtime.advanceTime(0);
}
fs.writeFileSync(process.argv[3],JSON.stringify({frameRate:raw.frameRate,clips}));
console.log(JSON.stringify({runtime:db.DragonBones.VERSION,bones:ad.sortedBones.length,
  imageReferences:'all resolved',clips:Object.fromEntries(Object.entries(clips).map(([n,c])=>[n,{seconds:c.duration,completed:c.completed}]))},null,2));
