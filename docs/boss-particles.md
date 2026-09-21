# Boss 技能特效

已接入苔石拳王重击、棉团王召唤、棉团王翻滚三套技能表现，并补上棉团王登场和收招烟尘。棉团王沿用现有精英评级，召唤和翻滚已接入实际战斗。

## 美术与配置

素材由内置 imagegen 工具生成，再按小游戏用途缩小，保留真实透明通道。生成原图留在 Codex 生成目录，不进入 assets。

| 文件 | 尺寸 | PNG 字节数 | 用途 |
| --- | --- | ---: | --- |
| `assets/art/bosses/particles/energy_mote.png` | 64×64 | 1,289 | 重击、翻滚蓄力，召唤光点 |
| `assets/art/bosses/particles/dust_puff.png` | 128×128 | 20,480 | 落拳、翻滚、登场与收招烟尘 |
| `assets/art/bosses/particles/stone_chip.png` | 64×64 | 2,631 | 飞散碎石 |
| `assets/art/bosses/particles/telegraph_ring.png` | 128×128 | 9,796 | 重击范围、召唤位置预警 |
| `assets/art/bosses/particles/roll_warning.png` | 256×96 | 32,195 | 棉团王翻滚方向预警，柔边箭头与笔触 |

五张 PNG 合计 66,391 字节（64.8 KiB），RGBA 纹理像素约 256 KiB，不含引擎开销。翻滚预警改为一张独立绘制的方向贴图，替换原先纯色矩形与两端圆圈；旧 Start、End 节点保持停用。没有 WebP、额外音频或序列帧大图。

- `assets/prefabs/bosses/MossStoneKing.prefab`：`SkillParticles` 下配置 `Charge`（上限 12）、`ImpactDust`（14）、`ImpactDebris`（16）；`SkillTelegraphs/ImpactWarning` 配置重击范围圈。
- `assets/prefabs/bosses/CottonKingSimple.prefab`：`SkillParticles` 下配置 `Charge`（12）、`SummonAura`（12）、`RollDust`（18）、`RecoverDust`（12）；`SkillTelegraphs` 下配置翻滚通道和六个召唤位置，每个位置有独立 `SummonBurst`（6）。

贴图已按 Sprite 类型导入，并经 Asset DB 核实真实 SpriteFrame。所有发射器关闭 PlayOnLoad、AutoRemoveOnFinish，预警节点默认隐藏。每个角色缓存并复用预制体内的发射器和预警节点，不按攻击创建节点。仅需引擎的 `particle-2d` 模块。

地面显示层由场景 `UIRoot/Background/GroundEffects` 提供，已绑定控制器的“地面特效层”。战斗开始时将它排在背景的第一个子节点，显示顺序为：背景 → 地面特效 → 掉落物 → 全部怪物 → 玩家。生成精英或 Boss 时，把预制体已有的 `SkillParticles` 和 `SkillTelegraphs` 根节点挂到该层；每帧仅同步根节点位置，不重新创建粒子或排序。预警保持世界方向，粒子保留角色朝向。死亡时立即隐藏，死亡动画结束或战斗清理时一并销毁，避免留下独立节点。

## 触发与生命周期

苔石拳王开始 attack 时显示与实际伤害半径一致的范围圈、启动蓄力；收到 DragonBones 的 `slam_impact` 帧事件时隐藏预警、停止蓄力、启动烟尘和碎石，与伤害使用同一个事件。原有攻击速度、伤害和范围不变。

棉团王由 `MonsterCrowdController` 调度技能阶段，`MonsterPrefabVisuals` 播放对应 DragonBones 动画与特效：

- 登场 1.5 秒，初次追击 0.4 秒；后续技能间追击 2 秒。
- 召唤动作 1 秒：提前显示紫色位置圈，0.7 秒时发出光点并生成普通棉团；随后收招 1 秒。每次最多召唤 6 只，全场存活召唤物最多 12 只，每名召唤者累计最多召唤 12 只。位置限制在战斗区域内、保持间距并避开玩家，落地时再次检查安全距离。召唤物沿用普通怪的战斗和奖励逻辑。
- 翻滚蓄力 1.5 秒：显示橙金色箭头路线，锁定目标方向；预警随蓄力从低亮度平滑变亮，翻滚开始时隐藏。接着沿预告路线翻滚 0.8 秒，留下烟尘，最后收招 3 秒。翻滚使用移动路径碰撞检测，一次翻滚最多成功伤害玩家一次；玩家可以侧移躲避。预警使用缓存的 UIOpacity 跟随战斗计时，不新增粒子、材质或每次施法分配的节点。
- 登场、召唤、蓄力、翻滚和收招阶段关闭普通接触伤害，翻滚伤害单独结算；追击阶段保留普通接触伤害。锁定阶段不受追击或牵引改变位置，翻转朝向不会镜像预告路线。

战斗暂停时冻结技能计时，关闭粒子组件并保存模拟状态，暂停期间粒子暂不显示；恢复时继续原生命周期，不重新发射。死亡立即隐藏预警、清空粒子并取消未完成技能。

## 验证（2026-09-19）

