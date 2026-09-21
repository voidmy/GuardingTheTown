import { _decorator, Button, Color, Component, Label, Node, Sprite } from 'cc';
import { CHARMS, CharmId, POTIONS, PotionId } from '../progression/ExpeditionDefinitions';

const { ccclass } = _decorator;
@ccclass('ExpeditionHud')
export class ExpeditionHud extends Component {
    private _slots: Node[] = [];
    private _keys: string[] = [];
    private _bound = false;
    public configure (openPotion: (index: number) => void, goHome: () => void): void {
        if (this._bound) return;
        this._bound = true;
        for (let index = 0; index < 3; index++) {
            const slot = this.node.getChildByPath(`Dock/Slot${index + 1}`)!;
            this._slots.push(slot);
            slot.on(Button.EventType.CLICK, () => openPotion(index), this);
        }
        this.node.getChildByName('Home')?.on(Button.EventType.CLICK, goHome, this);
    }
    public refresh (slots: readonly (PotionId | null)[], charm: CharmId | null, sand: number, gap: number, ended: boolean): void {
        const currency = this.node.getChildByName('Sand')?.getComponent(Label);
        if (currency) currency.string = `本局梦砂 +${sand}`;
        const equipped = this.node.getChildByName('Charm')?.getComponent(Label);
        if (equipped) equipped.string = CHARMS.find(item => item.id === charm)?.name ?? '未携带灵契';
        const status = this.node.getChildByPath('Dock/Status')?.getComponent(Label);
        if (status) status.string = ended ? '本局结束 · 返回小院' : gap > 0 ? `药水间隔 ${gap.toFixed(1)}秒` : '药水 · 点击使用 / 丢弃';
        this._slots.forEach((slot, index) => {
            slot.active = index < slots.length;
            const id = slots[index];
            const key = id ?? 'empty';
            if (this._keys[index] === key) return;
            this._keys[index] = key;
            const name = slot.getChildByName('Name')?.getComponent(Label);
            const icon = slot.getChildByName('Icon')?.getComponent(Sprite);
            if (name) name.string = id ? POTIONS[id].name : '等待掉落';
            if (icon) {
                icon.node.active = !!id;
                if (id) { const color = POTIONS[id].color; icon.color = new Color(color[0], color[1], color[2]); }
            }
        });
    }
}
