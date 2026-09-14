import { instantiate, Node, Prefab, Vec2 } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    createCombatActionId,
    DamageInfo,
    EnemyCombatWorld,
    EnemyId,
    WindArea,
} from './CombatTypes';

export interface TornadoAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    /** Cooldown after the previous wind ends, not between spawn start times. */
    spawnInterval: number;
    duration: number;
    pullRadius: number;
    pullSpeed: number;
    pullStopRadius: number;
    rotationSpeed: number;
    /** Retained for old serialized callers; this version always allows one wind. */
    maxActiveCount: number;
    damageInterval: number;
    damage: number;
    getAttackPower?: () => number;
    damageRadius?: number;
    initialDelay?: number;
    spawnDistance?: number;
    playerSafetyRadius?: number;
}

interface TornadoState {
    node: Node;
    outer: Node | null;
    inner: Node | null;
    area: WindArea;
    remainingLife: number;
    cooldownAfter: number;
    rotation: number;
    rotationSpeed: number;
    damageTimer: number;
    damageInterval: number;
    damage: DamageInfo;
    pullRadius: number;
    pullSpeed: number;
    pullStopRadius: number;
    playerSafetyRadius: number;
}

export class TornadoAbility implements Ability {
    public readonly id = 'tornado';

    private readonly _hitResults: EnemyId[] = [];
    private readonly _spawnPosition = new Vec2();
    private readonly _enemyPosition = new Vec2();
    private readonly _areas: WindArea[] = [];
    private _active: TornadoState | null = null;
    private _cooldownRemaining: number;
    private _destroyed = false;

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _options: TornadoAbilityOptions,
    ) {
        this._cooldownRemaining = Math.max(0, _options.initialDelay ?? 5);
    }

    public getActiveWindAreas (): readonly WindArea[] {
        return this._areas;
    }

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        let remainingDt = Math.max(0, dt);
        while (remainingDt > 0 && !this._destroyed) {
            const tornado = this._active;
            if (tornado) {
                const activeDt = Math.min(remainingDt, tornado.remainingLife);
                tornado.rotation = (
                    tornado.rotation + tornado.rotationSpeed * activeDt
                ) % 360;
                tornado.outer?.setRotationFromEuler(0, 0, tornado.rotation);
                tornado.inner?.setRotationFromEuler(0, 0, -tornado.rotation * 1.65);
                this.pullNearbyEnemies(tornado, activeDt, context);
                this.damageNearbyEnemies(tornado, activeDt);
                if (this._destroyed) return;
                tornado.remainingLife -= activeDt;
                remainingDt -= activeDt;
                if (tornado.remainingLife <= 0) {
                    tornado.node.destroy();
                    this._active = null;
                    this._areas.length = 0;
                    this._cooldownRemaining = tornado.cooldownAfter;
                }
                continue;
            }

            const waitDt = Math.min(remainingDt, this._cooldownRemaining);
            this._cooldownRemaining -= waitDt;
            remainingDt -= waitDt;
            if (this._cooldownRemaining > 0) return;
            // If every legal position overlaps the player, retry next frame
            // without accumulating missed casts or creating a wind on the body.
            if (!this.spawn(context)) return;
        }
    }

    public destroyAbility (): void {
        this._destroyed = true;
        this._active?.node.destroy();
        this._active = null;
        this._areas.length = 0;
    }

    private spawn (context: AbilityFrameContext): boolean {
        const damageRadius = Math.max(
            1,
            this._options.damageRadius ?? Math.min(80, this._options.pullRadius * 0.4),
        );
        const safetyRadius = Math.max(1, this._options.playerSafetyRadius ?? 48);
        const stopRadius = Math.max(0, this._options.pullStopRadius);
        const minimumDistance = safetyRadius + stopRadius + 8;
        const distance = Math.max(
            minimumDistance,
            this._options.spawnDistance ?? damageRadius + safetyRadius + 24,
        );
        const length = Math.hypot(context.facingX, context.facingY);
        const directionX = length > 0.001 ? context.facingX / length : 1;
        const directionY = length > 0.001 ? context.facingY / length : 0;
        let foundPosition = false;
        for (const angle of [0, Math.PI, Math.PI * 0.5, -Math.PI * 0.5]) {
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            this._spawnPosition.set(
                context.originX + (directionX * cosine - directionY * sine) * distance,
                context.originY + (directionX * sine + directionY * cosine) * distance,
            );
            this._world.clampAbilityPosition?.(this._spawnPosition, damageRadius);
            if (Math.hypot(
                this._spawnPosition.x - context.originX,
                this._spawnPosition.y - context.originY,
            ) >= minimumDistance) {
                foundPosition = true;
                break;
            }
        }
        if (!foundPosition) return false;

        const node = instantiate(this._options.prefab);
        node.setParent(this._options.visualParent);
        node.setPosition(this._spawnPosition.x, this._spawnPosition.y, 0);
        node.active = true;
        const area: WindArea = {
            x: this._spawnPosition.x,
            y: this._spawnPosition.y,
            radius: damageRadius,
            sourceAbilityId: this.id,
        };
        // Everything affecting this persistent entity is captured at summon time.
        this._active = {
            node,
            outer: node.getChildByName('Outer'),
            inner: node.getChildByName('Inner'),
            area,
            remainingLife: Math.max(0.1, this._options.duration),
            cooldownAfter: Math.max(0.1, this._options.spawnInterval),
            rotation: 0,
            rotationSpeed: this._options.rotationSpeed,
            damageTimer: 0,
            damageInterval: Math.max(0.05, this._options.damageInterval),
            damage: {
                amount: Math.max(0, this._options.damage)
                    * Math.max(0, this._options.getAttackPower?.() ?? 1),
                sourceAbilityId: this.id,
                isPrimaryAttack: true,
            },
            pullRadius: Math.max(1, this._options.pullRadius),
            pullSpeed: Math.max(0, this._options.pullSpeed),
            pullStopRadius: stopRadius,
            playerSafetyRadius: safetyRadius,
        };
        this._areas.push(area);
        return true;
    }

    private pullNearbyEnemies (
        tornado: TornadoState,
        dt: number,
        context: AbilityFrameContext,
    ): void {
        if (!this._world.hasEnemies) return;
        this._hitResults.length = 0;
        this._world.queryEnemiesInCircle(
            tornado.area.x, tornado.area.y, tornado.pullRadius, this._hitResults, true,
        );
        const maximumDistance = tornado.pullSpeed * dt;
        for (const enemyId of this._hitResults) {
            if (!this._world.getEnemyPosition(enemyId, this._enemyPosition)) continue;
            const deltaX = tornado.area.x - this._enemyPosition.x;
            const deltaY = tornado.area.y - this._enemyPosition.y;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance <= tornado.pullStopRadius || distance < 0.001) continue;
            const movement = Math.min(maximumDistance, distance - tornado.pullStopRadius);
            const moveX = deltaX / distance * movement;
            const moveY = deltaY / distance * movement;
            const playerDeltaX = this._enemyPosition.x - context.originX;
            const playerDeltaY = this._enemyPosition.y - context.originY;
            const currentDistanceSquared = playerDeltaX ** 2 + playerDeltaY ** 2;
            const safetySquared = tornado.playerSafetyRadius ** 2;
            if (currentDistanceSquared < safetySquared) {
                // Already nearby: only permit movement away from the player.
                if (playerDeltaX * moveX + playerDeltaY * moveY < 0) continue;
            } else if (movement > 0) {
                const fraction = Math.max(0, Math.min(1,
                    -(playerDeltaX * moveX + playerDeltaY * moveY) / (movement ** 2),
                ));
                const closestX = playerDeltaX + moveX * fraction;
                const closestY = playerDeltaY + moveY * fraction;
                if (closestX ** 2 + closestY ** 2 < safetySquared) continue;
            }
            this._world.pullEnemyToward(
                enemyId,
                tornado.area.x,
                tornado.area.y,
                maximumDistance,
                tornado.pullStopRadius,
            );
        }
    }

    private damageNearbyEnemies (tornado: TornadoState, dt: number): void {
        tornado.damageTimer += dt;
        if (!this._world.hasEnemies || tornado.damage.amount <= 0) {
            tornado.damageTimer = Math.min(tornado.damageTimer, tornado.damageInterval);
            return;
        }
        while (tornado.damageTimer >= tornado.damageInterval && !this._destroyed) {
            tornado.damageTimer -= tornado.damageInterval;
            this._hitResults.length = 0;
            this._world.queryEnemiesInCircle(
                tornado.area.x,
                tornado.area.y,
                tornado.area.radius,
                this._hitResults,
                true,
            );
            this._hitResults.sort((first, second) => first - second);
            const damage: DamageInfo = {
                ...tornado.damage,
                actionId: createCombatActionId(),
            };
            let targetIndex = 0;
            for (const enemyId of this._hitResults) {
                if (this._destroyed) break;
                if (this._world.applyDamage(enemyId, { ...damage, targetIndex })) targetIndex++;
            }
        }
    }
}
