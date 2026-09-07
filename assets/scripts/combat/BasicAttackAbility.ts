import { Node, Prefab, Vec2 } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    DamageInfo,
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
        this._timer += dt;
        if (!this._world.hasEnemies) {
            this._timer = Math.min(this._timer, interval);
            return;
        }

        while (this._timer >= interval && this._world.hasEnemies) {
            this._timer -= interval;
            this.fire(context);
        }
    }

    private fire (context: AbilityFrameContext): void {
        const attackRange = Math.max(1, this._options.attackRange);
        const targetId = this._world.findNearestEnemy(
            context.originX,
            context.originY,
            attackRange,
            true,
        );
        if (targetId === null
            || !this._world.getEnemyPosition(targetId, this._targetPosition)) {
            return;
        }

        let directionX = this._targetPosition.x - context.originX;
        let directionY = this._targetPosition.y - context.originY;
        const directionLength = Math.sqrt(
            directionX * directionX + directionY * directionY,
        );
        if (directionLength < 0.001) return;

        directionX /= directionLength;
        directionY /= directionLength;
        const projectileCount = Math.max(1, this._options.projectilesPerShot | 0);
        const middleIndex = (projectileCount - 1) * 0.5;
        for (let i = 0; i < projectileCount; i++) {
            const radians = (i - middleIndex) * this._options.spreadAngle
                * Math.PI / 180;
            const cos = Math.cos(radians);
            const sin = Math.sin(radians);
            this._projectiles.spawnProjectile({
                prefab: this._options.prefab,
                visualParent: this._options.visualParent,
                originX: context.originX,
                originY: context.originY,
                directionX: directionX * cos - directionY * sin,
                directionY: directionX * sin + directionY * cos,
                speed: this._options.projectileSpeed,
                lifetime: Math.min(
                    this._options.projectileLifetime,
                    attackRange / Math.max(0.001, this._options.projectileSpeed),
                ),
                hitRadius: this._options.hitRadius,
                maxHits: 1,
                damage: this.createDamageInfo(),
                despawnOutsideBounds: true,
                hitOnlyInsideBounds: true,
                rotateToDirection: false,
            });
        }
    }

    private createDamageInfo (): DamageInfo {
        const attackPower = Math.max(0, this._options.getAttackPower?.() ?? 1);
        return {
            amount: Math.max(0, this._options.damage) * attackPower,
            sourceAbilityId: this.id,
        };
    }
}
