import { Node, Prefab, Vec2 } from 'cc';

export type EnemyId = number;

let nextActionId = 1;

/** Shared across abilities so a rebuilt skill cannot reuse a live action ID. */
export function createCombatActionId (): number {
    return nextActionId++;
}

export interface DamageInfo {
    amount: number;
    sourceAbilityId: string;
    actionId?: number;
    isPrimaryAttack?: boolean;
    /** Zero-based effective hit order within one projectile or damage cycle. */
    targetIndex?: number;
}

export interface WindArea {
    x: number;
    y: number;
    radius: number;
    sourceAbilityId: string;
}

export interface EnemyCombatWorld {
    readonly hasEnemies: boolean;

    findAttackTarget? (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
        sourceAbilityId: string,
    ): EnemyId | null;

    /** Mutates a proposed ability position into the playable bounds. */
    clampAbilityPosition? (position: Vec2, padding: number): void;

    findNearestEnemy (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
    ): EnemyId | null;

    getEnemyPosition (enemyId: EnemyId, out: Vec2): boolean;

    /** Results are ordered by first segment contact, with stable ID ties. */
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
    /** Shared action IDs hit each enemy only once across all of their routes. */
    deduplicateActionHits?: boolean;
}

export interface ProjectileEmitter {
    spawnProjectile (request: ProjectileSpawnRequest): void;
}
