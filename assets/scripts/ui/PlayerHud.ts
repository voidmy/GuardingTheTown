import { _decorator, Button, Color, Component, Game, game, Label, Node, Sprite, SpriteFrame } from 'cc';
import { DEBUG } from 'cc/env';
import { formatCombatNumber } from '../combat/CombatNumbers';
import { ProgressionUIController } from './ProgressionUI';
import {
    CharacterHealthSnapshot,
    CharacterStats,
} from '../player/CharacterStats';

const { ccclass, menu, property } = _decorator;
interface HudSkillSlot { icon: Sprite; name: Label; level: Label; badge: Label; empty: Node; key: string; }
const NORMAL_TEXT = new Color(255, 225, 143, 255);
const GOLD_TEXT = new Color(255, 190, 64, 255);

@ccclass('PlayerHud')
@menu('Gameplay/Player HUD')
export class PlayerHud extends Component {
    @property(Node)
    public characterNode: Node | null = null;

    @property(Sprite)
    public healthFill: Sprite | null = null;

    @property(Label)
    public healthLabel: Label | null = null;

    @property(SpriteFrame) public shootingIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public arrowIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public bladeIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public windIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public thunderIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public chainIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public frostIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public swordQiIcon: SpriteFrame | null = null;

    private readonly _slots: HudSkillSlot[] = [];
    private _icons: Array<SpriteFrame | null> = [];
    private _experienceFill: Sprite | null = null;
    private _levelLabel: Label | null = null;
    private _experienceLabel: Label | null = null;
    private _clockLabel: Label | null = null;
    private _killLabel: Label | null = null;
    private _slotCountLabel: Label | null = null;
    private _combatLabel: Label | null = null;
    private _shieldLabel: Label | null = null;

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
        if (this._fpsLabel) this._fpsLabel.node.active = DEBUG;
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
        if (!DEBUG || !this._fpsLabel) return;
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
        if (cheats) cheats.node.active = DEBUG;
        if (!this._progressionLabel || !this._evolutionButton || !cheats) return;
        const vitals = this.node.getChildByName('Vitals');
        const clock = this.node.getChildByName('BattleClock');
        const dock = this.node.getChildByName('SkillDock');
        this._levelLabel = vitals?.getChildByName('Level')?.getComponent(Label) ?? null;
        this._experienceLabel = vitals?.getChildByName('Experience')?.getComponent(Label) ?? null;
        this._shieldLabel = vitals?.getChildByName('Shield')?.getComponent(Label) ?? null;
        this._experienceFill = vitals?.getChildByName('ExperienceTrack')?.getChildByName('Fill')?.getComponent(Sprite) ?? null;
        this._clockLabel = clock?.getChildByName('Time')?.getComponent(Label) ?? null;
        this._killLabel = clock?.getChildByName('Kills')?.getComponent(Label) ?? null;
        this._slotCountLabel = dock?.getChildByName('SlotCount')?.getComponent(Label) ?? null;
        this._combatLabel = this.node.getChildByName('CombatNotice')?.getComponent(Label) ?? null;
        this._icons = [this.shootingIcon, this.arrowIcon, this.bladeIcon, this.windIcon,
            this.thunderIcon, this.chainIcon, this.frostIcon, this.swordQiIcon];
        for (let index = 1; index <= 3; index++) {
            const node = dock?.getChildByName(`Slot${index}`);
            const icon = node?.getChildByName('Icon')?.getComponent(Sprite);
            const name = node?.getChildByName('Name')?.getComponent(Label);
            const level = node?.getChildByName('Level')?.getComponent(Label);
            const badge = node?.getChildByName('Badge')?.getComponent(Label);
            const empty = node?.getChildByName('Empty');
            if (icon && name && level && badge && empty) this._slots.push({ icon, name, level, badge, empty, key: '' });
        }
        const details = this.node.getChildByName('DetailsButton')?.getComponent(Button);
        details?.node.on(Button.EventType.CLICK, () => {
            if (this._progressionLabel) this._progressionLabel.node.active = !this._progressionLabel.node.active;
        }, this);
        cheats.node.on(Button.EventType.CLICK,() => this._controller?.openCheats(),this);
        this._evolutionButton.node.on(Button.EventType.CLICK,() => this._controller?.openEvolution(),this);
        this._progressionBound = true;
    }

    private refreshProgression (): void {
        this.bindProgression();
        if (!this._controller || !this._progressionBound) return;
        const state = this._controller.getProgressionSnapshot();
        if (this._levelLabel) this._levelLabel.string = `Lv.${state.playerLevel}`;
        if (this._experienceLabel) this._experienceLabel.string = state.experienceToNext > 0
            ? `经验 ${state.experience} / ${state.experienceToNext}` : '本局等级已满';
        if (this._experienceFill) this._experienceFill.fillRange = state.experienceToNext > 0
            ? Math.max(0, Math.min(1, state.experience / state.experienceToNext)) : 1;
        const seconds = Math.max(0, Math.floor(state.elapsedSeconds));
        if (this._clockLabel) this._clockLabel.string = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        if (this._killLabel) this._killLabel.string = `击败 ${state.kills}`;
        if (this._slotCountLabel) this._slotCountLabel.string = state.skills.length > state.skillLimit
            ? `调试超额 · ${state.skills.length} 个技能` : `本局技能  ${state.skills.length} / ${state.skillLimit}`;
        if (this._combatLabel) this._combatLabel.string = state.combatStatus ?? '';
        // Keep the innate skill first, even after debug removals and re-acquisition.
        const ordered = state.skills.slice().sort((a, b) => Number(b.innate) - Number(a.innate));
        this._slots.forEach((slot, index) => {
            const skill = ordered[index];
            const key = skill ? `${skill.skill}:${skill.level}:${skill.damageRank}:${skill.evolved}:${skill.innate}:${skill.temporary}:${skill.research}` : 'empty';
            if (key === slot.key) return;
            slot.key = key;
            slot.empty.active = !skill;
            slot.icon.node.active = Boolean(skill);
            slot.badge.string = skill?.innate ? '本命' : skill?.temporary
                ? `本局领悟 · ${skill.research?.replace('研习 ', '') ?? ''}` : `副技能 ${index}`;
            slot.name.string = skill?.name ?? '空技能槽';
            slot.level.string = skill ? `Lv.${skill.level} · 伤${skill.damageRank}/3${skill.evolved ? ' · 进化' : ''}` : '升级或秘籍学习';
            slot.name.color = skill?.evolved ? GOLD_TEXT : NORMAL_TEXT;
            if (skill) {
                slot.icon.spriteFrame = this._icons[skill.skill] ?? null;
                slot.icon.node.setRotationFromEuler(0, 0, skill.skill === 4 ? 90 : 0);
                slot.icon.color = skill.skill === 4 ? new Color(255, 234, 160) : Color.WHITE;
            }
        });
        const skills = state.skills.map((skill) => `${skill.name} Lv.${skill.level}${skill.evolved ? '·进化' : ''}`
            + ` 伤害${skill.damageRank}/3（${formatCombatNumber(skill.damage)}）`
            + (skill.temporary ? `（本局领悟 · ${skill.research}）` : '')).join('  ');
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
            this.healthLabel.string = `${formatCombatNumber(Math.ceil(health.current))} / ${formatCombatNumber(Math.ceil(health.maximum))}`;
        }
        if (this._shieldLabel) this._shieldLabel.string = health.shield > 0 ? `护盾 +${formatCombatNumber(Math.ceil(health.shield))}` : '守镇者';
    }
}
