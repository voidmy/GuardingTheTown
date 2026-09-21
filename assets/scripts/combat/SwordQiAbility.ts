import { instantiate, Node, Prefab, UIOpacity, Vec2 } from 'cc';
import { Ability, AbilityFrameContext, createCombatActionId, DamageInfo, EnemyCombatWorld, EnemyId } from './CombatTypes';

export interface SwordQiAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    level: number;
    evolved: boolean;
    cooldownMultiplier?: number;
    getAttackPower: () => number;
    random?: () => number;
}

interface SwingState {
    node: Node;
    opacity: UIOpacity | null;
    blade: Node | null;
    trail: Node | null;
    flare: Node | null;
    flareOpacity: UIOpacity | null;
    readonly mirror: number;
    readonly launchTime: number;
    readonly hitEnemies: Set<EnemyId>;
    readonly damage: DamageInfo;
    radius: number;
    startX: number;
    startY: number;
    lastQueryX: number;
    lastQueryY: number;
    nextQueryAge: number;
    launched: boolean;
    complete: boolean;
}

const BASE_DAMAGE = [0, 2, 2.6, 2.6, 3.4, 4.2];
const BASE_COOLDOWN = [0, 3, 2.6, 2.6, 2.2, 1.8];
const DOUBLE_STRIKE_CHANCE = [0, 0, 0, 0.2, 0.3, 0.4];
const LAUNCH_TIMES = [0, 0.22, 0.30, 0.52];
const FLIGHT_SPEED = 720;
const QUERY_INTERVAL = 1 / 30;

/** Two pooled authored volleys; each travelling slash can damage each enemy once. */
export class SwordQiAbility implements Ability {
    public readonly id = 'sword-qi';
    private readonly _visuals: Node[] = [];
    private readonly _swings: SwingState[] = [];
    private readonly _position = new Vec2();
    private readonly _results: EnemyId[] = [];
    private _cooldown = 0.35;
    private _time = -1;
    private _volleyDuration = 0;
    private _flightDuration = 0.5;
    private _directionX = 1;
    private _directionY = 0;
    private _angle = 0;
    private _destroyed = false;

    constructor (private readonly _world: EnemyCombatWorld, private readonly _options: SwordQiAbilityOptions) {
        // Both copies and their hit/damage storage are acquired once, never during combat updates.
        for (let volley = 0; volley < 2; volley++) {
            const visual = instantiate(_options.prefab);
            visual.setParent(_options.visualParent);
            visual.active = false;
            this._visuals.push(visual);
            for (let index = 0; index < 2; index++) {
                const name = index === 0 ? 'SwingA' : 'SwingB';
                const node = visual.getChildByName(name);
                if (!node) {
                    this.destroyAbility();
                    throw new Error(`[SwordQiAbility] Missing authored swing: ${name}`);
                }
                const flare = node.getChildByName('Flare');
                this._swings.push({ node, opacity: node.getComponent(UIOpacity),
                    blade: node.getChildByName('Blade'), trail: node.getChildByName('Trail'),
                    flare, flareOpacity: flare?.getComponent(UIOpacity) ?? null,
                    mirror: index === 0 ? 1 : -1, launchTime: LAUNCH_TIMES[volley * 2 + index],
                    hitEnemies: new Set<EnemyId>(),
                    damage: { amount: 0, sourceAbilityId: this.id, actionId: 0,
                        isPrimaryAttack: true, targetIndex: 0 },
                    radius: 0, startX: 0, startY: 0, lastQueryX: 0, lastQueryY: 0,
                    nextQueryAge: 0, launched: false, complete: true });
                node.active = false;
            }
        }
    }

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        // A zero combat delta is a pause, including already scheduled bonus slashes.
        if (this._destroyed || !Number.isFinite(dt) || dt <= 0) return;
        this._cooldown = Math.max(0, this._cooldown - dt);
        if (this._time >= 0) {
            this._time += dt;
            this.advanceSwings();
            if (this._destroyed) return;
            if (this._time >= this._volleyDuration) {
                this._time = -1;
                for (let index = 0; index < this._visuals.length; index++) {
                    this._visuals[index].active = false;
                }
            }
            return;
        }
        if (this._cooldown > 0) return;
        this._cooldown = 0.2;
        if (!this._world.hasEnemies) return;

        const level = Math.max(1, Math.min(5, this._options.level | 0));
        const evolved = this._options.evolved;
        const radius = evolved ? 235 : level >= 3 ? 205 : 170;
        const flightDistance = evolved ? 440 : 360;
        const target = this._world.findNearestEnemy(context.originX, context.originY,
            flightDistance + radius, true);
        if (target === null || !this._world.getEnemyPosition(target, this._position)) return;
        const dx = this._position.x - context.originX;
        const dy = this._position.y - context.originY;
        const distance = Math.hypot(dx, dy);
        const facingLength = Math.hypot(context.facingX, context.facingY);
        this._directionX = distance > 0.001 ? dx / distance : facingLength > 0 ? context.facingX / facingLength : 1;
        this._directionY = distance > 0.001 ? dy / distance : facingLength > 0 ? context.facingY / facingLength : 0;
        this._angle = Math.atan2(this._directionY, this._directionX) * 180 / Math.PI;

