import { _decorator, Component, Label, Node, Sprite } from 'cc';
import {
    CharacterHealthSnapshot,
    CharacterStats,
} from '../player/CharacterStats';

const { ccclass, menu, property } = _decorator;

@ccclass('PlayerHud')
@menu('Gameplay/Player HUD')
export class PlayerHud extends Component {
    @property(Node)
    public characterNode: Node | null = null;

    @property(Sprite)
    public healthFill: Sprite | null = null;

    @property(Label)
    public healthLabel: Label | null = null;

    private _characterStats: CharacterStats | null = null;

    protected onEnable (): void {
        this.bindCharacter();
    }

    protected start (): void {
        this.refresh();
    }

    protected onDisable (): void {
        this.unbindCharacter();
    }

    public refresh (): void {
        if (!this._characterStats) this.bindCharacter();
        if (!this._characterStats) return;
        this.showHealth(this._characterStats.getHealthSnapshot());
    }

    private bindCharacter (): void {
        this.unbindCharacter();
        this._characterStats = this.characterNode?.getComponent(CharacterStats) ?? null;
        if (!this._characterStats) {
            console.warn('[PlayerHud] CharacterStats is not assigned.');
            return;
        }

        this._characterStats.node.on(
            CharacterStats.Event.HealthChanged,
            this.showHealth,
            this,
        );
        this.showHealth(this._characterStats.getHealthSnapshot());
    }

    private unbindCharacter (): void {
        this._characterStats?.node.off(
            CharacterStats.Event.HealthChanged,
            this.showHealth,
            this,
        );
        this._characterStats = null;
    }

    private showHealth (health: CharacterHealthSnapshot): void {
        if (this.healthFill) {
            this.healthFill.fillRange = Math.max(0, Math.min(1, health.ratio));
        }
        if (this.healthLabel) {
            this.healthLabel.string = `${Math.ceil(health.current)} / ${Math.ceil(health.maximum)}`;
        }
    }
}
