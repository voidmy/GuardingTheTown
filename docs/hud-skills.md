# 战斗HUD与自动技能

更新日期：2026-09-20

同日补充：已接入[归梦小院与药水](expedition.md)。正式学习池调整为射击、穿透箭、气刃、落雷、连锁闪电五种；风系与寒霜由药水提供，秘籍仍保留七技能调试。下文保留此前七种自动技能接入记录与参数。

## 已实现范围

- 将 `assets/Resource/UI/PlayerHud.prefab` 更新为正式战斗HUD：左上生命、护盾、等级与经验条；顶部战斗计时和击败数；底部本命与两个副技能槽。
- HUD使用Widget定位，节点、图片和按钮均保存在Prefab中；脚本绑定并更新既有节点，不运行时生成界面层级。技能图标只在技能或等级状态变化时更新。
- 保留FPS、怪物计数、秘籍、满级、加怪、进化资格和全部数值查看功能。完整数值通过“数值详情”展开，默认折叠。
- 新增自动落雷、连锁闪电、寒霜脉冲，加入普通学习、升级、秘籍和进化入口。技能池7种，正式对局3槽，本命占1槽，进化替换原槽；秘籍允许超额测试。
- 七种技能全部满级时，秘籍可以逐个选择进化，进化选择面板也支持七项分两行显示；每局仍只使用一次进化资格。
- 本轮不扩展符文或精粹系统；保留项目已实现的核心行为与调试功能。

## 新技能参数

