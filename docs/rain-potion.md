# 唤雨灵露

接入日期：2026-09-21。设计背景见[全屏降雨药水](../塔防割草小游戏策划/15_唤雨灵露.md)。

## 当前行为

- 每局开始后第一格保留地裂灵露，第二格放入唤雨灵露；藏露灵契的第三格留空。开局按钮重复回调不会重复赠送。
- 点击第二格并选择使用：0.35秒起势，随后有效降雨6秒，每0.5秒造成使用时攻击力150%的基础伤害，共12次；最后0.45秒只淡出。普通怪、精英和Boss均走原有伤害与掉落流程，不消耗普攻余势。
- 雨幕随当前视野移动；每次伤害查询当前可见矩形与地图的交集，敌人碰撞圆触及范围边缘也会命中。屏外敌人不受伤，进入视野后从下一次结算开始受伤。
- 全过程同屏最多一场雨，重复使用保留原瓶；成功使用才消耗，沿用药水共用1秒间隔。
- 暂停冻结计时、雨纹、水花和雨声；恢复继续。死亡、返回小院和销毁时停止雨幕、压暗与声音。起手震屏在药水菜单关闭后触发。
- 总药水掉率不变。种类权重调整为回春40%、风涡15%、凝霜15%、地裂15%、唤雨15%。药瓶复用现有PNG，以蓝色区分。
- 本版使用蓝白双层雨纹、地面水花、15%冷色压暗、已有雷鸣和新雨声。云影及额外收尾落水声未加入。

## 资源与性能

- `assets/prefabs/skills/RainEffect.prefab`：19个预置节点，包含一个雨幕Sprite、16个水花Sprite、地面容器和雷鸣节点。运行时每局只实例化一次，水花容器移到地面层，雨幕放在技能上层、HUD下方。
- `assets/effects/rain-screen.effect`、`assets/materials/rain-screen.mtl`：一个全屏四边形，两次雨纹采样，合并远近雨和压暗；当前使用约3.6×1.7的平铺密度，让雨滴比首版更大、更容易在手机上辨认；没有逐滴节点、碰撞器、屏幕抓取、实时折射或片元噪声循环。
- 独立材质从Prefab材质复制并绑定到Sprite，跨施放复用，销毁时释放；水花池固定16个，复用预制体组件，数量不随敌人增加。
- 伤害每秒查询2次，复用结果数组和伤害对象，先收集稳定ID再结算，避免大量敌人交换删除时漏怪。伤害飘字继续使用现有容量上限。
- 雨纹 `assets/art/skills/rain_streaks.png`：1254×1254、867,722字节。水花 `assets/art/skills/rain_splash.png`：1774×887、436,659字节。均为内置imagegen制作的透明PNG，保留原始alpha，未通过代码绘制图片。
- 两张图片均通过Asset DB设为Sprite类型，查询确认真实SpriteFrame存在后绑定；关闭裁切和合图，使用线性过滤、边缘clamp，Shader自行循环雨纹坐标。
- 新增两张PNG和雨声源文件合计1,513,901字节；这不是微信构建压缩后包体数据。纹理显存和实际绘制开销仍以真机为准。

## 音频来源

- 持续雨声来自 Kresiek The Furry 的 [AMB Rain Loop 2](https://opengameart.org/content/amb-rain-loop-2)，页面标注CC0，并说明为GoPro现场录音；许可说明见[来源记录](licenses/rain-audio.txt)。
- 取原始OGG的10～15秒，转为22050Hz单声道，并以0.25秒交叉淡化衔接首尾，输出 `assets/audio/skills/rain-loop.wav`，PCM 16bit、约4.75秒、209,520字节。没有运行时声音合成。
- 雷鸣复用 `assets/audio/skills/thunder-strike.wav`，原有来源见[元素音效](elemental-audio.md)。雨声和雷声各用一个预置AudioSource，音量跟随元素技能总音量。

## 验证记录

- 全项目脚本类型检查通过。
- 不新增测试文件，内存校验运行实际RainPotion逻辑并读取保存后的Prefab结构：7种时间步长均恰好12次伤害；覆盖起势无伤害、攻击快照、同屏拒绝重复施放、暂停/恢复、静音、停止后不伤害以及20次连续复用。水花池保持16个，材质不重复创建。
- 使用实际控制器视野转换与矩形查询，覆盖视野位移、普通怪边缘、矩形四角、大体型跨边缘、地图裁切、空范围及空间网格路径。
- 使用实际矩形查询和applyDamage，在内存替身的交换删除/奖励回调下确认3000个稳定ID全部结算；这项不等于在运行游戏中实测3000怪帧率或掉落画面。
- 运行实际beginExpedition方法，确认普通栏位为地裂+唤雨，藏露栏位为地裂+唤雨+空位，重复开始不再赠送。
- 保存后逐项核对Prefab中的两个真实SpriteFrame、材质、两段音频引用与循环设置。Asset DB全项目267项资源校验，0断链。
- 主场景与本轮开始前相比，只有MonsterCrowdController新增rainPrefab引用；制作预制体时的临时实例已移除。
- 未进行自动截图或预览输入；未进行微信完整构建、真机画面、听感和性能验收。

## 内置imagegen提示词

### 雨纹

Use case: stylized-concept. Asset type: seamless transparent PNG rain texture for a top-down mobile fantasy action game. Create a square tile containing evenly scattered slender blue-white rain streaks, around 65 short tapered strokes, all parallel slanting slightly from upper right to lower left (about 12 degrees from vertical). Varied lengths between 20 and 90 pixels relative to a 1024 square canvas, width 2 to 5 pixels, bright cores and subtle soft pale cyan edges. Sparse enough to clearly see the game beneath, around 90 percent genuinely alpha-transparent negative space. Strokes distributed evenly across the entire tile with no central composition, no large blank bands. Seamless repeating texture. Rain strokes only: no clouds, no ground, no water surface, no splashes, no haze, no lightning, no characters, no text, no borders. Actual transparent alpha background, not black or gray, no baked checkerboard. Crisp hand-painted polished game VFX, compatible with mobile rendering. Prefer 1024x1024.

### 水花

Use case: stylized-concept. Asset type: one transparent PNG water splash VFX sprite for a top-down mobile fantasy game. Single small raindrop impact on ground, viewed from high above at a slight angle: compact elliptical icy-blue water ripple ring, 5 short pointed water jets and 4 tiny separated droplets just above the ring. Clean bright white-cyan highlights, translucent blue body, crisp hand-painted game VFX. Width about twice height, centered with generous genuinely transparent padding on every side. One isolated splash only, not a sheet of multiple frames. No water surface plane, no background, no ice crystals, no snowflakes, no ground, no clouds, no mist, no text, no shadow rectangle, no baked checkerboard. Actual alpha-transparent background. Designed to remain readable when shown 50 pixels wide.
