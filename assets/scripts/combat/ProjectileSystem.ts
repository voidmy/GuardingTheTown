import {
    instantiate,
    Node,
    Prefab,
    UITransform,
    Vec3,
} from 'cc';
import {
    EnemyCombatWorld,
    EnemyId,
    ProjectileEmitter,
    ProjectileSpawnRequest,
} from './CombatTypes';

interface ProjectileState {
    prefab: Prefab;
    node: Node;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    remainingLife: number;
    hitRadius: number;
    maxHits: number;
    hitCount: number;
    hitEnemyIds: Set<EnemyId> | null;
    damage: ProjectileSpawnRequest['damage'];
    despawnOutsideBounds: boolean;
    hitOnlyInsideBounds: boolean;
    cullRadius: number;
}

export class ProjectileSystem implements ProjectileEmitter {
    private readonly _active: ProjectileState[] = [];
    private readonly _pools = new Map<Prefab, Node[]>();
    private readonly _hitResults: EnemyId[] = [];
    private readonly _localPosition = new Vec3();
    private readonly _worldPosition = new Vec3();

    constructor (
        private readonly _world: EnemyCombatWorld,
        private readonly _combatLayer: Node,
        private readonly _combatTransform: UITransform,
    ) {}

    public spawnProjectile (request: ProjectileSpawnRequest): void {
        let pool = this._pools.get(request.prefab);
        if (!pool) {
            pool = [];
            this._pools.set(request.prefab, pool);
        }

        const node = pool.pop() ?? instantiate(request.prefab);
        if (node.parent !== request.visualParent) {
            node.setParent(request.visualParent);
        }
        node.active = true;
        if (request.rotateToDirection) {
            node.setRotationFromEuler(
                0,
                0,
                Math.atan2(request.directionY, request.directionX) * 180 / Math.PI,
            );
        } else {
            node.setRotationFromEuler(0, 0, 0);
        }

        const visualTransform = node.getComponent(UITransform);
        const cullRadius = visualTransform
            ? Math.sqrt(
                visualTransform.width * visualTransform.width
                + visualTransform.height * visualTransform.height,
            ) * 0.5
            : 0;
        const maxHits = Number.isFinite(request.maxHits)
            ? Math.max(1, request.maxHits | 0)
            : Number.POSITIVE_INFINITY;
        const state: ProjectileState = {
            prefab: request.prefab,
            node,
            x: request.originX,
            y: request.originY,
            velocityX: request.directionX * request.speed,
            velocityY: request.directionY * request.speed,
            remainingLife: request.lifetime,
            hitRadius: Math.max(0, request.hitRadius),
            maxHits,
            hitCount: 0,
            hitEnemyIds: maxHits > 1 ? new Set<EnemyId>() : null,
            damage: request.damage,
            despawnOutsideBounds: request.despawnOutsideBounds,
            hitOnlyInsideBounds: request.hitOnlyInsideBounds,
            cullRadius,
        };
        this.setVisualPosition(state);
        this._active.push(state);
    }

    public update (dt: number): void {
        for (let i = this._active.length - 1; i >= 0; i--) {
            const projectile = this._active[i];
            const previousX = projectile.x;
            const previousY = projectile.y;
            projectile.x += projectile.velocityX * dt;
            projectile.y += projectile.velocityY * dt;
            projectile.remainingLife -= dt;
            this.setVisualPosition(projectile);

            this._hitResults.length = 0;
            this._world.queryEnemiesAlongSegment(
                previousX,
                previousY,
                projectile.x,
                projectile.y,
                projectile.hitRadius,
                this._hitResults,
                projectile.hitOnlyInsideBounds,
            );
            for (const enemyId of this._hitResults) {
                if (projectile.hitEnemyIds?.has(enemyId)) continue;
                if (!this._world.applyDamage(enemyId, projectile.damage)) continue;

                projectile.hitEnemyIds?.add(enemyId);
                projectile.hitCount++;
                if (projectile.hitCount >= projectile.maxHits) break;
            }

            if (projectile.hitCount >= projectile.maxHits
                || projectile.remainingLife <= 0
                || projectile.despawnOutsideBounds
                    && this.isFullyOutsideCombatBounds(projectile)) {
                this.recycle(i);
            }
        }
    }

    public clear (): void {
        for (let i = this._active.length - 1; i >= 0; i--) {
            this.recycle(i);
        }
    }

    private isFullyOutsideCombatBounds (projectile: ProjectileState): boolean {
        const halfWidth = this._combatTransform.width * 0.5;
        const halfHeight = this._combatTransform.height * 0.5;
        return Math.abs(projectile.x) > halfWidth + projectile.cullRadius
            || Math.abs(projectile.y) > halfHeight + projectile.cullRadius;
    }

    private setVisualPosition (projectile: ProjectileState): void {
        if (projectile.node.parent === this._combatLayer) {
            projectile.node.setPosition(projectile.x, projectile.y, 0);
            return;
        }

        this._localPosition.set(projectile.x, projectile.y, 0);
        this._combatTransform.convertToWorldSpaceAR(
            this._localPosition,
            this._worldPosition,
        );
        projectile.node.setWorldPosition(this._worldPosition);
    }

    private recycle (index: number): void {
        const projectile = this._active[index];
        projectile.node.active = false;
        let pool = this._pools.get(projectile.prefab);
        if (!pool) {
            pool = [];
            this._pools.set(projectile.prefab, pool);
        }
        pool.push(projectile.node);

        const last = this._active.pop();
        if (last && index < this._active.length) {
            this._active[index] = last;
        }
    }
}
