import { Node, Prefab, Vec2 } from 'cc';

export type EnemyId = number;

export interface DamageInfo {
    amount: number;
    sourceAbilityId: string;
}

export interface EnemyCombatWorld {
    readonly hasEnemies: boolean;

    findNearestEnemy (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
    ): EnemyId | null;

    getEnemyPosition (enemyId: EnemyId, out: Vec2): boolean;

    queryEnemiesAlongSegment (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        hitRadius: number,
        results: EnemyId[],
        insideBoundsOnly: boolean,
    ): void;

    queryEnemiesInCircle (
        centerX: number,
        centerY: number,
        radius: number,
        results: EnemyId[],
        insideBoundsOnly: boolean,
    ): void;

    pullEnemyToward (
        enemyId: EnemyId,
        targetX: number,
        targetY: number,
        maximumDistance: number,
        stopRadius: number,
    ): boolean;

    applyDamage (enemyId: EnemyId, damage: DamageInfo): boolean;
}

export interface AbilityFrameContext {
    originX: number;
    originY: number;
    facingX: number;
    facingY: number;
}

export interface Ability {
    readonly id: string;

    updateAbility (dt: number, context: AbilityFrameContext): void;

    destroyAbility? (): void;
}

export interface ProjectileSpawnRequest {
    prefab: Prefab;
    visualParent: Node;
    originX: number;
    originY: number;
    directionX: number;
    directionY: number;
    speed: number;
    lifetime: number;
    hitRadius: number;
    maxHits: number;
    damage: DamageInfo;
    despawnOutsideBounds: boolean;
    hitOnlyInsideBounds: boolean;
    rotateToDirection: boolean;
}

export interface ProjectileEmitter {
    spawnProjectile (request: ProjectileSpawnRequest): void;
}
