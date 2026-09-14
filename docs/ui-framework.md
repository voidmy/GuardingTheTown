# UI 框架

UI Prefab 放在 `assets/Resource/UI`。`assets/Resource` 配置为名称为 `Resource` 的 Asset Bundle，运行时通过 `assetManager.loadBundle('Resource')` 加载。

将 `UIFramework.prefab` 放在 Canvas 下，保持以下顺序：

```text
Canvas
└── UIFramework（UIManager）
    ├── WindowLayer（Widget + SafeArea）
    └── PopupLayer（全屏 Widget）
```

在 UIManager 的 Inspector 中分别绑定 `windowLayer` 和 `popupLayer`。WindowLayer 承载 HUD 和普通窗口，并按设备安全区域收缩；PopupLayer 在其上方显示，保留全屏范围以承载弹窗背景。弹窗内部需要避让刘海、底部指示条的内容，可在 Prefab 内单独设置 SafeArea。

业务组件通过 Inspector 引用场景中的 UIManager，再调用：

```ts
const window = await uiManager.openWindow('UI/MyWindow');
const popup = await uiManager.openPopup('UI/MyPopup');

uiManager.getWindow('UI/MyWindow');
uiManager.getPopup('UI/MyPopup');
uiManager.closeWindow('UI/MyWindow');
uiManager.closePopup('UI/MyPopup');
uiManager.closeAll();
```

路径相对 `assets/Resource`，不包含 `.prefab` 扩展名。`MyWindow` 和 `MyPopup` 是示例名称，需要先制作对应 Prefab；所有界面节点都来自 Prefab。

同一层、同一路径只保留一个实例；再次打开会激活并移到该层最上方。关闭会销毁实例，加载期间关闭或销毁管理器会取消打开并返回 `null`。资源或层级配置错误会使打开操作抛出异常，调用处应按业务需要捕获。

场景中预先摆放的 HUD 和升级面板由原业务组件控制，UIManager 的查询和关闭只处理通过其 `openWindow` / `openPopup` 打开的实例。框架只负责加载、分层和实例生命周期；界面数据、按钮行为及弹窗遮罩在业务脚本与 Prefab 中配置。
