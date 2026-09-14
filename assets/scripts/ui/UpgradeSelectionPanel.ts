import { _decorator, Button, Component, Label, Node } from 'cc';
const { ccclass, menu } = _decorator;
export interface UpgradeOption { id: string; name: string; description: string; }
export interface UpgradeSlotOptions { label: string; options: readonly UpgradeOption[]; }
export type UpgradeSelectedCallback = (optionId: string) => boolean;
export interface UpgradePanelConfig {
    kind?: 'ordinary' | 'core' | 'evolution'; title?: string;
    refreshesRemaining?: number; canRefresh?: boolean;
    onRefresh?: () => void; onDefer?: () => void; onContinue?: () => void;
}
const CARD_NAMES = ['CommonCard', 'RareCard', 'LegendaryCard', 'ExtraCard'];
interface CardBinding { node: Node; name: Label; description: Label; type: Label; button: Button; }

@ccclass('UpgradeSelectionPanel')
@menu('Gameplay/Upgrade Selection Panel')
export class UpgradeSelectionPanel extends Component {
    private _options: readonly UpgradeOption[] = [];
    private _selected: UpgradeSelectedCallback | null = null;
    private _config: UpgradePanelConfig = {};
    private _cards: CardBinding[] = [];
    private _title: Label | null = null;
    private _status: Label | null = null;
    private _refresh: Button | null = null;
    private _refreshLabel: Label | null = null;
    private _defer: Button | null = null;
    private _continue: Button | null = null;
    private _bound = false;
    private _busy = false;
    private _revision = 0;
    public get isShowing (): boolean { return this.node.active; }
    protected onLoad (): void { this.bindNodes(); }

    public show (level: number, options: readonly UpgradeOption[], selected: UpgradeSelectedCallback,
        config: UpgradePanelConfig = {}): boolean {
        if (options.length > (config.kind === 'evolution' ? 4 : 3)
            || new Set(options.map((option) => option.id)).size !== options.length) {
            console.error('[UpgradeSelectionPanel] 候选数量超限或存在重复项。');
            return false;
        }
        if (!this.bindNodes()) return false;
        this._revision++; this._busy = false;
        this._options = options.map((option) => ({ ...option }));
        this._selected = selected; this._config = config; this.node.active = true;
        const kind = config.kind ?? 'ordinary';
        this._title.string = config.title ?? (kind === 'core' ? '选择流派核心'
            : kind === 'evolution' ? '选择本局唯一进化' : `等级提升 · Lv.${level}`);
        this._status.string = kind === 'evolution' ? '满级技能 + 精英资格 · 替换原槽 · 每局一次'
            : kind === 'core' ? '本局不可替换 · 普通与核心共用刷新次数'
                : '三个技能槽 · 每个技能五级 · 选择一项立即生效';
        this._cards.forEach((card,index) => {
            const option = this._options[index]; card.node.active = Boolean(option);
            card.button.interactable = Boolean(option);
            if (!option) return;
            card.name.string = option.name; card.description.string = option.description;
            card.type.string = kind === 'core' ? '流派核心' : kind === 'evolution' ? '技能进化' : '普通升级';
            const p = card.node.position;
            card.node.setPosition((index - (options.length - 1) / 2) * 560,p.y,p.z);
        });
        const remaining = Math.max(0,config.refreshesRemaining ?? 0);
        this._refresh.node.active = kind !== 'evolution' && options.length > 0;
        this._refresh.interactable = remaining > 0 && Boolean(config.canRefresh && config.onRefresh);
        this._refreshLabel.string = this._refresh.interactable ? `刷新整组（剩余 ${remaining} 次）`
            : remaining === 0 ? '本局刷新已用完' : '没有其他有效组合';
        this._defer.node.active = kind === 'evolution' && Boolean(config.onDefer);
        this._continue.node.active = options.length === 0 && Boolean(config.onContinue);
        if (options.length === 0) this._status.string = '强化已满，继续战斗';
        return true;
    }
    public hide (): void {
        this._revision++; this.node.active = false; this._selected = null; this._config = {}; this._busy = false;
    }
    private bindNodes (): boolean {
        if (this._bound) return true;
        this._title = this.node.getChildByName('Title')?.getComponent(Label) ?? null;
        this._status = this.node.getChildByName('Status')?.getComponent(Label) ?? null;
        this._refresh = this.node.getChildByName('RefreshButton')?.getComponent(Button) ?? null;
        this._refreshLabel = this._refresh?.node.getChildByName('Label')?.getComponent(Label) ?? null;
        this._defer = this.node.getChildByName('DeferButton')?.getComponent(Button) ?? null;
        this._continue = this.node.getChildByName('ContinueButton')?.getComponent(Button) ?? null;
        if (!this._title || !this._status || !this._refresh || !this._refreshLabel || !this._defer || !this._continue) return false;
        const bindings = CARD_NAMES.map((name) => {
            const node = this.node.getChildByName(name);
            return { node,name:node?.getChildByName('Name')?.getComponent(Label),
                description:node?.getChildByName('Description')?.getComponent(Label),
                type:node?.getChildByName('Rarity')?.getComponent(Label),button:node?.getComponent(Button) };
        });
        if (bindings.some((item) => !item.node || !item.name || !item.description || !item.type || !item.button)) return false;
        this._cards = bindings;
        bindings.forEach((card,index) => card.node.on(Button.EventType.CLICK,() => this.select(index),this));
        this._refresh.node.on(Button.EventType.CLICK,() => {
            if (this._busy || !this._refresh.interactable) return;
            this._refresh.interactable = false; this._config.onRefresh?.();
        },this);
        this._defer.node.on(Button.EventType.CLICK,() => {if (!this._busy) this._config.onDefer?.();},this);
        this._continue.node.on(Button.EventType.CLICK,() => this._config.onContinue?.(),this);
        this._bound = true; return true;
    }
    private select (index: number): void {
        const option = this._options[index];
        if (!this.node.active || this._busy || !option || !this._selected) return;
        this._busy = true; const revision = this._revision;
        try {
            const applied = this._selected(option.id);
            if (revision !== this._revision) return;
            if (applied) this.hide();
            else {this._busy = false;this._status.string = '此项暂时无法应用，请重试或刷新';}
        } catch (error) {
            if (revision === this._revision) {this._busy = false;this._status.string = '升级未应用，请重试';}
            console.error('[UpgradeSelectionPanel] 升级应用失败。',error);
        }
    }
}
