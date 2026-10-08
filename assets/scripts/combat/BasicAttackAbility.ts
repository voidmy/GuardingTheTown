import { Node, Prefab, Vec2 } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    createCombatActionId,
    EnemyCombatWorld,
    ProjectileEmitter,
} from './CombatTypes';

export const MAX_BASIC_ATTACK_PROJECTILES = 6;

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
    /** Complete damage for permanent skills; legacy coefficients remain available for potions. */
    getDamage?: () => number;
}

export class BasicAttackAbility implements Ability {
    public readonly id = 'basic-attack';

    private readonly _targetPosition = new Vec2();
    private _timer = 0;

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _projectiles: ProjectileEmitter,
        private readonly _options: BasicAttackAbilityOptions,
    ) {}

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const interval = Math.max(0.02, this._options.interval);
        this._timer += Math.max(0, dt);
        if (!this._world.hasEnemies) {
            this._timer = Math.min(this._timer, interval);
            return;
        }

        while (this._timer >= interval && this._world.hasEnemies) {
            this._timer -= interval;
            this.emitVolley(context);
        }
    }

    private emitVolley (context: AbilityFrameContext): void {
        const options = this._options;
        const attackRange = Math.max(1, options.attackRange);
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

        const damage = options.getDamage?.() ?? (Math.max(0, options.damage)
            * Math.max(0, options.getAttackPower?.() ?? 1));
        const projectileCount = Math.min(
            MAX_BASIC_ATTACK_PROJECTILES, Math.max(1, options.projectilesPerShot | 0),
        );
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
                directionX: directionX * cosine - directionY * sine,
                directionY: directionX * sine + directionY * cosine,
                speed: options.projectileSpeed,
                lifetime: Math.min(
                    options.projectileLifetime,
                    Math.max(1, options.attackRange) / Math.max(0.001, options.projectileSpeed),
                ),
                hitRadius: options.hitRadius,
                maxHits: 1,
                damage: {
                    amount: damage,
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