- 修改脚本的 TypeScript 检查通过。
- Prefab 本地索引引用检查通过；Asset DB 全项目校验 196 项，broken reference 为 0。预警以外原有节点、动画、血条与粒子组件属性保留。
- 浏览器 Preview 中确认苔石拳王三个发射器峰值 [12,14,16]，重复攻击复用原节点，暂停可恢复，死亡粒子归零。
- 棉团王完整自然循环依次进入登场、追击、召唤、收招、追击、蓄力、翻滚、收招；实际出现六只召唤物、六处召唤光点和翻滚烟尘，对应动画与预警正常。运行期间无页面异常。
- 独立运行检查通过：两种朝向的预告端点与实际路径一致；蓄力后移动目标不改变路线；侧移可躲避；暂停冻结阶段；翻滚只成功伤害一次；安全阶段无接触伤害；临时走入召唤点会阻止该点出怪；召唤存活与累计上限均为 12；施法中死亡取消后续效果。
- 方向预警改版检查通过：运行中引用新贴图，两个旧圆圈停用；蓄力透明度从 100 平滑升至 230，暂停冻结、下一次施法重置为 100；左右朝向均与锁定路径一致；翻滚开始和死亡时正确隐藏，运行无页面异常。该次修改不改变烟尘、技能时长或伤害逻辑。
- 地面分层检查通过：普通怪批次、精英、Boss 与玩家均在地面特效层之后显示；棉团王与苔石拳王的预警、粒子根节点都归属地面层；翻滚移动无偏移、左右预警方向正确、暂停冻结；死亡后对应两个特效根节点清除，战斗清理后地面层为空。运行无页面异常。
- 使用 `build-configs/wechatgame.json` 完整构建成功，退出码 36。实测主包 1,984,361 字节（约 1.89 MiB），低于 4 MiB；包括分包的构建目录总计 9,125,047 字节。没有 WebP 文件，资源 JSON 中没有 WebP 请求记录。
- 上述运行检查为浏览器 Preview；未测微信真机帧率。

## imagegen 提示词

### stone

Use case: stylized-concept. Asset type: one tiny reusable 2D game particle texture for a moss stone golem boss in a cute hand-painted Chinese fantasy mobile game. Generate a single isolated irregular angular stone chip, neutral light gray with two or three softly shaded polygon facets, readable at 10 pixels, no outline. Centered, fills about 65% of square canvas, no drop shadow, no other objects. Actual transparent background and alpha, no baked checkerboard. Output transparent PNG, prefer compact 128 x 128 pixels. No text, labels or watermark. This is ONE particle sprite, not a sheet or a scene.

### dust

Use case: stylized-concept. Asset type: one reusable dust puff particle texture for a 2D mobile game. A single soft small irregular rounded puff of light neutral gray chalk dust, subtle cloudy silhouette, broad soft semi-transparent edges that fade into zero alpha. Centered, fills about 70% of square canvas. Simple readable painterly cartoon game VFX, no photoreal detail. Actual transparent background, no ground, no shadow, no checkerboard, no scene, no text or watermark. Output transparent PNG, prefer compact 128 x 128 pixels. One dust particle, not a whole explosion or a sheet.

### glow

Use case: stylized-concept. Asset type: one reusable energy mote particle texture for a 2D mobile game. One tiny soft white glowing mote, bright round core with a very faint short four-point glint and smooth compact luminous falloff into transparent edges. Neutral white, tinted at runtime. Centered isolated, occupies 55% of square canvas. Clear simple VFX readable at 8 pixels. Actual transparent background, no solid background, no checkerboard, no objects, no text, no watermark. Output transparent PNG, prefer compact 64 x 64 pixels. One sprite, not a sheet.

### ring

Use case: stylized-concept. Asset type: a single reusable circular ground telegraph sprite for a cute hand-painted 2D mobile action game. Create ONE clean white circular ring viewed exactly from overhead, evenly circular, centered on square canvas. Fine solid white outer boundary and a faint soft white inner glow band. Ring outer diameter 85% of canvas, band thickness about 6% of diameter. The entire center is fully transparent, outside fully transparent. Neutral white for runtime tinting green, orange or violet. Simple readable at 128 pixels, no lettering, no runes, no symbols, no sparks, no ground, no perspective ellipse, no shadow, no checkerboard. Genuine transparent PNG alpha. Prefer 128x128 output. Only this one ring sprite.

### roll warning

使用内置 imagegen 生成，缩小后的项目文件为 `assets/art/bosses/particles/roll_warning.png`。

Use case: stylized-concept. Asset type: ONE transparent PNG ground warning sprite for a rolling elite monster in a cute painterly 2D mobile game. Create a professionally painted horizontal dash telegraph, pointing RIGHT, viewed exactly from above. Wide 3:1 composition. A single unified warm amber-orange flowing brushstroke lane with semi-transparent glowing interior, subtly softened tapered trailing edge on the left, gently curved upper and lower edges, a clear broad pointed arrow tip on the right. Three readable cream-gold forward chevrons flow through the lane, smaller and fainter at the tail, strongest near the leading arrow. Restrained soft brushwork, crisp readable at 256 by 96 pixels. Mostly flat ground decal, no 3D perspective. The danger band's center should remain translucent so terrain shows through. Occupy almost the full image with very little empty padding. Genuine transparent alpha outside the shape, no black or white backdrop, no checkerboard. Avoid circles, rings, separate endpoint markers, rigid rectangle, border frame, explosive glow, floating sparks, text, symbols, character, ground, shadow. Only ONE coherent directional ground decal; not a sheet, scene, mockup or diagram. Output PNG.
