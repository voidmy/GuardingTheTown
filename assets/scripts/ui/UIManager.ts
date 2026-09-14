import {
    _decorator,
    AssetManager,
    assetManager,
    Component,
    instantiate,
    isValid,
    Node,
    Prefab,
} from 'cc';

const { ccclass, menu, property } = _decorator;

type UILayer = 'window' | 'popup';

interface UIEntry {
    node: Node | null;
    loading: Promise<Node | null> | null;
}

/** 两层 UI 入口；界面和层级节点均由 Prefab 配置。 */
@ccclass('UIManager')
@menu('UI/UI Manager')
export class UIManager extends Component {
    @property(Node)
    public windowLayer: Node | null = null;

    @property(Node)
    public popupLayer: Node | null = null;

    private readonly _entries = new Map<string, UIEntry>();
    private _bundleLoading: Promise<AssetManager.Bundle> | null = null;
    private _destroyed = false;

    /** path 为 Resource Bundle 内的相对路径，不含扩展名，例如 UI/PlayerHud。 */
    public openWindow (path: string): Promise<Node | null> {
        return this.open('window', path);
    }

    public openPopup (path: string): Promise<Node | null> {
        return this.open('popup', path);
    }

    public getWindow (path: string): Node | null {
        return this.get('window', path);
    }

    public getPopup (path: string): Node | null {
        return this.get('popup', path);
    }

    public closeWindow (path: string): void {
        this.close('window', path);
    }

    public closePopup (path: string): void {
        this.close('popup', path);
    }

    public closeAll (): void {
        for (const entry of this._entries.values()) {
            if (isValid(entry.node, true)) entry.node.destroy();
        }
        this._entries.clear();
    }

    protected onDestroy (): void {
        this._destroyed = true;
        this.closeAll();
    }

    private open (layerName: UILayer, path: string): Promise<Node | null> {
        if (this._destroyed || !isValid(this, true)) return Promise.resolve(null);

        const layer = layerName === 'window' ? this.windowLayer : this.popupLayer;
        if (!path || !isValid(layer, true)) {
            return Promise.reject(new Error(`[UIManager] ${layerName} 层或 Prefab 路径未配置。`));
        }

        const existing = this.get(layerName, path);
        if (existing) {
            existing.active = true;
            existing.setSiblingIndex(layer.children.length - 1);
            return Promise.resolve(existing);
        }

        const key = `${layerName}:${path}`;
        const pending = this._entries.get(key)?.loading;
        if (pending) return pending;

        const entry: UIEntry = { node: null, loading: null };
        this._entries.set(key, entry);
        entry.loading = this.loadPrefab(path).then((prefab) => {
            entry.loading = null;
            // 关闭或销毁发生在加载期间时，不再创建界面。
            if (this._destroyed || !isValid(this, true) || !isValid(layer, true)
                || this._entries.get(key) !== entry) {
                if (this._entries.get(key) === entry) this._entries.delete(key);
                return null;
            }
            const node = instantiate(prefab);
            entry.node = node;
            node.parent = layer;
            node.active = true;
            return node;
        }).catch((error) => {
            entry.loading = null;
            if (this._entries.get(key) !== entry || this._destroyed) return null;
            if (isValid(entry.node, true)) entry.node.destroy();
            this._entries.delete(key);
            throw error;
        });
        return entry.loading;
    }

    private loadPrefab (path: string): Promise<Prefab> {
        const loadedBundle = assetManager.getBundle('Resource');
        if (!loadedBundle && !this._bundleLoading) {
            this._bundleLoading = new Promise<AssetManager.Bundle>((resolve, reject) => {
                assetManager.loadBundle('Resource', (error, bundle) => {
                    if (error) reject(error);
                    else resolve(bundle);
                });
            }).then((bundle) => {
                this._bundleLoading = null;
                return bundle;
            }, (error) => {
                this._bundleLoading = null;
                throw error;
            });
        }
        const bundleReady = loadedBundle ? Promise.resolve(loadedBundle) : this._bundleLoading;
        return bundleReady.then((bundle) => new Promise<Prefab>((resolve, reject) => {
            bundle.load(path, Prefab, (error, prefab) => {
                if (error) reject(error);
                else resolve(prefab);
            });
        }));
    }

    private get (layer: UILayer, path: string): Node | null {
        const key = `${layer}:${path}`;
        const entry = this._entries.get(key);
        if (!entry?.node) return null;
        if (isValid(entry.node, true)) return entry.node;
        this._entries.delete(key);
        return null;
    }

    private close (layer: UILayer, path: string): void {
        const key = `${layer}:${path}`;
        const entry = this._entries.get(key);
        this._entries.delete(key);
        if (isValid(entry?.node, true)) entry.node.destroy();
    }
}
