import { instantiate, Node, Prefab } from 'cc';
import {
    Ability,
    AbilityFrameContext,
    DamageInfo,
    EnemyCombatWorld,
    EnemyId,
} from './CombatTypes';

export interface TornadoAbilityOptions {
    prefab: Prefab;
    visualParent: Node;
    spawnInterval: number;
    duration: number;
    pullRadius: number;
    pullSpeed: number;
    pullStopRadius: number;
    rotationSpeed: number;
    maxActiveCount: number;
    damageInterval: number;
    damage: number;
    getAttackPower?: () => number;
}

interface TornadoState {
    node: Node;
    outer: Node | null;
    inner: Node | null;
    x: number;
    y: number;
    remainingLife: number;
    rotation: number;
    damageTimer: number;
}

export class TornadoAbility implements Ability {
    public readonly id = 'tornado';

    private readonly _active: TornadoState[] = [];
    private readonly _hitResults: EnemyId[] = [];
    private _spawnTimer = 0;

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _options: TornadoAbilityOptions,
    ) {}

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const frameDt = Math.max(0, dt);
        for (let index = this._active.length - 1; index >= 0; index--) {
            const tornado = this._active[index];
            tornado.remainingLife -= frameDt;
            if (tornado.remainingLife <= 0) {
                tornado.node.destroy();
                this._active.splice(index, 1);
                continue;
            }

            tornado.rotation = (
                tornado.rotation + this._options.rotationSpeed * frameDt
            ) % 360;
            tornado.outer?.setRotationFromEuler(0, 0, tornado.rotation);
            tornado.inner?.setRotationFromEuler(0, 0, -tornado.rotation * 1.65);
            this.pullNearbyEnemies(tornado, frameDt);
            this.damageNearbyEnemies(tornado, frameDt);
        }

        const interval = Math.max(0.1, this._options.spawnInterval);
        const maximumActiveCount = Math.max(1, this._options.maxActiveCount | 0);
        this._spawnTimer += frameDt;
        if (this._active.length >= maximumActiveCount) {
            this._spawnTimer = Math.min(this._spawnTimer, interval);
            return;
        }
        while (this._spawnTimer >= interval
            && this._active.length < maximumActiveCount) {
            this._spawnTimer -= interval;
            this.spawn(context.originX, context.originY);
        }
    }

    public destroyAbility (): void {
        for (const tornado of this._active) tornado.node.destroy();
        this._active.length = 0;
    }

    private spawn (x: number, y: number): void {
        const node = instantiate(this._options.prefab);
        node.setParent(this._options.visualParent);
        node.setPosition(x, y, 0);
        node.active = true;
        this._active.push({
            node,
            outer: node.getChildByName('Outer'),
            inner: node.getChildByName('Inner'),
            x,
            y,
            remainingLife: Math.max(0.1, this._options.duration),
            rotation: Math.random() * 360,
            damageTimer: 0,
        });
    }

    private pullNearbyEnemies (tornado: TornadoState, dt: number): void {
        if (!this._world.hasEnemies) return;

        this._hitResults.length = 0;
        this._world.queryEnemiesInCircle(
            tornado.x,
            tornado.y,
            Math.max(1, this._options.pullRadius),
            this._hitResults,
            true,
        );
        const pullDistance = Math.max(0, this._options.pullSpeed) * dt;
        const stopRadius = Math.max(0, this._options.pullStopRadius);
        for (const enemyId of this._hitResults) {
            this._world.pullEnemyToward(
                enemyId,
                tornado.x,
                tornado.y,
                pullDistance,
                stopRadius,
            );
        }
    }

    private damageNearbyEnemies (tornado: TornadoState, dt: number): void {
        if (!this._world.hasEnemies || this._options.damage <= 0) return;

        const interval = Math.max(0.05, this._options.damageInterval);
        tornado.damageTimer += dt;
        while (tornado.damageTimer >= interval) {
            tornado.damageTimer -= interval;
            this._hitResults.length = 0;
            this._world.queryEnemiesInCircle(
                tornado.x,
                tornado.y,
                Math.max(1, this._options.pullRadius),
                this._hitResults,
                true,
            );
            const damage = this.createDamageInfo();
            for (const enemyId of this._hitResults) {
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
}
