import {
    _decorator,
    Button,
    Component,
    Label,
    Node,
} from 'cc';

const { ccclass, menu } = _decorator;

export interface UpgradeOption {
    id: string;
    name: string;
    description: string;
}

export interface UpgradeSlotOptions {
    label: string;
    options: readonly UpgradeOption[];
}

const CARD_NODE_NAMES = ['CommonCard', 'RareCard', 'LegendaryCard'] as const;

export type UpgradeSelectedCallback = (optionId: string) => void;

@ccclass('UpgradeSelectionPanel')
@menu('Gameplay/Upgrade Selection Panel')
export class UpgradeSelectionPanel extends Component {
    private readonly _options: UpgradeOption[] = [];
    private readonly _slotPools: UpgradeOption[][] = [];
    private readonly _refreshUsed = [false, false, false];
    private readonly _slotLabels: Label[] = [];
    private readonly _nameLabels: Label[] = [];
    private readonly _descriptionLabels: Label[] = [];
    private readonly _refreshLabels: Label[] = [];
    private readonly _selectButtons: Button[] = [];
    private readonly _refreshButtons: Button[] = [];
    private _titleLabel: Label | null = null;
    private _onSelected: UpgradeSelectedCallback | null = null;
    private _bindingsReady = false;

    public get isShowing (): boolean {
        return this.node.active;
    }

    protected onLoad (): void {
        this.bindNodes();
    }

    public show (
        level: number,
        slots: readonly UpgradeSlotOptions[],
        onSelected: UpgradeSelectedCallback,
    ): boolean {
        this.node.active = true;
        if (!this.bindNodes()) {
            this.node.active = false;
            return false;
        }
        if (slots.length !== CARD_NODE_NAMES.length
            || slots.some((slot) => slot.options.length === 0)) {
            console.error('[UpgradeSelectionPanel] 每个升级卡槽都必须提供可选内容。');
            this.node.active = false;
            return false;
        }

        this._onSelected = onSelected;
        this._refreshUsed.fill(false);
        if (this._titleLabel) this._titleLabel.string = `等级提升 · Lv.${level}`;

        for (let index = 0; index < CARD_NODE_NAMES.length; index++) {
            this._slotPools[index] = [...slots[index].options];
            this._slotLabels[index].string = slots[index].label;
            this._options[index] = this.pickOption(index, null);
            this.renderOption(index);
        }
        for (let index = 0; index < CARD_NODE_NAMES.length; index++) {
            const canRefresh = this.hasAlternativeOption(index);
            this._refreshButtons[index].interactable = canRefresh;
            this._refreshLabels[index].string = canRefresh
                ? '刷新此项（1/1）'
                : '暂无其他选项';
        }
        return true;
    }

    public hide (): void {
        this.node.active = false;
        this._onSelected = null;
    }

    private bindNodes (): boolean {
        if (this._bindingsReady) return true;

        const titleLabel = this.node.getChildByName('Title')?.getComponent(Label) ?? null;
        const nameLabels: Label[] = [];
        const descriptionLabels: Label[] = [];
        const selectButtons: Button[] = [];
        const refreshButtons: Button[] = [];
        const refreshLabels: Label[] = [];
        const slotLabels: Label[] = [];

        for (let index = 0; index < CARD_NODE_NAMES.length; index++) {
            const card = this.node.getChildByName(CARD_NODE_NAMES[index]);
            const rarityLabel = card?.getChildByName('Rarity')?.getComponent(Label);
            const nameLabel = card?.getChildByName('Name')?.getComponent(Label);
            const descriptionLabel = card?.getChildByName('Description')?.getComponent(Label);
            const selectButton = card?.getComponent(Button) ?? null;
            const refreshButton = card?.getChildByName('RefreshButton')?.getComponent(Button);
            const refreshLabel = refreshButton?.node.getChildByName('Label')?.getComponent(Label);

            if (!card || !rarityLabel || !nameLabel || !descriptionLabel
                || !selectButton || !refreshButton || !refreshLabel) {
                console.error(`[UpgradeSelectionPanel] ${CARD_NODE_NAMES[index]} 配置不完整。`);
                this.enabled = false;
                return false;
            }

            selectButton.transition = Button.Transition.SCALE;
            selectButton.zoomScale = 0.98;
            nameLabels.push(nameLabel);
            descriptionLabels.push(descriptionLabel);
            selectButtons.push(selectButton);
            refreshButtons.push(refreshButton);
            refreshLabels.push(refreshLabel);
            slotLabels.push(rarityLabel);
        }

        this._titleLabel = titleLabel;
        this._nameLabels.push(...nameLabels);
        this._descriptionLabels.push(...descriptionLabels);
        this._selectButtons.push(...selectButtons);
        this._refreshButtons.push(...refreshButtons);
        this._refreshLabels.push(...refreshLabels);
        this._slotLabels.push(...slotLabels);

        for (let index = 0; index < CARD_NODE_NAMES.length; index++) {
            const selectButton = this._selectButtons[index];
            const refreshButton = this._refreshButtons[index];
            selectButton.node.on(Button.EventType.CLICK, () => {
                this.selectOption(index);
            }, this);
            refreshButton.node.on(Button.EventType.CLICK, () => {
                this.refreshOption(index);
            }, this);
            const stopCardSelection = (event: { propagationStopped: boolean }): void => {
                event.propagationStopped = true;
            };
            refreshButton.node.on(Node.EventType.TOUCH_START, stopCardSelection, this);
            refreshButton.node.on(Node.EventType.TOUCH_END, stopCardSelection, this);
            refreshButton.node.on(Node.EventType.TOUCH_CANCEL, stopCardSelection, this);
        }
        this._bindingsReady = true;
        return true;
    }

    private selectOption (index: number): void {
        const option = this._options[index];
        if (!this.node.active || !option) return;

        const callback = this._onSelected;
        this.hide();
        console.info(`[UpgradeSelectionPanel] 已选择升级：${option.name}`);
        callback?.(option.id);
    }

    private refreshOption (index: number): void {
        if (!this.node.active || this._refreshUsed[index]
            || !this.hasAlternativeOption(index)) return;

        const previousId = this._options[index]?.id ?? null;
        this._options[index] = this.pickOption(index, previousId);
        this._refreshUsed[index] = true;
        this._refreshButtons[index].interactable = false;
        this._refreshLabels[index].string = '本项已刷新';
        this.renderOption(index);
    }

    private renderOption (index: number): void {
        const option = this._options[index];
        if (!option) return;

        this._nameLabels[index].string = option.name;
        this._descriptionLabels[index].string = option.description;
    }

    private pickOption (slotIndex: number, excludedId: string | null): UpgradeOption {
        const pool = this._slotPools[slotIndex];
        const occupiedIds = new Set(
            this._options
                .filter((_option, index) => index !== slotIndex)
                .map((option) => option?.id)
                .filter((id): id is string => Boolean(id)),
        );
        let candidates = pool.filter((option) => option.id !== excludedId
            && !occupiedIds.has(option.id));
        if (candidates.length === 0) {
            candidates = pool.filter((option) => option.id !== excludedId);
        }
        if (candidates.length === 0) candidates = pool;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    private hasAlternativeOption (slotIndex: number): boolean {
        const currentId = this._options[slotIndex]?.id;
        return this._slotPools[slotIndex]?.some((option) => option.id !== currentId)
            ?? false;
    }
}
