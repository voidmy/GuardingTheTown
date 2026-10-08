# 升级选择：三档卡面与流光

## 展示规则

- 普通（青玉）：常规技能强化、火力、体魄和恢复。
- 稀有（紫晶）：学习新技能、技能 Lv.3 / Lv.5 的关键强化、流派核心。
- 传说（鎏金）：本局唯一技能进化。

档次由 `UpgradePresentation.describeUpgrade` 根据真实奖励内容决定，不按左中右卡位决定，不额外随机，也不改动伤害、成长数值或抽取概率。

## 动效与性能

卡片以 65 ms 间隔依次淡入、上移和轻微回弹；点击后，选中卡片放大，其余卡片淡出，160 ms 后应用奖励。刷新、关闭与失效回调会取消旧动画；应用失败可继续选择。

流光由 Prefab 预置的小贴图粒子组成：普通无流光、稀有两束、传说三束，每束包含一个亮点和三个递减拖尾，沿圆角边框循环。稀有另有三枚上浮闪星，传说六枚；出现和选中时顶部扩散光环亮起。正文区域不覆盖扫光。

只有面板激活时更新，无运行时创建节点、无每帧数组/颜色分配；三选一最多 54 枚流光/闪星，加 3 个短时光环。调试的八技能进化页压缩为两行，并降低单卡粒子数。粒子复用现有 `energy_mote.png` 与 `telegraph_ring.png`。

## 资源

正式界面：`assets/Resource/UI/UpgradeSelectionPanel.prefab`。三张透明 PNG 均为 512 × 768，总计 594,116 字节，未新增 WebP。三张 RGBA 纹理未压缩显存约 4.5 MiB。通过 Asset DB 设置 Sprite 类型、clamp-to-edge 并重新导入；绑定实际存在的 SpriteFrame 子资源。

- `assets/art/ui/upgrade_cards/upgrade_jade_v2.png`
- `assets/art/ui/upgrade_cards/upgrade_amethyst_v2.png`
- `assets/art/ui/upgrade_cards/upgrade_gold_v2.png`

## 美术生成记录

验证：项目脚本在 ES2017 / DOM 类型环境、跳过引擎声明检查时通过；预制体内部引用、八个卡位和全部 14 个真实 SpriteFrame 引用通过。临时内存检查覆盖重复点击、应用失败、关闭/刷新后旧回调取消、八卡布局及粒子路径/停止。编辑器 Preview 已启动；未做画面截图或微信真机验证。

使用内置 image_gen 生成独立卡面，再等比缩小、PNG 调色板压缩。原稿保留在 Codex generated_images 中；正式引用全部来自项目 assets。

### upgrade_jade_v2

Use case: stylized-concept. Production asset for a landscape Chinese fantasy roguelite upgrade selection UI: one single front-facing portrait collectible upgrade card, aspect ratio 2:3, high quality hand-painted game UI, elegant Chinese cloud-scroll ornament. Full card fills image, symmetric straight-on orthographic, no perspective. Transparent background outside the rounded card silhouette, keep silhouette and glow within 4% margin on all sides. Opaque very dark tinted lacquer interior, subtle low contrast paper grain. Restrained ornamental frame. One small ornamental jewel crest centered at top (at 10% height). Leave the central area from 18% to 90% height dark, empty, very clean for runtime typography and a skill icon. Thin elegant horizontal separator at 43% height. Bottom tiny decorative diamond at 94% height. Crisp at mobile scale. No text, no letters, no runes, no numbers, no logo, no watermark, no weapon illustration inside, no scene background. Must be an actual isolated UI card sprite, not a mockup. Tier 1 COMMON: cool dark teal lacquer, brushed muted silver frame with modest jade-green trim, small single luminous jade cabochon at top. Simple clipped corners and subtle symmetrical cloud carvings. Restrained glints, no surrounding aura, minimal ornament. Interior near #0c2227, designed for cream text.

### upgrade_amethyst_v2

Use case: stylized-concept. Production asset for a landscape Chinese fantasy roguelite upgrade selection UI: one single front-facing portrait collectible upgrade card, aspect ratio 2:3, high quality hand-painted game UI, elegant Chinese cloud-scroll ornament. Full card fills image, symmetric straight-on orthographic, no perspective. Transparent background outside the rounded card silhouette, keep silhouette and glow within 4% margin on all sides. Opaque very dark tinted lacquer interior, subtle low contrast paper grain. Restrained ornamental frame. One small ornamental jewel crest centered at top (at 10% height). Leave the central area from 18% to 90% height dark, empty, very clean for runtime typography and a skill icon. Thin elegant horizontal separator at 43% height. Bottom tiny decorative diamond at 94% height. Crisp at mobile scale. No text, no letters, no runes, no numbers, no logo, no watermark, no weapon illustration inside, no scene background. Must be an actual isolated UI card sprite, not a mockup. Tier 2 RARE: dark plum lacquer, luminous amethyst crystal top crest, finely engraved polished silver and violet frame, refined wing-like symmetrical Chinese cloud ornaments at upper corners. Faceted purple accents, selective violet edge glints and a subtle narrow halo, more precious than common. Interior near #23132e, designed for cream text. Frame stays narrow, keep center empty.

### upgrade_gold_v2

Use case: stylized-concept. Production asset for a landscape Chinese fantasy roguelite upgrade selection UI: one single front-facing portrait collectible upgrade card, aspect ratio 2:3, high quality hand-painted game UI, elegant Chinese cloud-scroll ornament. Full card fills image, symmetric straight-on orthographic, no perspective. Transparent background outside the rounded card silhouette, keep silhouette and glow within 4% margin on all sides. Opaque very dark tinted lacquer interior, subtle low contrast paper grain. Restrained ornamental frame. One small ornamental jewel crest centered at top (at 10% height). Leave the central area from 18% to 90% height dark, empty, very clean for runtime typography and a skill icon. Thin elegant horizontal separator at 43% height. Bottom tiny decorative diamond at 94% height. Crisp at mobile scale. No text, no letters, no runes, no numbers, no logo, no watermark, no weapon illustration inside, no scene background. Must be an actual isolated UI card sprite, not a mockup. Tier 3 LEGENDARY: deepest obsidian warm lacquer, bright imperial polished gold layered frame with delicate embossed Chinese cloud patterns, large brilliant amber-gold jewel crest like a small sun at top, dramatic symmetric upward golden wing flourishes integrated into top corners, a few concentrated glints at edges, warm radiant halo restrained to outer margin. Luxurious jackpot relic, significantly more ornate and radiant than rare. Interior near #251b12, designed for cream text. Frame stays narrow, keep center empty.
