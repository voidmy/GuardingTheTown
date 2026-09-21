# 元素技能音效

`UIRoot/Background/SkillEffects` 的 `ElementalSkillAudio` 保存三个 AudioClip 和总音量，设为 0 即静音。同行的 AudioSource 不自动播放、不循环，沿用 Cocos 音频接口。

| 技能 | 文件（assets/audio/skills） | 原素材（Kenney Sci-fi Sounds） | 触发 |
| --- | --- | --- | --- |
| 自动落雷 | thunder-strike.wav | explosionCrunch_000.ogg | 0.3 秒预警结束、雷光命中时；余雷再次触发但音量为 55% |
| 连锁闪电 | chain-discharge.wav | laserLarge_001.ogg | 每条完整连锁一次，最多 5 跳也不重复叠加声音 |
| 寒霜脉冲 | frost-pulse.wav | forceField_000.ogg | 实际触发冰环时，无目标则静音 |

三个资源合计 74,958 字节，均为 22050 Hz、16 bit、单声道 PCM WAV。对原音频只做滤波、首段静音裁切、截短和淡入淡出，没有运行时合成或生成声音。原始音色素材取自 [Kenney Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds)，CC0；许可原文保存于 `docs/licenses/kenney-sci-fi-audio.txt`。

播放复用一个 AudioSource。使用固定长度数组记录同类冷却和三个占用截止时间，无逐帧音频轮询、播放队列、每击新节点或定时器。超过三个同时发声请求时直接忽略新声音；同类最短间隔分别为 220/160/400 ms，等待时间使用实际时钟，升级暂停不会积压后续声音。

默认总音量 0.7；落雷、连锁和寒霜的相对音量分别为 0.85、0.62、0.52，避免连锁掩盖拾取提示。调试全技能也遵守声音上限。

已验证资源绑定、静音、禁用、限频、同时发声上限及每次连锁仅触发一声。微信真机的扬声器听感、系统静音模式和最终构建仍需实机验收。
