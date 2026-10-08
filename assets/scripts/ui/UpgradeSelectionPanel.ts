import { _decorator, Button, Color, Component, Label, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import type { UpgradeOption } from '../progression/RunProgression';
import { UpgradeCardVfx } from './UpgradeCardVfx';
export type { UpgradeOption } from '../progression/RunProgression';
const { ccclass, menu, property } = _decorator;
export interface UpgradeSlotOptions { label: string; options: readonly UpgradeOption[]; }
export type UpgradeSelectedCallback = (optionId: string) => boolean;
export interface UpgradePanelConfig {
    kind?: 'ordinary' | 'core' | 'evolution'; title?: string;
    refreshesRemaining?: number; canRefresh?: boolean;
    onRefresh?: () => void; onDefer?: () => void; onContinue?: () => void;
}
const CARD_NAMES = ['CommonCard', 'RareCard', 'LegendaryCard', 'ExtraCard', 'FifthCard', 'SixthCard', 'SeventhCard', 'EighthCard'];
const TIER_COLORS = { common: new Color(155, 226, 207), rare: new Color(223, 177, 255), legendary: new Color(255, 215, 120) };
const TIER_NAMES = { common: '◆ 普通', rare: '◆ ◆ 稀有', legendary: '◆ ◆ ◆ 传说' };
interface CardBinding {
    node: Node; name: Label; description: Label; type: Label; button: Button;
    frame: Sprite; icon: Sprite; symbol: Label; category: Label; progress: Label; action: Label;
    opacity: UIOpacity; vfx: UpgradeCardVfx; baseScale: number;
}

@ccclass('UpgradeSelectionPanel')
@menu('Gameplay/Upgrade Selection Panel')
export class UpgradeSelectionPanel extends Component {
    @property(SpriteFrame) public commonFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public rareFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public legendaryFrame: SpriteFrame | null = null;
    @property(SpriteFrame) public shootingIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public arrowIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public bladeIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public windIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public thunderIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public chainIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public frostIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public swordQiIcon: SpriteFrame | null = null;
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
    protected onDisable (): void {
        this._revision++;
        this.stopAnimations();
    }

    public show (level: number, options: readonly UpgradeOption[], selected: UpgradeSelectedCallback,
        config: UpgradePanelConfig = {}): boolean {
        if (options.length > (config.kind === 'evolution' ? CARD_NAMES.length : 3)
            || new Set(options.map((option) => option.id)).size !== options.length) {
            console.error('[UpgradeSelectionPanel] 候选数量超限或存在重复项。');
            return false;
        }
        if (!this.bindNodes()) return false;
        this.stopAnimations();
        this._revision++; this._busy = false;
        this._options = options.map((option) => ({ ...option }));
        this._selected = selected; this._config = config; this.node.active = true;
        const kind = config.kind ?? 'ordinary';
        this._title.string = config.title ?? (kind === 'core' ? '选择流派核心'
            : kind === 'evolution' ? '选择本局唯一进化' : `等级突破 · Lv.${level}`);
        this._status.string = kind === 'evolution' ? '传说之力已觉醒 · 选择一项终极进化'
            : kind === 'core' ? '凝聚流派核心 · 本局不可替换'
                : '灵光乍现 · 选择一项强化，继续迎战';
        const icons = [this.shootingIcon, this.arrowIcon, this.bladeIcon, this.windIcon,
            this.thunderIcon, this.chainIcon, this.frostIcon, this.swordQiIcon];
        const multipleRows = options.length > 4;
        const availableWidth = (this.node.getComponent(UITransform)?.width ?? 2556) - 160;
        const columns = Math.min(4, options.length);
        const scale = Math.min(multipleRows ? 0.52 : 1, availableWidth / Math.max(500, columns * 560 - 60));
        this._cards.forEach((card,index) => {
            const option = this._options[index]; card.node.active = Boolean(option);
            card.button.interactable = Boolean(option);
            if (!option) return;
            const rarity = option.rarity ?? (kind === 'evolution' ? 'legendary' : kind === 'core' ? 'rare' : 'common');
            const color = TIER_COLORS[rarity];
            card.frame.spriteFrame = (rarity === 'legendary' ? this.legendaryFrame : rarity === 'rare' ? this.rareFrame : this.commonFrame) ?? card.frame.spriteFrame;
            card.type.string = TIER_NAMES[rarity]; card.type.color = color;
            card.name.string = option.name.replace(/^学习·/, '').replace(/ Lv\.\d+ → \d+$/, '');
            card.description.string = option.description;
            card.category.string = option.category ?? (kind === 'core' ? '流派核心' : kind === 'evolution' ? '终极进化' : '本局强化');
            card.category.color = color;
            card.progress.string = kind === 'evolution' ? '满级 → 觉醒'
                : option.damageRank ? `伤害 ${option.damageRank - 1} → ${option.damageRank} 阶 · 技能等级不变`
                : option.level ? option.level === 1 ? '全新技能 · Lv.1' : `Lv.${option.level - 1} → Lv.${option.level}`
                    : kind === 'core' ? '核心符文 · 永久生效于本局' : '即刻生效';
            card.progress.color = color;
            card.action.string = kind === 'evolution' ? '点击 · 觉醒' : '点击 · 领取'; card.action.color = color;
            const icon = option.skill !== undefined ? icons[option.skill] : null;
            card.icon.spriteFrame = icon; card.icon.node.active = Boolean(icon);
            card.symbol.node.active = !icon;
            card.symbol.string = kind === 'core' ? '契' : option.id === 'stat:damage' ? '攻'
                : option.id === 'stat:health' ? '御' : option.id === 'stat:heal' ? '生' : '升';
            card.symbol.color = color;
            const rowCount = multipleRows ? Math.min(4, options.length - Math.floor(index / 4) * 4) : options.length;
            const x = ((index % 4) - (rowCount - 1) / 2) * 560 * scale;
            const y = multipleRows ? 168 - Math.floor(index / 4) * 414 : -35;
            card.baseScale = scale;
            card.node.setScale(scale * 0.92, scale * 0.92, 1);
            card.node.setPosition(x, y - 28, 0);
            card.opacity.opacity = 0;
            const delay = index * 0.065;
            tween(card.node).delay(delay).to(0.3, { position: new Vec3(x, y, 0), scale: new Vec3(scale, scale, 1) }, { easing: 'backOut' }).start();
            tween(card.opacity).delay(delay).to(0.2, { opacity: 255 }).start();
            card.vfx.play(rarity, delay, multipleRows);
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
        this.stopAnimations();
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
                type:node?.getChildByName('Rarity')?.getComponent(Label),button:node?.getComponent(Button),
                frame:node?.getComponent(Sprite), icon:node?.getChildByName('Icon')?.getComponent(Sprite),
                symbol:node?.getChildByName('Symbol')?.getComponent(Label),
                category:node?.getChildByName('Category')?.getComponent(Label),
                progress:node?.getChildByName('Progress')?.getComponent(Label),
                action:node?.getChildByName('Action')?.getComponent(Label),
                opacity:node?.getComponent(UIOpacity), vfx:node?.getComponent(UpgradeCardVfx), baseScale:1 };
        });
        if (bindings.some((item) => !item.node || !item.name || !item.description || !item.type || !item.button
            || !item.frame || !item.icon || !item.symbol || !item.category || !item.progress || !item.action || !item.opacity || !item.vfx)) return false;
        this._cards = bindings;
        bindings.forEach((card,index) => card.node.on(Button.EventType.CLICK,() => this.select(index),this));
        this._refresh.node.on(Button.EventType.CLICK,() => {
            if (this._busy || !this._refresh.interactable) return;
            this._refresh.interactable = false; this._config.onRefresh?.();
        },this);
        this._defer.node.on(Button.EventType.CLICK,() => {if (!this._busy) this._config.onDefer?.();},this);
        this._continue.node.on(Button.EventType.CLICK,() => { if (!this._busy) this._config.onContinue?.(); },this);
        this._bound = true; return true;
    }
    private select (index: number): void {
        const option = this._options[index];
        if (!this.node.active || this._busy || !option || !this._selected) return;
        this._busy = true; const revision = this._revision;
        const card = this._cards[index];
        for (const item of this._cards) {
            Tween.stopAllByTarget(item.node); Tween.stopAllByTarget(item.opacity);
            item.button.interactable = false;
            tween(item.opacity).to(0.12, { opacity: item === card ? 255 : 85 }).start();
        }
        card.vfx.celebrate();
        this._status.string = `已选择 · ${option.name}`;
        tween(card.node).to(0.16, { scale: new Vec3(card.baseScale * 1.045, card.baseScale * 1.045, 1) }, { easing: 'quadOut' })
            .call(() => { if (revision === this._revision && this.node.active) this.applySelection(option.id, revision); }).start();
    }
    private applySelection (id: string, revision: number): void {
        try {
            const applied = this._selected?.(id);
            if (revision !== this._revision) return;
            if (applied) this.hide();
            else this.restoreSelection('此项暂时无法应用，请重试或刷新');
        } catch (error) {
            if (revision === this._revision) this.restoreSelection('升级未应用，请重试');
            console.error('[UpgradeSelectionPanel] 升级应用失败。',error);
        }
    }
    private restoreSelection (message: string): void {
        this._busy = false; this._status.string = message;
        for (const card of this._cards) {
            Tween.stopAllByTarget(card.node); Tween.stopAllByTarget(card.opacity);
            card.opacity.opacity = 255;
            card.node.setScale(card.baseScale, card.baseScale, 1);
            card.button.interactable = card.node.active;
        }
    }
    private stopAnimations (): void {
        for (const card of this._cards) {
            Tween.stopAllByTarget(card.node); Tween.stopAllByTarget(card.opacity); card.vfx.stop();
        }
    }
}