        // Snapshot the complete cast, including the one bonus roll. Upgrades affect the next cast.
        const damage = BASE_DAMAGE[level] * (evolved ? 1.35 : 1)
            * Math.max(0, this._options.getAttackPower());
        const doubleStrikeChance = evolved ? 0.6 : DOUBLE_STRIKE_CHANCE[level];
        const doubleStrike = doubleStrikeChance > 0
            && (this._options.random ?? Math.random)() < doubleStrikeChance;
        this._flightDuration = flightDistance / FLIGHT_SPEED;
        this._volleyDuration = LAUNCH_TIMES[doubleStrike ? 3 : 1] + this._flightDuration;
        this._cooldown = BASE_COOLDOWN[level] * Math.max(0.1, this._options.cooldownMultiplier ?? 1);
        this._time = 0;
        for (let index = 0; index < this._swings.length; index++) {
            const swing = this._swings[index];
            const second = (index & 1) !== 0;
            swing.radius = radius * (second ? 1.2 : 1);
            swing.damage.amount = damage * (second ? 1.35 : 1);
            swing.damage.targetIndex = 0;
            swing.hitEnemies.clear();
            swing.startX = context.originX + this._directionX * swing.radius * 0.3;
            swing.startY = context.originY + this._directionY * swing.radius * 0.3;
            swing.lastQueryX = swing.startX;
            swing.lastQueryY = swing.startY;
            swing.nextQueryAge = 0;
            swing.launched = false;
            swing.complete = index >= 2 && !doubleStrike;
            swing.node.active = false;
        }
        this._visuals[0].active = true;
        this._visuals[1].active = doubleStrike;
        this.advanceSwings();
    }

    private advanceSwings (): void {
        for (let index = 0; index < this._swings.length; index++) {
            const swing = this._swings[index];
            const age = this._time - swing.launchTime;
            if (swing.complete || age < 0) continue;
            if (!swing.launched) {
                swing.launched = true;
                swing.damage.actionId = createCombatActionId();
                swing.node.active = true;
                swing.node.setRotationFromEuler(0, 0, this._angle);
                swing.blade?.setRotationFromEuler(0, 0, -14);
                swing.trail?.setRotationFromEuler(0, 0, -24);
            }
            const travelAge = Math.min(age, this._flightDuration);
            const travelDistance = travelAge * FLIGHT_SPEED;
            const x = swing.startX + this._directionX * travelDistance;
            const y = swing.startY + this._directionY * travelDistance;
            swing.node.setPosition(x, y, 0);
            if (age + 0.000001 >= swing.nextQueryAge || age >= this._flightDuration) {
                // One swept query per due slash/frame covers the entire unqueried path after a stall.
                this.hitAlongPath(swing, x, y);
                if (this._destroyed) return;
                swing.nextQueryAge = (Math.floor((age + 0.000001) / QUERY_INTERVAL) + 1) * QUERY_INTERVAL;
            }
            if (age >= this._flightDuration) {
                swing.complete = true;
                swing.node.active = false;
            } else {
                this.animateSwing(swing, age);
            }
        }
    }

    private hitAlongPath (swing: SwingState, x: number, y: number): void {
        this._results.length = 0;
        this._world.queryEnemiesAlongSegment(swing.lastQueryX, swing.lastQueryY, x, y,
            swing.radius, this._results, true);
        swing.lastQueryX = x;
        swing.lastQueryY = y;
        for (let index = 0; index < this._results.length; index++) {
            const enemyId = this._results[index];
            if (swing.hitEnemies.has(enemyId)) continue;
            const applied = this._world.applyDamage(enemyId, swing.damage);
            if (this._destroyed) return;
            if (applied) {
                swing.hitEnemies.add(enemyId);
                swing.damage.targetIndex++;
            }
        }
    }

    private animateSwing (swing: SwingState, age: number): void {
        const t = age / this._flightDuration;
        const size = swing.radius / 256;
        // Keep the mirrored launch pose fixed throughout the forward flight.
        swing.node.setScale(size, size * swing.mirror, 1);
        if (swing.opacity) swing.opacity.opacity = Math.round(255
            * (t < 0.72 ? 1 : Math.max(0, (1 - t) / 0.28)));
        if (swing.flare) {
            swing.flare.active = age < 0.14;
            if (swing.flare.active) {
                const flash = age / 0.14;
                swing.flare.setScale(0.6 + flash * 0.8, 0.45 + flash * 0.3, 1);
                if (swing.flareOpacity) swing.flareOpacity.opacity = Math.round(220 * (1 - flash));
            }
        }
    }

    public destroyAbility (): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this._time = -1;
        for (let index = 0; index < this._swings.length; index++) {
            this._swings[index].complete = true;
            this._swings[index].hitEnemies.clear();
        }
        for (let index = 0; index < this._visuals.length; index++) this._visuals[index].destroy();
        this._results.length = 0;
    }
}
