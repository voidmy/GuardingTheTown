import { Node, Prefab, Rect, Vec2 } from 'cc';

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

    /** Current camera viewport in combat coordinates, before map clipping. */
    getCombatViewport (out: Rect): boolean;

    /** Circle bodies touching the visible rectangle, clipped to the playable map. */
    queryEnemiesInRect (bounds: Rect, results: EnemyId[]): void;

    /** Independent priority targeting; does not alter the focus core's target. */
    findPriorityEnemy? (x: number, y: number, range: number): EnemyId | null;

    /** Normal enemies freeze, elites only slow, bosses ignore frost control. */
    applyFrost? (enemyId: EnemyId, freezeDuration: number, slowDuration: number, speedRatio: number): void;

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

    /** Lethal potion hit; preserves normal kill rewards and includes elites/bosses. */
    executeEnemy (enemyId: EnemyId, sourceAbilityId: string): boolean;
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
