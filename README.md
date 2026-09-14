# GuardingTheTown

基于 Cocos Creator 3.8.8 的 2D 塔防割草小游戏项目。

## 打开与运行

1. 安装 Cocos Creator 3.8.8，引擎和编辑器本体不包含在仓库中。
2. 如需使用项目内的 MCP 编辑器扩展，先分别在
   `extensions/cocos-mcp-server/` 和 `extensions/cya-cocos-creator-mcp/`
   目录运行 `npm ci` 安装依赖。
3. 使用 Cocos Creator 3.8.8 打开项目根目录，等待资源导入完成。
4. 打开主场景 `assets/scene/scene.scene`。
5. 使用编辑器的预览功能运行游戏。

局内升级与 HUD 秘籍的使用方式见 [升级系统与秘籍](docs/upgrade-system.md)。秘籍可即时获得技能、调整等级、将全部技能设为满级并测试进化，修改仅作用于当前对局。

## 微信小游戏构建

在 Cocos Creator 的构建发布面板选择微信小游戏平台，可导入
`build-configs/wechatgame.json` 中的构建配置。构建输出目录为
`build/wechatgame`，可使用微信开发者工具打开。

微信启动模板 `build-templates/wechatgame/application.js` 会在场景加载前
预加载 `Resource` Bundle，因为主场景直接引用了其中的 UI Prefab。
修改启动流程时需保留这项依赖，不能等 UI 脚本启动后才加载。

## 目录

- `assets/`：游戏脚本、场景、预制体和美术资源，需保留对应的 `.meta` 文件。
- `settings/`：项目与编辑器配置。
- `build-configs/`、`build-templates/`：构建配置和模板。
- `extensions/`：项目使用的 Cocos Creator 扩展。
- `塔防割草小游戏策划/`：游戏设计文档。

`library/`、`temp/`、`build/`、`profiles/` 和 `node_modules/` 等生成内容由
`.gitignore` 排除，不纳入版本控制。
