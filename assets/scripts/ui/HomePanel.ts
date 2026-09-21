import { _decorator, Button, Component, Label, Node } from 'cc';
import { CHARMS, CharmId } from '../progression/ExpeditionDefinitions';
import { MetaProgress } from '../progression/MetaProgress';

const { ccclass } = _decorator;
@ccclass('HomePanel')
export class HomePanel extends Component {
    private _begin: ((charm: CharmId | null) => void) | null = null;
    private _bound = false;
    private _starting = false;

    public configure (begin: (charm: CharmId | null) => void): void {
        this._begin = begin;
        if (!this._bound) {
            this._bound = true;
            for (const charm of CHARMS) this.button(`Card_${charm.id}/Action`, () => {
                const profile = MetaProgress.instance;
                if (profile.owns(charm.id)) {
                    this.notice(profile.equip(charm.id) ? `本局携带：${charm.name}` : profile.error);
                } else this.notice(profile.purchase(charm.id));
                this.refresh();
            });
            this.button('Unequip', () => {
                this.notice(MetaProgress.instance.equip(null) ? '本局不携带灵契。' : MetaProgress.instance.error);
                this.refresh();
            });
            this.button('Start', () => {
                if (this._starting || !this._begin) return;
                this._starting = true;
                this._begin(MetaProgress.instance.equipped);
            });
        }
        this.refresh();
    }

    private refresh (): void {
        const profile = MetaProgress.instance;
        this.label('Balance', `梦砂  ${profile.sand}`);
        const selected = CHARMS.find(charm => charm.id === profile.equipped);
        this.label('Selection', selected ? `本局携带：${selected.name}  ·  ${selected.description}` : '本局携带：未选择灵契，也可以直接出发');
        for (const charm of CHARMS) {
            const path = `Card_${charm.id}`;
            const owned = profile.owns(charm.id);
            const equipped = profile.equipped === charm.id;
            this.label(`${path}/State`, equipped ? '本局携带' : owned ? '已永久解锁' : `${charm.price} 梦砂 · 永久解锁`);
            this.label(`${path}/Action/Label`, equipped ? '已携带' : owned ? '携带灵契'
                : profile.sand >= charm.price ? `购买 · ${charm.price}` : `还差 ${charm.price - profile.sand} 梦砂`);
            const button = this.node.getChildByPath(`${path}/Action`)?.getComponent(Button);
            if (button) button.interactable = !equipped && !profile.error && (owned || profile.sand >= charm.price);
        }
        if (profile.error) this.notice(profile.error);
    }
    private button (path: string, action: () => void): void {
        this.node.getChildByPath(path)?.on(Button.EventType.CLICK, action, this);
    }
    private label (path: string, value: string): void {
        const label = this.node.getChildByPath(path)?.getComponent(Label);
        if (label) label.string = value;
    }
    private notice (text: string): void { this.label('Notice', text); }
}
