import { _decorator, Button, Component, Label } from 'cc';

const { ccclass } = _decorator;
@ccclass('PotionMenu')
export class PotionMenu extends Component {
    private _bound = false;
    private _use: (() => string) | null = null;
    private _discard: (() => void) | null = null;
    private _cancel: (() => void) | null = null;
    public show (title: string, description: string, use: () => string, discard: (() => void) | null, cancel: () => void): void {
        this._use = use; this._discard = discard; this._cancel = cancel;
        if (!this._bound) {
            this._bound = true;
            this.node.getChildByPath('Panel/Use')?.on(Button.EventType.CLICK, () => {
                const message = this._use?.();
                if (message) this.label('Status', message);
            }, this);
            this.node.getChildByPath('Panel/Discard')?.on(Button.EventType.CLICK, () => this._discard?.(), this);
            this.node.getChildByPath('Panel/Cancel')?.on(Button.EventType.CLICK, () => this._cancel?.(), this);
        }
        this.label('Title', title); this.label('Description', description); this.label('Status', '');
        this.label('Use/Label', discard ? '使用' : '结束本局');
        this.label('Cancel/Label', discard ? '取消' : '继续守镇');
        this.node.getChildByPath('Panel/Discard')!.active = !!discard;
        this.node.active = true;
    }
    public hide (): void {
        this.node.active = false;
        this._use = null; this._discard = null; this._cancel = null;
    }
    private label (path: string, text: string): void {
        const label = this.node.getChildByPath(`Panel/${path}`)?.getComponent(Label);
        if (label) label.string = text;
    }
}
