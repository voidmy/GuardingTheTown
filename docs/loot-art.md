# 更换掉落图片

| 类型 | 图片（assets/art/loot） | 预制体（assets/prefabs/loot） | 尺寸 |
| --- | --- | --- | --- |
| 普通经验 | experience_crystal.png | LootNormal.prefab | 64 × 64 |
| 精英经验 | elite_amethyst.png | LootElite.prefab | 72 × 72 |
| Boss经验 | boss_spirit_pearl.png | LootBoss.prefab | 78 × 78 |
| 稀有宝箱 | rare_chest.png | LootChest.prefab | 80 × 80 |
| 稀有装备 | rare_equipment.png | LootEquipment.prefab | 84 × 84 |
| 稀有光效 | rare_beacon.png | LootRareEffect.prefab | 112 × 140 |

全部是带透明通道的独立 PNG。宝箱和装备分别显示金色、紫色光圈光柱，并轻微呼吸和悬浮；开始吸附后关闭光效。最多同时显示24处光效，其余物品仍正常显示和拾取。光效根节点锚点为(0.5, 0.15)。

## 换图方法

1. 将新的 PNG 放进图片目录，在 Cocos 导入设置选择 Sprite，确认 Asset DB 中真实存在 SpriteFrame 子资源。
2. 打开对应预制体，将根节点 Sprite 的 SpriteFrame 换成新资源，保持 Simple 模式。
3. 在根节点 UITransform 调整宽高、锚点；也可调整基础缩放和颜色，保存后重新运行。

覆盖同名 PNG 可保留原引用；保留原 .meta 并重新导入。不要使用 WebP，不要手写或猜测 SpriteFrame UUID。

场景 `UIRoot/Background/LootLayer` 的 `LootDropSystem` 提供六个预制体入口。只绑定属性，不要把这些预制体直接拖进场景：单独摆放的 Sprite 没有拾取数据，会形成无法拾取的物品。该层只保留六个 LootBatch 绘制节点。

## 性能与限制

预制体只提供根节点图片、尺寸、锚点、旋转、缩放和颜色；运行时不为每颗掉落或光效创建节点，不执行预制体脚本、动画或粒子。使用默认 Sprite 材质，不支持九宫格、填充模式、自定义材质或子节点外观。

最多512个掉落；到上限合并同种奖励、同怪物档次、同进化及吸附状态的旧掉落，保留经验和稀有奖励份数。同贴图物品合批，五种独立图片最多五批；光效在物品之前单独一批，避免覆盖图标或挤占512个物品名额。空批次不绘制，每个批次复用固定顶点缓冲。

当前生成工具输出1254像素临时图片，尚未做微信真机纹理内存和包体验收。正式替换建议128～256像素PNG并使用图集；代码支持图集裁切和旋转UV。文件压缩体积不代表显存占用。

## 临时图片来源

使用内置图片生成工具（built-in mode），未使用API/CLI或代码绘制美术。图片最终路径见上表。

### 普通水晶原始提示词

> Create ONE game-ready transparent PNG sprite for an experience crystal pickup in a top-down 2D Chinese fantasy horde-survival mobile game. Single chunky cyan/turquoise faceted crystal, small dark navy outline, bright pale-cyan highlight on upper left, darker teal facets on right, hand-painted clean cartoon style, high silhouette readability at 40 pixels tall. Front three-quarter view, upright vertically. Just one crystal centered and filling about 80% of a square canvas; no pedestal, no floor, no cast shadow, no floating particles, no glow outside silhouette, no text, no UI, no border. Background must be genuinely transparent alpha, not a checkerboard. Produce a small practical sprite resolution if possible (256x256). This is a temporary replaceable PNG artwork for a Cocos Sprite prefab.

## 此次新增图片的最终提示词

### elite

> Use case: stylized-concept. Asset type: transparent PNG pickup sprite for a top-down 2D Chinese fantasy WeChat survival game. The referenced cyan crystal is STYLE REFERENCE ONLY, not an edit target. Create one new distinct purple amethyst crystal CLUSTER: one tall center shard and two shorter side shards, rich violet body, lilac highlights, dark indigo crisp outline, chunky hand-painted cartoon shading matching the reference. Centered isolated object, very legible at 48 screen pixels. No pedestal, no floor, no text, no border, no particles and no external glow. Genuine transparent alpha background. Tight square canvas with modest padding. Deliver a compact 256x256 PNG sprite if supported; this will be used directly in a mobile game.

### boss

> Use case: stylized-concept. Asset type: transparent PNG pickup sprite for a top-down 2D Chinese fantasy WeChat survival game. The referenced cyan crystal is STYLE REFERENCE ONLY, not an edit target. Create one new distinctive golden spirit pearl: a round amber-gold luminous orb clasped by a small ornate bronze lotus frame, a simple bright swirl at its center, thick dark brown outline, clean chunky hand-painted cartoon shading matching the reference. No gemstone shard silhouette. Centered isolated object, very legible at 56 screen pixels. No floor, no words, no UI, no border, no particles and no external glow. Genuine transparent alpha background. Tight square canvas with modest padding. Deliver a compact 256x256 PNG sprite if supported; this will be used directly in a mobile game.

### chest

> Use case: stylized-concept. Asset type: one transparent PNG rare loot sprite for a top-down 2D Chinese fantasy mobile survival game. A single small closed reddish-brown wooden treasure chest with chunky antique gold metal bands and a small jade latch, viewed from above at a three-quarter angle. Bold dark outline, clean hand-painted cartoon shading, warm golden highlight, immediately recognizable at 64 pixels. Only the chest, no contents, no text, no border, no background scene, no floor, no particles, no external glow. Centered on genuine transparent alpha background. Tight square canvas. Please output a compact 256x256 PNG appropriate for a WeChat mini-game.

### equipment

> Use case: stylized-concept. Asset type: one transparent PNG rare equipment pickup sprite for a top-down 2D Chinese fantasy mobile survival game. One short elegant Chinese straight sword, steel-silver blade with cyan edge reflections, gold crossguard, dark purple grip with one small violet tassel, tilted diagonally bottom-left hilt to top-right tip. Thick crisp dark navy outline, chunky clean hand-painted cartoon style, readable at 64 pixels. Single sword only, no character or hands, no text, no border, no panel, no ground, no particles, no external glow. Centered on genuine transparent alpha background. Tight square canvas. Please output a compact 256x256 PNG appropriate for a WeChat mini-game.

### beacon

> Use case: stylized-concept. Asset type: a transparent PNG visual-effect sprite for a rare-loot ground marker in a top-down 2D mobile game. One soft WHITE luminous elliptical ground ring near the bottom, with a short narrow softly fading vertical pillar of white light rising from its center. A few tiny simple four-point white sparkles alongside the pillar. Ring perspective ellipse width about 75% canvas, pillar height about 65% canvas. Pure white and pale gray only; colors will be tinted by the game. The ring center and all surrounding space genuinely transparent; light smoothly fades to alpha zero, no opaque black or gray background. No object, no treasure, no character, no letters, no UI, no hard rectangular edges. Keep effect minimal, delicate and clearly readable at a 110x130 pixel display size. Deliver a compact 256x256 transparent PNG.
