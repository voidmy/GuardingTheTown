import { instantiate, Node, Prefab } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    DamageInfo,
    EnemyCombatWorld,
    EnemyId,
} from './CombatTypes';

export interface QiBladeAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    hitRadius: number;
    damageInterval: number;
    rotationSpeed: number;
    selfRotationSpeed: number;
    bladeCount: number;
    damage: number;
    getAttackPower?: () => number;
}

interface QiBladeHitbox {
    node: Node;
    offsetX: number;
    offsetY: number;
    initialRotation: number;
}

const BLADE_NODE_NAMES = ['BladeA', 'BladeB', 'BladeC'];
const DEGREES_TO_RADIANS = Math.PI / 180;

export class QiBladeAbility implements Ability {
    public readonly id = 'qi-blade';

    private readonly _visual: Node;
    private readonly _hitboxes: QiBladeHitbox[] = [];
    private readonly _hitResults: EnemyId[] = [];
    private readonly _damagedEnemyIds = new Set<EnemyId>();
    private _damageTimer = 0;
    private _rotation = 0;
    private _selfRotation = 0;
    private _activeBladeCount = -1;

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _options: QiBladeAbilityOptions,
    ) {
        this._visual = instantiate(_options.prefab);
        this._visual.setParent(_options.visualParent);
        this._visual.active = true;
        for (const nodeName of BLADE_NODE_NAMES) {
            const blade = this._visual.getChildByName(nodeName);
            if (!blade) {
                console.warn(`[QiBladeAbility] Missing hitbox node: ${nodeName}`);
                continue;
            }
            this._hitboxes.push({
                node: blade,
                offsetX: blade.position.x,
                offsetY: blade.position.y,
                initialRotation: blade.eulerAngles.z,
            });
        }
        this.syncActiveBlades();
    }

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const frameDt = Math.max(0, dt);
        this._rotation = (this._rotation + this._options.rotationSpeed * frameDt) % 360;
        this._selfRotation = (this._selfRotation
            + this._options.selfRotationSpeed * frameDt) % 360;
        this._visual.setPosition(context.originX, context.originY, 0);
        this._visual.setRotationFromEuler(0, 0, this._rotation);
        this.syncActiveBlades();
        for (const hitbox of this._hitboxes) {
            if (!hitbox.node.active) continue;
            hitbox.node.setRotationFromEuler(
                0,
                0,
                hitbox.initialRotation + this._selfRotation,
            );
        }

        const interval = Math.max(0.05, this._options.damageInterval);
        this._damageTimer += frameDt;
        if (!this._world.hasEnemies) {
            this._damageTimer = Math.min(this._damageTimer, interval);
            return;
        }

        while (this._damageTimer >= interval) {
            this._damageTimer -= interval;
            this.collectBladeHits(context);
            const damage = this.createDamageInfo();
            for (const enemyId of this._damagedEnemyIds) {
                this._world.applyDamage(enemyId, damage);
            }
        }
    }

    private createDamageInfo (): DamageInfo {
        const attackPower = Math.max(0, this._options.getAttackPower?.() ?? 1);
        return {
            amount: Math.max(0, this._options.damage) * attackPower,
            sourceAbilityId: this.id,
        };
    }

    private collectBladeHits (context: AbilityFrameContext): void {
        this._damagedEnemyIds.clear();
        const radians = this._rotation * DEGREES_TO_RADIANS;
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        const hitRadius = Math.max(1, this._options.hitRadius);

        for (const hitbox of this._hitboxes) {
            if (!hitbox.node.active) continue;
            const centerX = context.originX
                + hitbox.offsetX * cosine - hitbox.offsetY * sine;
            const centerY = context.originY
                + hitbox.offsetX * sine + hitbox.offsetY * cosine;
            this._hitResults.length = 0;
            this._world.queryEnemiesInCircle(
                centerX,
                centerY,
                hitRadius,
                this._hitResults,
                true,
            );
            for (const enemyId of this._hitResults) {
                this._damagedEnemyIds.add(enemyId);
            }
        }
    }

    private syncActiveBlades (): void {
        const activeBladeCount = Math.min(
            this._hitboxes.length,
            Math.max(1, this._options.bladeCount | 0),
        );
        if (activeBladeCount === this._activeBladeCount) return;

        this._activeBladeCount = activeBladeCount;
        for (let index = 0; index < this._hitboxes.length; index++) {
            this._hitboxes[index].node.active = index < activeBladeCount;
        }
    }

    public destroyAbility (): void {
        this._visual.destroy();
    }
}
