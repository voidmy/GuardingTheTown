import { Node, Prefab, Vec2 } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    createCombatActionId,
    EnemyCombatWorld,
    ProjectileEmitter,
} from './CombatTypes';

export interface PiercingArrowAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    interval: number;
    projectileSpeed: number;
    spawnOffset: number;
    projectilesPerShot: number;
    projectileSpacing: number;
    hitRadius: number;
    damage: number;
    getAttackPower?: () => number;
    pattern?: 'parallel' | 'fan';
    fanAngle?: number;
    attackRange?: number;
}

export class PiercingArrowAbility implements Ability {
    public readonly id = 'piercing-arrow';

    private readonly _targetPosition = new Vec2();
    private _timer = 0;
    private _horizontalDirection = 1;

    constructor (
        private readonly _projectiles: ProjectileEmitter,
        private readonly _options: PiercingArrowAbilityOptions,
        private readonly _world?: EnemyCombatWorld,
    ) {}

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const interval = Math.max(0.1, this._options.interval);
        this._timer += Math.max(0, dt);
        while (this._timer >= interval) {
            this._timer -= interval;
            this.fire(context);
        }
    }

    private fire (context: AbilityFrameContext): void {
        if (context.facingX > 0.001) this._horizontalDirection = 1;
        else if (context.facingX < -0.001) this._horizontalDirection = -1;
        let directionX = this._horizontalDirection;
        let directionY = 0;
        // The world applies focus priority only when that core is owned. A null
        // result preserves the original facing attack instead of inventing a target.
        const targetId = this._world?.findAttackTarget?.(
            context.originX,
            context.originY,
            Math.max(1, this._options.attackRange ?? 1200),
            true,
            this.id,
        );
        if (targetId !== undefined && targetId !== null
            && this._world?.getEnemyPosition(targetId, this._targetPosition)) {
            const deltaX = this._targetPosition.x - context.originX;
            const deltaY = this._targetPosition.y - context.originY;
            const length = Math.hypot(deltaX, deltaY);
            if (length > 0.001) {
                directionX = deltaX / length;
                directionY = deltaY / length;
            }
        }

        const projectileCount = Math.max(1, this._options.projectilesPerShot | 0);
        const fan = this._options.pattern === 'fan';
        const actionId = createCombatActionId();
        const damage = Math.max(0, this._options.damage)
            * Math.max(0, this._options.getAttackPower?.() ?? 1);
        for (let index = 0; index < projectileCount; index++) {
            // Route 0 always preserves the original centre line. Added routes
            // alternate above/below, or fan clockwise/counterclockwise.
            const lane = index === 0 ? 0 : Math.ceil(index / 2) * (index % 2 ? 1 : -1);
            const radians = fan
                ? lane * (this._options.fanAngle ?? 30) * Math.PI / 180
                : 0;
            const cosine = Math.cos(radians);
            const sine = Math.sin(radians);
            const routeX = directionX * cosine - directionY * sine;
            const routeY = directionX * sine + directionY * cosine;
            const offset = fan ? 0 : lane * this._options.projectileSpacing;
            this._projectiles.spawnProjectile({
                prefab: this._options.prefab,
                visualParent: this._options.visualParent,
                originX: context.originX + routeX * this._options.spawnOffset
                    - directionY * offset,
                originY: context.originY + routeY * this._options.spawnOffset
                    + directionX * offset,
                directionX: routeX,
                directionY: routeY,
                speed: this._options.projectileSpeed,
                lifetime: Number.POSITIVE_INFINITY,
                hitRadius: this._options.hitRadius,
                maxHits: Number.POSITIVE_INFINITY,
                damage: { amount: damage, sourceAbilityId: this.id, actionId, isPrimaryAttack: true },
                deduplicateActionHits: true,
                despawnOutsideBounds: true,
                hitOnlyInsideBounds: false,
                rotateToDirection: true,
            });
        }
    }
}
