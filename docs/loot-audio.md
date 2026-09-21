# 掉落拾取音效

场景 `UIRoot/Background/LootLayer` 上的 `LootPickupAudio` 配置音效和总音量。音量设为 0 可关闭；同节点的 `AudioSource` 关闭自动播放。声音由实际拾取回调触发，怪物死亡、物品落地和开始吸附时不会播放拾取声。

| 掉落 | 声音 | 文件（assets/audio/loot） | 原素材 |
| --- | --- | --- | --- |
| 普通经验 | 三种短促玻璃脆响，连续拾取按 A/B/C/B 变化 | pickup-normal-a/b/c.wav | Interface Sounds: glass_002/003/006.ogg |
| 精英经验 | 更明确的确认音 | pickup-elite.wav | Interface Sounds: confirmation_001.ogg |
| Boss 经验 | 上扬的能量奖励音 | pickup-boss.wav | Digital Audio: powerUp7.ogg |
| 宝箱 | 金币叮当声 | pickup-chest.wav | RPG Audio: handleCoins.ogg |
| 装备 | 金属抽取声 | pickup-equipment.wav | RPG Audio: drawKnife2.ogg |

## 密集拾取与微信性能

- 素材转换为 22050 Hz、16 bit、单声道 PCM WAV，裁掉首尾静音并做短淡入淡出；7 个文件合计 90,156 字节（约 88 KiB）。单段时长约 0.10～0.75 秒。
- 场景直接引用 AudioClip，复用一个 AudioSource；不为掉落创建音频节点，不在拾取时下载、加载或合成声音，不依赖微信端动态变调。
- 每类最多保留一个待播标记。512 个同类物品一帧收完只产生一个声音；奖励份数和经验结算不受影响。
- 全局发声间隔至少 75 ms，稀有奖励占用 130 ms 节拍；同类额外限频。不同稀有类型同帧到达时依次播放，宝箱、装备、Boss 优先。
- 稀有声音播放后 0.5 秒内，普通/精英提示音降至原音量的 45%，避免淹没稀有奖励。
- 普通经验停止连续拾取 0.4 秒后从 A 重新开始。过期提示直接丢弃；清场、重开或禁用组件时清空待播状态，避免积压声音。
- 升级选择暂停战斗期间，已收取的稀有奖励仍可完成短提示；未收取的物品不会继续触发拾取声。

## 素材来源

素材作者为 Kenney，均为 CC0，可用于商业项目。这里只对已有音频进行格式转换、静音裁切、音量调整和淡入淡出，没有程序合成音色。

- [Interface Sounds](https://kenney.nl/assets/interface-sounds)
- [Digital Audio](https://kenney.nl/assets/digital-audio)
- [RPG Audio](https://kenney.nl/assets/rpg-audio)

原始许可文件保留在 `docs/licenses/kenney-*-audio.txt`。不要将整套原素材包放进游戏 assets，以免增加微信包体。

微信真机听感、设备静音模式和实际扬声器表现仍需在最终构建上验收。