2026-09-22 按单体、群攻和控制定位重新平衡。下表为角色初始攻击力 20、无通用加成的实际伤害；执行时系数只乘一次攻击力。完整对照见[技能伤害分工](combat-numbers.md#技能伤害分工)。

| 技能 | Lv.1 | Lv.2 | Lv.3 | Lv.4 | Lv.5 | 进化 |
| --- | --- | --- | --- | --- | --- | --- |
| 自动落雷 | 每4秒选射程620内目标，优先Boss、精英；0.3秒预警后原目标伤害120，半径90内其他敌人溅射18 | 主目标150/溅射22.5 | 半径115 | 主目标200/溅射30 | 主目标240/溅射36，间隔3.2秒 | 双重天雷：0.3秒后原地追加60%伤害余雷，仍区分原目标和溅射 |
| 连锁闪电 | 每2.5秒起始射程520，跳跃距离200，最多3个不同目标，每个伤害24 | 伤害28 | 最多4个目标 | 伤害34 | 伤害40，间隔2秒 | 雷霆连锁：最多5个目标，跳跃距离250 |
| 寒霜脉冲 | 半径240内有怪时自动触发；伤害8，冷却6秒；普通怪冻结0.65秒，随后减速45%持续1.5秒 | 伤害10 | 半径280 | 伤害13，减速2秒 | 伤害16，冷却5秒 | 极寒领域：半径320，普通怪冻结1秒 |

- 三种新技能首次学习后至少等待1秒；冷却结束后无有效目标则每0.2秒检查一次，不积压连续释放。
- 落雷锁定预警落点与原目标；原目标离开或死亡后，其他敌人仅受15%溅射，不继承完整伤害。已开始的落雷与余雷保留当次目标、伤害、范围和进化状态，升级不改写待结算攻击。
- 闪电先捕获最多5个目标的路线，再结算伤害，避免敌人死亡引起存储换位后重复或错打目标。
- 寒霜对普通怪冻结时停止移动与接触伤害；精英仅减速22.5%，特殊动作不被强行打断；Boss免疫寒霜控制，仍承受伤害。
- 控制状态按有效战斗时间到期，暂停时不计时；同类减速不相乘，刷新持续时间。怪物死亡换位时同步移动状态数据，新怪重置状态。
- 普通怪冻结时呈冰蓝色并暂停贴图帧动画，减速时为较淡冰蓝色；沿用批量绘制中的现有数据通道，不给每只怪新增节点或材质。
- 余雷属于衍生伤害，不再消耗余势。闪电每个不同目标只受一次主伤害，余势仍最多增强一个精英或Boss的一次命中。

## 性能与资源

- 落雷雷光由 410×70 调整为 780×180，锚点固定在落点附近；连锁闪电基础厚度由 42 调整为 100，进化后为 120，显示时间由 0.28 秒调整为 0.38 秒。连锁长度仍按实际目标距离计算，粗细读取预制体配置，不扩大伤害范围。
- 场景新增 `UIRoot/Background/SkillEffects`，与怪物层使用相同局部坐标。地面预警圈和寒霜环在 `GroundEffects`；雷光在角色、怪物上方；伤害数字和 HUD 在雷光上方。落雷预警圈仅在学习时从预制体分离到地面层，随施法复用、淡出，卸下技能时一并回收。
- 元素技能音效由 `SkillEffects` 上的 `ElementalSkillAudio` 配置，单个 AudioSource 复用，最多同时占用 3 个声音；连锁每次施法只播放一次，余雷音量为主雷的 55%。详见 [元素技能音效](elemental-audio.md)。
- 三种新技能共用 `ElementalAbility.ts`，各自独立计时。学习时一次性实例化固定数量的预制体，落雷1个、闪电5个、寒霜1个，此后重复使用。
- 新增预制体：`assets/prefabs/skills/ThunderEffect.prefab`、`ChainLightningEffect.prefab`、`FrostPulseEffect.prefab`。
- 新增透明PNG：`assets/art/skills/elemental/lightning_arc.png`、`frost_ring.png`，同时供技能表现与HUD图标使用。现有头像、卡框、气刃等资源继续复用。
- 新图片已通过Asset DB设置Sprite导入，重新导入后查询真实SpriteFrame UUID，再绑定Prefab。
- 源图使用内置imagegen生成，未用代码绘制图片，原生成结果保留；完整提示词见下节。

## 验证与边界

- 70组不同开局与随机升级行为校验，正常对局技能数不超过3，槽满不再出现学习项，装备不会新增技能。
- 已校验七技能秘籍和唯一进化、闪电目标去重与固定节点池、落雷延迟和参数快照、余雷限制、寒霜触发与冷却、精英抗性及Boss免控。
- 保存后的HUD组件引用、三槽层级、七个图标、七行秘籍、七张进化候选与三个技能Prefab绑定均检查通过。
- 已完成项目源码类型检查和全项目资源引用检查。编辑器独立的场景检查接口在本机不可用，使用保存文件检查与Asset DB引用检查覆盖对应项目。
- 闪电调整后重新通过类型检查、层级与绑定检查，并校验落雷延迟、余雷时机、卡顿后的雷光恢复、连锁一次发声、固定节点池、地面圈回收、三声上限、重复触发限频和静音。
- 已打开编辑器预览；未进行截图或自动画面操作，未做微信真机帧率、内存或最终微信包体测试。

## 美术生成提示词

生成工具：内置 `image_gen.imagegen`，两次独立生成。

### 闪电

Use case: stylized-concept. Asset type: single reusable 2D game lightning arc sprite for a casual Chinese fantasy survival game. Create a clean isolated horizontal lightning bolt, stretching from left endpoint to right endpoint, contained within the central 80 percent of a wide 3:1 transparent canvas. White hot core with light cyan glow, clear angular electric zigzag silhouette, only two tiny secondary branches, bold readable shape at small sizes. It will be rotated vertically for a lightning strike and stretched between enemies for chain lightning. No background, genuine transparent alpha outside the lightning, no floor, no cloud, no icons, no text, no frame, no watermark. Sparse glow with tight transparent bounds, polished hand-painted mobile game VFX. Produce one horizontal bolt only.

### 寒霜

Use case: stylized-concept. Asset type: single reusable 2D top-down frost pulse VFX sprite for a polished casual Chinese fantasy mobile game. A centered circular icy shockwave ring, delicate angular ice shards pointing outward along the ring, white icy-blue core and a small soft cyan glow. Perfectly round viewed straight overhead, no perspective. Ring outer radius occupies 80 percent of a square canvas. Large empty genuinely transparent center, transparent background outside, sparse details, silhouette readable at 100 px. One ring only, no text, no icons, no borders, no floor, no scenery, no checkerboard. Clean painted fantasy spell art ready as a transparent PNG sprite. It will be scaled outward once on cast and also used as a frost skill icon.
