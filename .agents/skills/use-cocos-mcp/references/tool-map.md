# GuardingTheTown Cocos MCP 工具与故障参考

## 事实来源顺序

1. 当前端点的 live `tools/list` 与工具 schema。
2. 当前扩展源码：
   - `extensions/cocos-mcp-server/source/mcp-server.ts`
   - `extensions/cocos-mcp-server/source/tools/*.ts`
   - `extensions/cya-cocos-creator-mcp/source/mcp-server.ts`
3. 扩展 README 和功能指南。

工具数量和参数可能随扩展构建变化；不要依据文档猜调用。

## 项目端点

### 编辑器 MCP

- Codex 名称：`guarding_town_cocos`
- 扩展：`extensions/cocos-mcp-server`
- 配置：`settings/mcp-server.json`
- MCP：`http://127.0.0.1:3100/mcp`
- 健康检查：`http://127.0.0.1:3100/health`
- 当前配置：`autoStart:true`

主要工具类别：`scene_`、`node_`、`component_`、`prefab_`、`project_`、`debug_`、`sceneAdvanced_`、`sceneView_`、`referenceImage_`、`assetAdvanced_` 和 `validation_`。类别大小写属于工具名的一部分。

### Preview MCP

- Codex 名称：`guarding_town_preview`
- 扩展：`extensions/cya-cocos-creator-mcp`
- 配置：`settings/cya-cocos-creator-mcp.json`
- MCP：`http://127.0.0.1:8866/mcp`
- 健康检查：`http://127.0.0.1:8866/health`
- 运行期 Agent WebSocket：`127.0.0.1:8865`
- 当前配置：`autoStart:true`

`start_preview` 与 `stop_preview` 由编辑器扩展直接完成。`preview_screenshot`、`preview_tap`、`preview_swipe`、`preview_type` 需要游戏运行期 Agent；本项目迁移阶段没有接入该 Agent。未明确要求截图或交互时，不调用这些工具。

## 常用工具

### 读取与校验

- `project_get_project_info {}`：第一步确认 `path` 为 `/Users/lizhongquan/GuardingTheTown`。
- `scene_get_current_scene {}`
- `scene_get_scene_list {}`
- `scene_get_scene_hierarchy {includeComponents?: boolean}`
- `node_find_nodes` / `node_find_node_by_name` / `node_get_node_info`
- `component_get_components` / `component_get_component_info`
- `project_find_asset_by_name`
- `project_query_asset_uuid {url}` / `project_query_asset_url {uuid}`
- `sceneAdvanced_query_scene_ready {}` / `sceneAdvanced_query_scene_dirty {}`

### 修改与同步

- `scene_open_scene {scenePath}`：默认传 `db://assets/scene/scene.scene`。
- `node_create_node`：始终提供 `parentUuid`。
- `node_set_node_transform`
- `node_set_node_property`
- `component_add_component` / `component_attach_script`
- `component_set_component_property`
- `project_reimport_asset {url}`
- `project_refresh_assets {folder?}`
- `sceneAdvanced_soft_reload_scene {}`
- `scene_save_scene {}`

先查看 live schema，再组织参数；不要混用绝对路径、`assets/...` 与 `db://assets/...`。

## 连接诊断

先做无副作用检查：

```bash
curl -sS --max-time 2 http://127.0.0.1:3100/health
curl -sS --max-time 2 http://127.0.0.1:8866/health
```

端点可用但会话没有工具时，检查 live 清单：

```bash
curl -sS -X POST http://127.0.0.1:3100/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Preview MCP 把端口换成 `8866`。如果清单存在但客户端工具缺失，确认项目可信、`.codex/config.toml` 已加载，然后重启 Codex 客户端或新建任务；MCP 工具通常在会话建立时发现。

服务不可达时：

1. 确认 Cocos Creator 打开的是 `/Users/lizhongquan/GuardingTheTown`。
2. 确认两个扩展已加载；必要时在扩展面板手动启动。
3. 检查对应 settings 文件和端口占用。
4. 编辑器 MCP 工具缺失时，检查 `settings/tool-manager.json` 是否过滤了工具。

不要把端口临时改回源项目的 `3000/8765/8766`；这会增加连接到 `cocos_sentence` 的风险。

## 常见故障

### 连到错误项目

立即停止所有写操作。调用 `project_get_project_info` 检查路径；关闭错误项目的 Creator 实例或修复目标端口配置后重新连接。不能仅凭场景名判断项目。

### `no preview connected`

Preview HTTP 服务可用不代表运行期 Agent 已连接。本项目默认未接入 Agent。用户明确要求截图或输入时，报告这个前置条件；没有额外授权时不要新增脚本或修改场景。

### 修改未出现在 Creator

- 对具体脚本或资源执行 `project_reimport_asset`。
- 新文件、新模块或目录变化时刷新所在目录。
- 重新查询 scene ready/dirty 状态，保存场景并按需 soft reload。
- 扩展源码变化后先 `npm run build`，再重载扩展。

### 工具返回成功但没有效果

- 检查内容中的 `success:false` 或 `error`。
- 重新查询节点、组件或资源验证后置条件。
- 切换或重载场景后重新获取 UUID。
