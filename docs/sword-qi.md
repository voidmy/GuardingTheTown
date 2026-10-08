# 刀气起

普通升级池中的自动飞行范围技能。在 HUD → 秘籍 → 刀气起 → 获得可立即试用；小院的启程秘典可选择刀气起作为唯一的 Lv.1 本命技能。

## 刀气与飞行

- 使用一张有明确头尾的不对称贴图：右上侧粗亮刀头、向左下逐渐收细消散的拖尾。第二刀通过 Y 轴镜像得到相反的头尾朝向，两刀均朝起手瞄准方向飞出；刀光和拖尾在飞行中保持出手姿态，不旋转。
- 每轮在 0、0.22 秒挥出两道刀气。普通刀气以 720 单位/秒向前飞行 360 距离，进化后飞行 440 距离。
- 飞行沿途造成范围伤害，每道刀气对同一敌人只结算一次；不同刀气可以再次命中。回斩伤害为首刀的 135%，范围半径为首刀的 120%。
- 双重打击每轮只判定一次，触发后在 0.30、0.52 秒紧接着再挥两刀，不等待技能冷却；追加刀气不再触发追加。
- 本轮保存伤害、范围和追加结果。暂停时动作与伤害查询停止；移除技能或结束对局时清理所有刀气和待发射动作。

## 升级

| 等级 | 首刀基础伤害 | 首刀半径 | 释放间隔 | 双重打击概率 |
| --- | --- | --- | --- | --- |
| 1 | 20 | 170 | 5 秒 | 0% |
| 2 | 20 | 170 | 4.5 秒 | 0% |
| 3 | 20 | 205 | 4.5 秒 | 20% |
| 4 | 20 | 205 | 4 秒 | 30% |
| 5 | 20 | 205 | 3.5 秒 | 40% |

2026-09-22：释放间隔加长为 Lv.1～5 的 5、4.5、4.5、4、3.5 秒，进化沿用满级间隔。间隔从本轮起手到下一轮起手计算；回响灵契仍乘 0.9。每轮内的双斩与追加刀气时点保持不变。

2026-09-22：等级仅改善冷却、范围与追加概率，各级初始首刀伤害均为20。独立伤害阶数0～3，首刀自身伤害10→20→30→40，另加角色攻击力×0.5；初始20攻击力时最终首刀20→30→40→50，回斩始终为首刀的135%。完整规则见[技能伤害分工](combat-numbers.md#技能伤害分工)。

进化“惊鸿双斩”将追加概率提高至60%、首刀半径提高至235、飞行距离提高至440；单刀伤害保持不变。回响灵契仍缩短冷却，进化仍消耗本局唯一资格。

## 资源与性能

- 贴图：`assets/art/skills/sword_qi/sword_qi_crescent.png`，透明 PNG，824,279 字节。
- 预制体：`assets/prefabs/skills/SwordQiDoubleSlash.prefab`，每个预制体含 SwingA / SwingB，各有 Blade、Trail、Flare。
- 获取技能时预分配两个预制体，共 4 个刀气槽、12 个 Sprite。追加也复用这些槽位；更新时不创建节点、定时器或图片。
- 飞行使用空间分区支持的扫掠线段范围查询，避免低帧率时直接穿过敌人。每刀复用命中集合，避免连续帧重复伤害。
- 刀头闪光复用已有 `energy_mote.png`；HUD 图标复用刀气贴图。第二刀的父节点镜像同时作用于主刀光、拖尾和闪光。
- 替换图片后保留原主 UUID 与真实 SpriteFrame UUID，并重新导入。PNG alpha、clamp-to-edge、线性过滤、无 mipmap、trim none 保留。

## 验证

39 个游戏脚本类型检查通过。11 组内联行为检查及伤害回调销毁检查通过，覆盖发射时点、镜像、同向飞行、单刀伤害去重、概率边界、升级快照、2 秒长帧防漏判、终点补查、暂停与销毁。240 FPS 模拟下四刀共 66 次扫掠查询，无额外实例化。Asset DB 全项目资源引用检查返回 0 broken references。未进行微信构建、真机测试或画面交互验证。

## 美术生成记录

模式：内置 ImageGen 编辑原图。结果以透明 PNG 覆盖项目中的原贴图，不用代码绘制素材。

最终提示词：

> Use case: precise-object-edit. Edit target: the attached transparent sword qi sprite. Keep the turquoise jade and pale gold color palette, hand-painted premium Chinese fantasy game VFX style, clean alpha transparency and isolated square sprite. Crucial correction: redesign the symmetrical two-pointed crescent into ONE ASYMMETRIC curved energy slash with an unmistakable HEAD and long TRAILING TAIL. The HEAD is a compact thick brilliant white-gold spear-shaped cutting tip at upper-right (about x78%, y23%), pointing diagonally upward-right. Immediately behind this tip is the thickest turquoise body. From that head the body curves down along the right side then curls toward bottom-left into a very long progressively thinner, fading, fine turquoise-gold tail ending near x18%, y85%. Width and brightness must diminish monotonically toward the tail. One head only, one tapering tail only; the two ends must be clearly different in mass, shape and brightness. Overall silhouette is an open curved sickle/comet swoosh bulging to the right, under 170 degrees, with generous empty transparent center. It is a traveling blade of energy, not a metal sword, not a full moon or ring, not symmetrical, no head at the tail, no circles, no additional projectiles. Small restrained wispy streaks may follow the same direction. Readable at 256px, limit intricate noise. True transparent background and soft alpha edges, no black background, no checkerboard, no text, no borders. One isolated blade only. Fit all glow with 8 percent padding. Prefer 512x512 output; game will mirror it vertically for the exact opposite second slash, both moving to the right.
