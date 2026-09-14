import { Node, Prefab, Vec2 } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    createCombatActionId,
    EnemyCombatWorld,
    ProjectileEmitter,
} from './CombatTypes';

export interface BasicAttackAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    interval: number;
    projectilesPerShot: number;
    spreadAngle: number;
    attackRange: number;
    projectileSpeed: number;
    projectileLifetime: number;
    hitRadius: number;
    damage: number;
    getAttackPower?: () => number;
    burstCount?: number;
    burstSpacing?: number;
    maxHits?: number;
}

interface PendingVolley {
    delay: number;
    directionX: number;
    directionY: number;
    options: BasicAttackAbilityOptions;
    damage: number;
}

export class BasicAttackAbility implements Ability {
    public readonly id = 'basic-attack';

    private readonly _targetPosition = new Vec2();
    private readonly _pending: PendingVolley[] = [];
    private _timer = 0;

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _projectiles: ProjectileEmitter,
        private readonly _options: BasicAttackAbilityOptions,
    ) {}

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const frameDt = Math.max(0, dt);
        for (let index = 0; index < this._pending.length;) {
            const volley = this._pending[index];
            volley.delay -= frameDt;
            if (volley.delay > 0) {
                index++;
                continue;
            }
            this.emitVolley(volley, context);
            this._pending.splice(index, 1);
        }

        const burstCount = Math.max(1, this._options.burstCount ?? 1) | 0;
        const burstSpacing = Math.max(0.01, this._options.burstSpacing ?? 0.1);
        const interval = Math.max(
            0.02,
            this._options.interval,
            (burstCount - 1) * burstSpacing + 0.001,
        );
        this._timer += frameDt;
        if (!this._world.hasEnemies) {
            this._timer = Math.min(this._timer, interval);
            return;
        }

        while (this._timer >= interval && this._world.hasEnemies) {
            this._timer -= interval;
            this.beginBurst(context, burstCount, burstSpacing, this._timer);
        }
    }

    public destroyAbility (): void {
        this._pending.length = 0;
    }

    private beginBurst (
        context: AbilityFrameContext,
        burstCount: number,
        spacing: number,
        elapsedSinceStart: number,
    ): void {
        const attackRange = Math.max(1, this._options.attackRange);
        const targetId = this._world.findAttackTarget
            ? this._world.findAttackTarget(
                context.originX, context.originY, attackRange, true, this.id,
            )
            : this._world.findNearestEnemy(
                context.originX, context.originY, attackRange, true,
            );
        if (targetId === null
            || !this._world.getEnemyPosition(targetId, this._targetPosition)) return;

        let directionX = this._targetPosition.x - context.originX;
        let directionY = this._targetPosition.y - context.originY;
        const length = Math.hypot(directionX, directionY);
        if (length < 0.001) return;
        directionX /= length;
        directionY /= length;

        const options = { ...this._options };
        const damage = Math.max(0, options.damage)
            * Math.max(0, options.getAttackPower?.() ?? 1);
        for (let shot = 0; shot < burstCount; shot++) {
            const volley: PendingVolley = {
                delay: shot * spacing - elapsedSinceStart,
                directionX,
                directionY,
                options,
                damage,
            };
            if (volley.delay <= 0) this.emitVolley(volley, context);
            else this._pending.push(volley);
        }
    }

    private emitVolley (volley: PendingVolley, context: AbilityFrameContext): void {
        const options = volley.options;
        const projectileCount = Math.max(1, options.projectilesPerShot | 0);
        const middleIndex = (projectileCount - 1) * 0.5;
        for (let index = 0; index < projectileCount; index++) {
            const radians = (index - middleIndex) * options.spreadAngle * Math.PI / 180;
            const cosine = Math.cos(radians);
            const sine = Math.sin(radians);
            this._projectiles.spawnProjectile({
                prefab: options.prefab,
                visualParent: options.visualParent,
                originX: context.originX,
                originY: context.originY,
                directionX: volley.directionX * cosine - volley.directionY * sine,
                directionY: volley.directionX * sine + volley.directionY * cosine,
                speed: options.projectileSpeed,
                lifetime: Math.min(
                    options.projectileLifetime,
                    Math.max(1, options.attackRange) / Math.max(0.001, options.projectileSpeed),
                ),
                hitRadius: options.hitRadius,
                maxHits: Math.max(1, options.maxHits ?? 1),
                damage: {
                    amount: volley.damage,
                    sourceAbilityId: this.id,
                    actionId: createCombatActionId(),
                    isPrimaryAttack: true,
                },
                despawnOutsideBounds: true,
                hitOnlyInsideBounds: true,
                rotateToDirection: false,
            });
        }
    }
}
