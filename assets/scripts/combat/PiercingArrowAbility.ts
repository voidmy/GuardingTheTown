import { Node, Prefab } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    DamageInfo,
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
}

export class PiercingArrowAbility implements Ability {
    public readonly id = 'piercing-arrow';

    private _timer = 0;
    private _horizontalDirection = 1;

    constructor (
        private readonly _projectiles: ProjectileEmitter,
        private readonly _options: PiercingArrowAbilityOptions,
    ) {}

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const interval = Math.max(0.1, this._options.interval);
        this._timer += dt;
        while (this._timer >= interval) {
            this._timer -= interval;
            this.fire(context);
        }
    }

    private fire (context: AbilityFrameContext): void {
        if (context.facingX > 0.001) {
            this._horizontalDirection = 1;
        } else if (context.facingX < -0.001) {
            this._horizontalDirection = -1;
        }
        const directionX = this._horizontalDirection;

        const projectileCount = Math.max(1, this._options.projectilesPerShot | 0);
        const middleIndex = (projectileCount - 1) * 0.5;
        for (let index = 0; index < projectileCount; index++) {
            this._projectiles.spawnProjectile({
                prefab: this._options.prefab,
                visualParent: this._options.visualParent,
                originX: context.originX + directionX * this._options.spawnOffset,
                originY: context.originY
                    + (index - middleIndex) * this._options.projectileSpacing,
                directionX,
                directionY: 0,
                speed: this._options.projectileSpeed,
                lifetime: Number.POSITIVE_INFINITY,
                hitRadius: this._options.hitRadius,
                maxHits: Number.POSITIVE_INFINITY,
                damage: this.createDamageInfo(),
                despawnOutsideBounds: true,
                hitOnlyInsideBounds: false,
                rotateToDirection: true,
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
