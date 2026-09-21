# 地裂灵露效果

## 当前表现

- 长度2000、主命中宽度480，分别为初版的2.5倍和约3.33倍；使用时自动瞄准攻击范围内的敌人，优先选择预计覆盖更多怪物的方向，覆盖数量相同优先近敌。没有目标则沿角色朝向释放，方向在施放时锁定。距角色32开始，主裂缝与破碎岩岸纳入圆端范围，细长侧分叉仅作装饰。
- 0.48秒内从近端向远端撕开：每个纵向位置分别张开，岩岸轻微错动；完全张开时岩壁闪亮、触发重击声和0.32秒衰减震屏，并结算一次秒杀。含精英与Boss，正常掉落保留。
- 总可见时间2.8秒，最后0.85秒淡出。残留不持续杀怪；同屏最多一个，每局默认携带一瓶，秘籍可补领。

## 资源和性能

- `assets/art/skills/earth_rift_chasm.png`：2172×724透明PNG，1,062,593字节，由内置imagegen生成，无代码绘图。Asset DB设置为SpriteFrame，禁止合图、关闭裁切、边缘clamp。原始生成文件保留在Codex生成目录。
- `assets/effects/earth-rift.effect`：单个Sprite、一次纹理采样完成撕开、岩岸错动、亮光与渐隐，无片元噪声循环、粒子或屏幕抓取。
- `assets/prefabs/skills/EarthRiftEffect.prefab`：显示尺寸2200×760，绑定真实SpriteFrame和原有独立Shader材质。根AudioSource播放重击，TearSound子节点的AudioSource播放撕裂；两者均不循环、不自动播放。
- 每局复用同一节点和独立材质，声音复用两个预置AudioSource，按次触发而非按怪物触发。击杀只做一次空间查询。退出时停止音频并释放独立材质。
- 自动瞄准只在成功施放时做一次圆形空间查询；每个方向分区取最近敌人为候选，最多比较32个实际敌人方向，用复用的位置数组估算圆端范围覆盖数量，无逐帧寻敌。候选数量固定，方向评分的计算量随附近怪物数线性增长；数量估算按怪物中心，最终命中仍由原空间查询按怪物碰撞半径决定。
- 震屏复用TargetMover的地图跟随偏移，只影响视图，不改变角色位置和朝向；暂停/死亡时清零，结束后无累计漂移。

## 音频来源

源素材为项目已有的Kenney Sci-fi Sounds（CC0），许可见[许可原文](licenses/kenney-sci-fi-audio.txt)。只做离线降调、滤波、混音、限幅和淡出，无运行时声音合成。

| 文件（assets/audio/skills） | 原素材 | 时长 | 触发 |
| --- | --- | --- | --- |
| earth-rift-tear.wav | explosionCrunch_002.ogg | 0.62秒 | 成功施放 |
| earth-rift-impact.wav | lowFrequency_explosion_001.ogg + explosionCrunch_004.ogg | 2.10秒 | 裂缝完全张开、命中时 |

两段均为22050Hz、16bit、单声道PCM WAV，合计120,108字节。音量遵循ElementalSkillAudio的技能总音量；设为0静音。重击声有独立声源，不会被落雷/连锁的三声部限额跳过。

## 验证记录

2026-09-21 自动瞄准：全项目脚本类型检查通过；内存校验直接运行地裂类及控制器原有圆形/线段查询，13组场景覆盖怪群优先、同数量近敌优先、斜向与非零角色位置、空场/零朝向回退、范围外及场外排除、大体型边缘命中、施放后方向锁定与再次施放重新瞄准。3000怪物场景确认每次施放一次寻敌查询、一次命中查询，候选固定32个，缓冲区复用。未进行预览操作或微信真机验收。

2026-09-21：全项目脚本类型检查通过；内存校验使用实际控制器线段查询，确认前方1800与横向210位置命中、横向300/背后/距离2200位置排除，并验证0.48秒单次击杀与音效、静音、12次连续复用、震屏自然归零和暂停清零。两段WAV无削波、非静音。Prefab保存后确认SpriteFrame真实存在、无裁切/合图、两段音效不循环不自动播放，Asset DB全项目0断链；主场景文件与本次修改前完全一致。未进行微信真机画面、听感或帧率验收。

## 内置imagegen最终提示词

Use case: stylized-concept. Asset type: a production transparent PNG VFX sprite for a top-down 2D fantasy action game on mobile. Create ONE gigantic jagged EARTH FISSURE / earthquake chasm seen from directly overhead, horizontally from left to right. Wide landscape canvas about 3:1 aspect ratio, preferably 1536x512 or 1536x640; whole object fits with transparent padding. The crack occupies roughly 90% of image width and 70% of image height including branching fractures. Main chasm has extremely irregular angular lightning-bolt boundaries, pointed forked ends, a winding nearly black abyss through the middle, thick layered broken ochre/brown sandstone walls with dark vertical depth visible on both sides, crisp bevels and varied triangular rock slabs. Multiple long tapering lateral cracks and splintered rock edges reach out from both banks. Main dark opening moderately broad in center, narrows to sharp broken tips, NOT an oval, NOT a capsule, NOT a ring. Subtle hot amber lines at some deep rock edges, mostly dark natural stone, not a river of lava and not a bright orange stripe. A few sparse angular chunks close to rim, no floating distant debris. Strong silhouette readable at small scale, hand-painted polished game VFX, dramatic depth, clean controlled texture, no photoreal ground. Background MUST be actually alpha-transparent outside the fissure walls/branches, no grass, no rectangular ground patch, no gray or white background, no checkerboard painted into image, no glow fog extending to canvas borders, no text, no UI, no watermark. Single coherent crack sprite suitable for overlaying onto an existing grass field. Keep the far left and right tips centered vertically; do not crop any tips or branches.
