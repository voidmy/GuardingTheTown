---
name: use-cocos-mcp
description: Use the GuardingTheTown project-local Cocos Creator MCP extensions to inspect or edit scenes, nodes, components, prefabs, and assets, synchronize the Asset DB, and control Preview when requested. Use for live Cocos Editor state or serialized scene/prefab work in this repository; do not use it to replace ordinary source-file edits.
---

# 使用 GuardingTheTown Cocos MCP

把项目里的两个扩展作为互补工具：

- `guarding_town_cocos`：读取和修改编辑器、场景、节点、组件、Prefab 与 Asset DB。
- `guarding_town_preview`：启停 in-editor Preview；截图和输入工具还需要游戏运行期 Agent。

客户端可能给工具加服务器命名空间。只按实际暴露的工具和 live schema 调用，不猜完整名称或参数。

## 先确认项目

1. 查看本会话实际暴露的 MCP 工具；工具缺失时读取 [references/tool-map.md](references/tool-map.md) 的连接诊断。
2. 第一次操作先调用 `project_get_project_info`，确认返回路径严格等于 `/Users/lizhongquan/GuardingTheTown`。路径不符时立即停止，不能操作另一个已打开的 Cocos 项目。
3. 操作场景前调用 `scene_get_current_scene`；默认场景是 `db://assets/scene/scene.scene`。再按需读取层级、节点 UUID、组件 `cid` 和资源 `db://` URL。
4. live `tools/list` 和当前 `extensions/*/source/` 高于扩展 README 或旧文档。

## 选择编辑方式

- `.ts`、JSON 和普通文本资源：直接编辑文件，然后对准确的 `db://assets/...` URL 执行 reimport；仅在需要时刷新目录。
- `.scene`、`.prefab`、`.meta` 及序列化组件属性：使用 MCP，不手改序列化 JSON。
- 稳定或复用的结构优先使用 Prefab。不要为了省事在运行时代码中创建本应序列化的 UI 或玩法层级。
- 未经明确要求，不新增或修改测试文件/测试类。

## 编辑器修改流程

1. 查询当前项目、场景、层级和目标对象，避免复用切换场景前的 UUID。
2. 执行最小范围修改。创建节点时提供 `parentUuid`；变换优先用 `node_set_node_transform`，其他节点属性用 `node_set_node_property`。
3. 写组件前调用 `component_get_components` 或 `component_get_component_info`；移除组件时使用查询得到的 `cid/type`。
4. 修改磁盘脚本或资源后调用 `project_reimport_asset`；只有目录级变化才调用 `project_refresh_assets`。
5. 必要时等待 scene ready 或执行 `sceneAdvanced_soft_reload_scene`，再重新查询目标。
6. 场景或 Prefab 修改后保存，并重新查询验证后置状态。不能只根据 HTTP 200 或 JSON-RPC 成功判断业务成功，还要检查内容中的 `success` 和 `error`。

高风险多步修改在工具可用时使用 undo recording；删除、覆盖、批量导入前先精确查询并确认受影响对象。

## Preview 边界

- 用户没有明确要求截图或画面交互时，不调用 `preview_screenshot`、`preview_tap`、`preview_swipe` 或 `preview_type`，也不为了截图向场景接入调试 Agent。
- 仅需运行验证时可以使用 `stop_preview`、打开准确场景、再 `start_preview`；不要自动截图。
- 用户明确要求截图或 Preview 交互时，先确认运行期 Agent 已连接。若返回 `no preview connected`，停止重复调用并报告缺失；没有单独授权时，不新增 Agent 脚本或修改场景挂载。
- 截图只能证明可见状态；非视觉行为仍需静态检查、日志或项目已有验证方式证明。

## 安全边界

- 不用 `debug_execute_script` 绕过已有专用工具，除非专用工具无法完成、内容已审查且任务明确需要。
- 不为普通场景任务修改 MCP 端口、工具过滤、扩展源码或编辑器偏好。
- 不读取 `library/`、Cocos Creator 安装目录或 Creator 框架源码来推断公开 API。
- 不把 `debug_get_console_logs` 当作 Preview 游戏日志。

## 维护扩展

只有任务明确要求修改 MCP 扩展时才编辑 `extensions/*/source/`。修改后运行对应扩展的 `npm run build`，再在 Creator 中重载扩展或重启编辑器。除非用户明确要求，不新增、修改或运行测试类。

需要端口、工具索引、连接诊断或常见故障时，读取 [references/tool-map.md](references/tool-map.md)。
