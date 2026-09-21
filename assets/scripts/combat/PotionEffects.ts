import { instantiate, Node, Prefab, UIOpacity, UITransform } from 'cc';
import { AbilityFrameContext, createCombatActionId, EnemyCombatWorld, EnemyId } from './CombatTypes';
import { TornadoAbility } from './TornadoAbility';
import { CharacterStats } from '../player/CharacterStats';
import { PotionId } from '../progression/ExpeditionDefinitions';
import { EarthRiftFeedback, EarthRiftPotion } from './EarthRiftPotion';
import { RainFeedback, RainPotion } from './RainPotion';

/** Bounded effects; one reusable visual per potion type per run. */
export class PotionEffects {
    private readonly _wind: TornadoAbility;
    private readonly _frost: Node;
    private readonly _opacity: UIOpacity | null;
    private readonly _results: EnemyId[] = [];
    private _frostLife = 0;
    private readonly _frostScale: number;
    private readonly _rift: EarthRiftPotion | null;
    private readonly _rain: RainPotion | null;
    public constructor (private readonly _world: EnemyCombatWorld, windPrefab: Prefab, frostPrefab: Prefab,
        parent: Node, ground: Node, private readonly _stats: CharacterStats, private readonly _attack: () => number,
        private readonly _frostSound: () => void, earthRiftPrefab: Prefab | null = null,
        riftFeedback: EarthRiftFeedback = {}, rainPrefab: Prefab | null = null,
        rainParent: Node = parent, rainFeedback: RainFeedback = {}) {
        this._rift = earthRiftPrefab ? new EarthRiftPotion(_world, earthRiftPrefab, ground, riftFeedback) : null;
        this._rain = rainPrefab ? new RainPotion(_world, rainPrefab, rainParent, ground, _attack, rainFeedback) : null;
        this._wind = new TornadoAbility(_world, { prefab: windPrefab, visualParent: parent, manual: true,
            sourceAbilityId: 'potion-storm', spawnInterval: 1, duration: 5, pullRadius: 260, damageRadius: 110,
            pullSpeed: 190, pullStopRadius: 28, spawnDistance: 340, playerSafetyRadius: 108,
            maxActiveCount: 1, rotationSpeed: 150, damageInterval: 0.5, damage: 2, getAttackPower: _attack });
        this._frost = instantiate(frostPrefab);
        this._frost.setParent(ground);
        this._frost.active = false;
        this._opacity = this._frost.getComponent(UIOpacity);
        this._frostScale = 640 / Math.max(1, this._frost.getComponent(UITransform)?.width ?? 256);
    }
    public use (id: PotionId, context: AbilityFrameContext): string {
        if (!this._stats.isAlive) return '本局已结束。';
        if (id === 'healing') {
            return this._stats.heal(this._stats.maximumHealth * 0.3) > 0 ? '' : '生命已满，可以保留或丢弃这瓶药水。';
        }
        if (id === 'storm') {
            if (this._wind.isActive) return '龙卷风仍在持续，请稍后再用。';
            return this._wind.cast(context) ? '' : '附近没有适合释放龙卷风的位置。';
        }
        if (id === 'earth-rift') return this._rift?.cast(context) ?? '地裂特效尚未配置。';
        if (id === 'rain') return this._rain?.cast() ?? '降雨特效尚未配置。';
        this._world.queryEnemiesInCircle(context.originX, context.originY, 320, this._results, true);
        const actionId = createCombatActionId();
        const damage = 2 * this._attack();
        for (const enemy of this._results) {
            this._world.applyFrost?.(enemy, 1.5, 2, 0.55);
            this._world.applyDamage(enemy, { amount: damage, sourceAbilityId: 'potion-frost', actionId, isPrimaryAttack: false });
        }
        this._frost.setPosition(context.originX, context.originY, 0);
        this._frost.active = true;
        this._frostLife = 0.55;
        this._frost.setScale(this._frostScale * 0.3, this._frostScale * 0.3, 1);
        if (this._opacity) this._opacity.opacity = 255;
        this._frostSound();
        return '';
    }
    public advance (dt: number, context: AbilityFrameContext): void {
        this._wind.updateAbility(dt, context);
        this._rift?.advance(dt);
        this._rain?.advance(dt);
        if (this._frostLife <= 0) return;
        this._frostLife = Math.max(0, this._frostLife - dt);
        const scale = this._frostScale * (0.3 + 0.7 * Math.min(1, (0.55 - this._frostLife) / 0.25));
        this._frost.setScale(scale, scale, 1);
        if (this._opacity) this._opacity.opacity = Math.round(255 * Math.min(1, this._frostLife / 0.2));
        this._frost.active = this._frostLife > 0;
    }
    public setPaused (paused: boolean): void { this._rain?.setPaused(paused); }
    public stopRain (): void { this._rain?.stop(); }
    public destroy (): void { this._wind.destroyAbility(); this._frost.destroy(); this._rift?.destroy(); this._rain?.destroy(); }
}
