# 项目 Agent 约定

## Cocos 图片与 SpriteFrame 引用

- PNG 导入成普通 `texture`，不代表 Asset DB 一定生成了可供 `cc.Sprite` 使用的 `SpriteFrame`。Prefab 的 `cc.Sprite.spriteFrame` 不能直接引用 `Texture2D` 或 `ImageAsset`。
- 给 Prefab 设置图片前，必须通过 Asset DB 查询该图片的 sub-assets，确认返回结果中真实存在 `type: "spriteFrame"`，并使用查询返回的真实 SpriteFrame UUID。
- 禁止根据图片 UUID 猜测或手写 `${imageUuid}@f9941`。只有 Asset DB 确认该 UUID 对应的 SpriteFrame 已存在时才能使用。
- 如果图片只有 `texture` / `texture2D` sub-asset，没有 SpriteFrame，先在 Cocos Creator 中把它配置为 Sprite 类型并重新导入；确认 SpriteFrame 生成后，再绑定到 Prefab。
- 使用 MCP 设置 `spriteFrame` 或 `prefab` 属性时优先传 Asset DB 返回的真实 UUID，不要把 `db://...` 路径原样写进序列化的 `__uuid__` 字段。
- 保存后必须重新检查 Prefab：`cc.Sprite._spriteFrame.__uuid__` 应能解析到现存的 SpriteFrame，并执行资源引用校验，确保没有 broken reference。出现粉红 Sprite 时，首先检查导入类型、SpriteFrame sub-asset 和 UUID 是否真实存在。

## 微信小游戏图片格式

- 微信小游戏目标禁止使用 `.webp` 源图片。部分微信开发者工具的小游戏代码包文件白名单不包含 `.webp`，文件即使真实存在于 `build/wechatgame/assets/...`，运行时仍可能报 `file ... does not exist`。
- 带透明通道的图片使用 PNG；不带透明通道的图片优先使用 JPG，也可以使用 PNG。转换时应兼顾微信小游戏 4 MB 主包限制。
- 禁止只修改扩展名或只替换 `build/wechatgame` 内的构建文件。必须真实转换 `assets` 下的源图片格式，让 Cocos Asset DB 重新导入，再完整重新构建微信小游戏；否则构建资源数据仍可能记录为 WebP。
- 已被 Scene 或 Prefab 引用的图片迁移格式时，必须通过 Asset DB move/rename 保留原 `.meta`、主 UUID 以及真实存在的 Texture/SpriteFrame sub-asset UUID，不能采用“新导入图片后删除旧图片”的方式生成新 UUID。
- 迁移后必须确认 `.meta.files` 已更新为真实扩展名，原有 wrap mode、透明通道、packable、trim 等导入参数未被破坏，并执行全项目资源引用校验。
- 微信构建完成后必须确认 `build/wechatgame/assets` 中没有 `.webp` 资源、构建资源记录不再请求 WebP，并检查最终主包体积低于平台限制。
- 遇到“磁盘文件存在但 WAGame 报不存在”时，优先检查文件扩展名是否被微信代码包白名单过滤，不要先假定是分包或缓存问题。
