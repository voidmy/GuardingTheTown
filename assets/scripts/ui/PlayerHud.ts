import { _decorator, Button, Component, Game, game, Label, Node, Sprite } from 'cc';
import { ProgressionUIController } from './ProgressionUI';
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
    private _controller: ProgressionUIController | null = null;
    private _progressionLabel: Label | null = null;
    private _evolutionButton: Button | null = null;
    private _progressionBound = false;
    private _fpsLabel: Label | null = null;
    private _fpsFrames = 0;
    private _fpsSampleStartedAt = 0;

    public setController (controller: ProgressionUIController): void {
        this._controller = controller;
        this.bindProgression();
        this.refresh();
    }

    protected onEnable (): void {
        this._fpsLabel = this.node.getChildByName('FpsLabel')?.getComponent(Label) ?? null;
        this.resetFps();
        game.on(Game.EVENT_SHOW, this.resetFps, this);
        this.bindCharacter();
    }

    protected start (): void {
        this.refresh();
    }

    protected onDisable (): void {
        game.off(Game.EVENT_SHOW, this.resetFps, this);
        this.unbindCharacter();
    }

    protected update (): void {
        if (!this._fpsLabel) return;
        const now = Date.now();
        const elapsed = now - this._fpsSampleStartedAt;
        if (elapsed < 0) {
            this.resetFps();
            return;
        }
        this._fpsFrames += 1;
        if (elapsed < 500) return;
        this._fpsLabel.string = `FPS: ${Math.round(this._fpsFrames * 1000 / elapsed)}`;
        this._fpsFrames = 0;
        this._fpsSampleStartedAt = now;
    }

    private resetFps (): void {
        this._fpsFrames = 0;
        this._fpsSampleStartedAt = Date.now();
        if (this._fpsLabel) this._fpsLabel.string = 'FPS: --';
    }

    public refresh (): void {
        this.refreshProgression();
        if (!this._characterStats) this.bindCharacter();
        if (!this._characterStats) return;
        this.showHealth(this._characterStats.getHealthSnapshot());
    }

    private bindProgression (): void {
        if (this._progressionBound) return;
        this._progressionLabel = this.node.getChildByName('ProgressionLabel')?.getComponent(Label) ?? null;
        this._evolutionButton = this.node.getChildByName('EvolutionButton')?.getComponent(Button) ?? null;
        const cheats = this.node.getChildByName('CheatButton')?.getComponent(Button);
        if (!this._progressionLabel || !this._evolutionButton || !cheats) return;
        cheats.node.on(Button.EventType.CLICK,() => this._controller?.openCheats(),this);
        this._evolutionButton.node.on(Button.EventType.CLICK,() => this._controller?.openEvolution(),this);
        this._progressionBound = true;
    }

    private refreshProgression (): void {
        this.bindProgression();
        if (!this._controller || !this._progressionBound) return;
        const state = this._controller.getProgressionSnapshot();
        const skills = state.skills.map((skill) => `${skill.name} Lv.${skill.level}${skill.evolved ? '·进化' : ''}`).join('  ');
        const experience = state.experienceToNext > 0 ? `${state.experience}/${state.experienceToNext}` : '已满级';
        this._progressionLabel.string = `Lv.${state.playerLevel}  经验 ${experience}  刷新 ${state.refreshesRemaining}/3\n`
            + `${skills || '未获得技能'}\n核心：${state.cores.map((core) => core.name).join('、') || '未选择'}`
            + (state.combatStatus ? `\n${state.combatStatus}` : '');
        this._evolutionButton.node.active = state.evolutionAvailable && !state.evolutionUsed;
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
