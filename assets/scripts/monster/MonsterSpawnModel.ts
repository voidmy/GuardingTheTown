import { COMBAT_UNIT } from '../combat/CombatNumbers';

export enum MonsterSpawnEdge {
    Top = 'top',
    Bottom = 'bottom',
    Left = 'left',
    Right = 'right',
}

export enum MonsterSpawnFormation {
    Line = 'line',
    Staggered = 'staggered',
}

export enum MonsterRank {
    Normal = 'normal',
    Elite = 'elite',
    Boss = 'boss',
}

export interface MonsterDefinition {
    id: string;
    displayName: string;
    rank: MonsterRank;
    /** Optional key for a dedicated visual prefab. */
    prefabKey?: string;
    /** Authored death animation duration, in seconds at the prefab's playback speed. */
    deathAnimationDuration?: number;
    maximumActiveCount?: number;
    pressureCost: number;
    maximumHealth: number;
    size: number;
    /** Body circle used by projectile and area attacks. */
    hitRadius: number;
    /** Vertical hit-circle offset from the movement/separation center. */
    hitOffsetY: number;
    /** Smaller circle used for separation and movement. */
    bodyRadius: number;
    mass: number;
    contactDamageMultiplier: number;
    /** Full-speed movement before applying battle progress, entrance and frost multipliers. */
    moveSpeed: number;
    /** Stable per-monster target offset range; this is not an occupancy slot. */
    targetOffsetMin: number;
    targetOffsetMax: number;
    /** Base interval for refreshing the target snapshot. */
    targetRefreshInterval: number;
}

export interface MonsterSpawnEntranceDefinition {
    id: string;
    edge: MonsterSpawnEdge;
    /** Position along the edge, from -1 to 1. */
    coordinate: number;
    /** Width of the entrance along the edge, in normalized screen units. */
    span: number;
    /** Empty space between the monster's inner edge and the visible battlefield. */
    clearance: number;
    /** Compensates for the longer route from horizontal screen edges. */
    moveSpeedMultiplier: number;
}

export interface MonsterSpecialSpawnDefinition {
    /** Time since the start of this wave. */
    atTime: number;
    monsterId: string;
    entranceId: string;
    count: number;
    /** Only this authored boss can complete the chapter. */
    objective?: boolean;
    maximumHealth?: number;
}

export interface MonsterWaveVariant {
    name: string;
    hint: string;
    entranceIds: readonly string[];
    formation: MonsterSpawnFormation;
}

export interface MonsterWaveDefinition {
    id: string;
    displayName: string;
    monsterId: string;
    entranceIds: readonly string[];
    formation: MonsterSpawnFormation;
    /** Major wave duration; enemy composition changes only after this time. */
    duration: number;
    /** Finite reinforcement budget, never a minimum population to refill. */
    totalMonsters: number;
    /** No regular reinforcements during the tail of the wave. */
    restDuration: number;
    maximumHealth: number;
    /** Fraction of low-health enemies retained for experience and clearing feedback. */
    fodderRatio: number;
    variants?: readonly MonsterWaveVariant[];
    monstersPerBatch: number;
    startDelay: number;
    spawnInterval: number;
    /** Hard population ceiling for this wave. */
    activeMonsterLimit: number;
    /** Blocked elites/objectives carry over instead of being lost at a boundary. */
    specialSpawns?: readonly MonsterSpecialSpawnDefinition[];
}

export interface MonsterLevelDefinition {
    id: string;
    maximumActiveMonsters: number;
    loop: boolean;
    monsters: readonly MonsterDefinition[];
    entrances: readonly MonsterSpawnEntranceDefinition[];
    waves: readonly MonsterWaveDefinition[];
}

export interface MonsterSpawnBatchCommand {
    monsterTypeIndex: number;
    entrance: MonsterSpawnEntranceDefinition;
    formation: MonsterSpawnFormation;
    count: number;
    firstMonsterIndex: number;
    batchSize: number;
    batchSequence: number;
    targetOffset?: { x: number; y: number };
    maximumHealth?: number;
    objective?: boolean;
}

const WAVE_VARIANTS: readonly MonsterWaveVariant[] = [
    { name: '正面怪潮', hint: '↑ 北面来袭 · 保持正面火力', entranceIds: ['north-west', 'north', 'north-east'], formation: MonsterSpawnFormation.Line },
    { name: '两侧夹击', hint: '← → 东西交替来袭 · 留意两侧', entranceIds: ['west', 'east'], formation: MonsterSpawnFormation.Staggered },
    { name: '错峰围攻', hint: '↑ → ← 三路分批来袭 · 寻找空隙', entranceIds: ['north', 'east', 'west'], formation: MonsterSpawnFormation.Staggered },
];

/** Ease into chapter one: half speed at departure, full speed when the final boss arrives. */
export function getMonsterMoveSpeedMultiplier (elapsedBattleTime: number): number {
    const progress = Math.max(0, Math.min(1, elapsedBattleTime / 300));
    return 0.5 + 0.5 * progress;
}

/** Separate streams can share a run seed without depending on cosmetic randomness. */
export function createRunRandom (seed: number): () => number {
    let state = (seed >>> 0) || 0x6d2b79f5;
    return () => {
        state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

/** Chapter one: 300 seconds of growth, then the final boss; no endless loop. */
export const DEFAULT_MONSTER_LEVEL: MonsterLevelDefinition = {
    id: 'town-defense-01', maximumActiveMonsters: 360, loop: false,
    monsters: [
        {
            id: 'cotton',
            displayName: '棉团怪',
            rank: MonsterRank.Normal,
            pressureCost: 1,
            maximumHealth: 3 * COMBAT_UNIT,
            size: 56,
            hitRadius: 28,
            hitOffsetY: 0,
            bodyRadius: 24,
            mass: 1,
            contactDamageMultiplier: 1,
            moveSpeed: 130,
            targetOffsetMin: 30,
            targetOffsetMax: 90,
            targetRefreshInterval: 0.75,
        },
        {
            id: 'cotton-king-simple',
            displayName: '棉团精英',
            rank: MonsterRank.Elite,
            prefabKey: 'cotton-king-simple',
            deathAnimationDuration: 0.8,
            maximumActiveCount: 2,
            pressureCost: 12,
            maximumHealth: 60 * COMBAT_UNIT,
            size: 217,
            hitRadius: 78,
            hitOffsetY: 88,
            bodyRadius: 64,
            mass: 4,
            contactDamageMultiplier: 2,
            moveSpeed: 160,
            targetOffsetMin: 0,
            targetOffsetMax: 20,
            targetRefreshInterval: 0.6,
        },
        {
            id: 'moss-stone-king',
            displayName: '苔石拳王',
            rank: MonsterRank.Boss,
            prefabKey: 'moss-stone-king',
            deathAnimationDuration: 1.4,
            maximumActiveCount: 1,
            pressureCost: 30,
            maximumHealth: 300 * COMBAT_UNIT,
            // Root-to-head/side spawn clearance; exclude the transparent shockwave bounds.
            size: 250,
            hitRadius: 116,
            hitOffsetY: 116,
            bodyRadius: 96,
            mass: 8,
            contactDamageMultiplier: 3,
            moveSpeed: 100,
            targetOffsetMin: 0,
            targetOffsetMax: 12,
            targetRefreshInterval: 0.6,
        },
    ],
    entrances: [
        { id: 'north-intro', edge: MonsterSpawnEdge.Top, coordinate: 0, span: 0.12,
            clearance: 72, moveSpeedMultiplier: 1 },
        {
            id: 'north',
            edge: MonsterSpawnEdge.Top,
            coordinate: 0,
            span: 0.72,
            clearance: 72,
            moveSpeedMultiplier: 1,
        },
        {
            id: 'north-west',
            edge: MonsterSpawnEdge.Top,
            coordinate: -0.5,
            span: 0.34,
            clearance: 72,
            moveSpeedMultiplier: 1,
        },
        {
            id: 'north-east',
            edge: MonsterSpawnEdge.Top,
            coordinate: 0.5,
            span: 0.34,
            clearance: 72,
            moveSpeedMultiplier: 1,
        },
        {
            id: 'east',
            edge: MonsterSpawnEdge.Right,
            coordinate: 0.2,
            span: 0.56,
            clearance: 72,
            moveSpeedMultiplier: 1.15,
        },
        {
            id: 'west',
            edge: MonsterSpawnEdge.Left,
            coordinate: -0.2,
            span: 0.56,
            clearance: 72,
            moveSpeedMultiplier: 1.15,
        },
    ],
    waves: [
        { id: 'arrival', displayName: '初守小镇', duration: 20, monsterId: 'cotton',
            entranceIds: ['north-intro'], formation: MonsterSpawnFormation.Line,
            totalMonsters: 18, monstersPerBatch: 3, startDelay: 1, spawnInterval: 2,
            restDuration: 6, activeMonsterLimit: 24, maximumHealth: 3 * COMBAT_UNIT, fodderRatio: 0 },
        { id: 'first-harvest', displayName: '初试锋芒', duration: 30, monsterId: 'cotton',
            entranceIds: ['north'], formation: MonsterSpawnFormation.Staggered,
            totalMonsters: 40, monstersPerBatch: 5, startDelay: 1, spawnInterval: 3,
            restDuration: 6, activeMonsterLimit: 48, maximumHealth: 4 * COMBAT_UNIT, fodderRatio: 0 },
        { id: 'first-pressure', displayName: '群怪压境', duration: 30, monsterId: 'cotton',
            entranceIds: ['north'], formation: MonsterSpawnFormation.Line, variants: WAVE_VARIANTS,
            totalMonsters: 70, monstersPerBatch: 7, startDelay: 3, spawnInterval: 2.3,
            restDuration: 5, activeMonsterLimit: 80, maximumHealth: 5 * COMBAT_UNIT, fodderRatio: 0.2 },
        { id: 'breakthrough', displayName: '破阵收割', duration: 50, monsterId: 'cotton',
            entranceIds: ['north-west', 'north-east'], formation: MonsterSpawnFormation.Staggered,
            totalMonsters: 110, monstersPerBatch: 10, startDelay: 3, spawnInterval: 3.5,
            restDuration: 10, activeMonsterLimit: 100, maximumHealth: 5.5 * COMBAT_UNIT, fodderRatio: 0.3 },
        { id: 'elite-trial', displayName: '精英试炼', duration: 50, monsterId: 'cotton',
            entranceIds: ['north'], formation: MonsterSpawnFormation.Line, variants: WAVE_VARIANTS,
            totalMonsters: 100, monstersPerBatch: 8, startDelay: 3, spawnInterval: 3,
            restDuration: 10, activeMonsterLimit: 100, maximumHealth: 7 * COMBAT_UNIT, fodderRatio: 0.2,
            specialSpawns: [{ atTime: 8, monsterId: 'cotton-king-simple', entranceId: 'north', count: 1, maximumHealth: 60 * COMBAT_UNIT }] },
        { id: 'evolution-harvest', displayName: '势如破竹', duration: 60, monsterId: 'cotton',
            entranceIds: ['north-west', 'north-east'], formation: MonsterSpawnFormation.Staggered,
            totalMonsters: 200, monstersPerBatch: 10, startDelay: 3, spawnInterval: 2.3,
            restDuration: 10, activeMonsterLimit: 180, maximumHealth: 8 * COMBAT_UNIT, fodderRatio: 0.3 },
        { id: 'last-pressure', displayName: '决战前夜', duration: 60, monsterId: 'cotton',
            entranceIds: ['north'], formation: MonsterSpawnFormation.Staggered, variants: WAVE_VARIANTS,
            totalMonsters: 240, monstersPerBatch: 12, startDelay: 3, spawnInterval: 2.4,
            restDuration: 10, activeMonsterLimit: 240, maximumHealth: 9 * COMBAT_UNIT, fodderRatio: 0.2,
            specialSpawns: [{ atTime: 8, monsterId: 'cotton-king-simple', entranceId: 'north', count: 1, maximumHealth: 90 * COMBAT_UNIT }] },
        { id: 'final-boss', displayName: '苔石拳王', duration: 60, monsterId: 'cotton',
            entranceIds: ['north-west', 'north-east'], formation: MonsterSpawnFormation.Line,
            totalMonsters: 48, monstersPerBatch: 4, startDelay: 5, spawnInterval: 4,
            restDuration: 8, activeMonsterLimit: 96, maximumHealth: 10 * COMBAT_UNIT, fodderRatio: 0.3,
            specialSpawns: [{ atTime: 3, monsterId: 'moss-stone-king', entranceId: 'north', count: 1, maximumHealth: 360 * COMBAT_UNIT, objective: true }] },
    ],
};

interface PendingSpecial { event: MonsterSpecialSpawnDefinition; remaining: number; }

/** Finite authored waves with seeded routes. No per-frame population refill. */
export class MonsterSpawnModel {
    private readonly _monsterTypeById = new Map<string, number>();
    private readonly _entranceById = new Map<string, MonsterSpawnEntranceDefinition>();
    private readonly _scheduledByType = new Map<number, number>();
    private readonly _pendingSpecials: PendingSpecial[] = [];
    private readonly _variantIndices: number[] = [];
    private _waveIndex = 0;
    private _batchIndex = 0;
    private _batchSequence = 0;
    private _specialIndex = 0;
    private _elapsed = 0;
    private _nextBatchTime = 0;
    private _spawnedInWave = 0;
    private _completed = false;
    private _scheduledThisFrame = 0;
    private _seed = 1;

    constructor (private readonly _level: MonsterLevelDefinition) {
        this.validateAndIndexLevel();
        this.reset();
    }

    public get maximumActiveMonsters (): number { return this._level.maximumActiveMonsters; }
    public get currentWaveId (): string { return this.currentWave.id; }
    public get currentWaveName (): string { return this.currentWave.displayName; }
    public get seed (): number { return this._seed; }
    public get routeSignature (): string { return this._variantIndices.join('.'); }
    public get completed (): boolean { return this._completed && this._pendingSpecials.length === 0; }
    public get normalHealth (): number { return this.currentWave.maximumHealth; }
    public get currentWaveNotice (): string {
        if (this._completed) return '最终决战 · 击败苔石拳王即可守住小镇';
        const wave = this.currentWave;
        const event = (wave.specialSpawns ?? [])[this._specialIndex];
        if (event && event.atTime - this._elapsed <= 5) {
            return (event.objective ? '↑ 北面 Boss 来袭' : '↑ 北面精英来袭')
                + ' · ' + Math.max(1, Math.ceil(event.atTime - this._elapsed)) + '秒';
        }
        if (this._elapsed >= wave.duration - wave.restDuration) {
            const next = this._level.waves[this._waveIndex + 1];
            return next ? '收拢经验 · ' + Math.ceil(wave.duration - this._elapsed) + '秒后' + next.displayName
                : '最后增援已结束 · 集中击败拳王';
        }
        return wave.displayName + ' · ' + (this.currentVariant?.hint
            ?? (wave.entranceIds.length === 1 ? '↑ 北面来袭' : '↖ ↗ 北面两路来袭'));
    }

    public reset (seed = 1, previousSignature = ''): void {
        this._seed = (seed >>> 0) || 1;
        const random = createRunRandom(this._seed);
        this._variantIndices.length = 0;
        for (const wave of this._level.waves) {
            this._variantIndices.push(wave.variants ? Math.floor(random() * wave.variants.length) : -1);
        }
        if (this.routeSignature === previousSignature) {
            const index = this._level.waves.findIndex(wave => (wave.variants?.length ?? 0) > 1);
            if (index >= 0) this._variantIndices[index] = (this._variantIndices[index] + 1) % this._level.waves[index].variants!.length;
        }
        this._waveIndex = 0;
        this._batchSequence = 0;
        this._pendingSpecials.length = 0;
        this._scheduledByType.clear();
        this._completed = false;
        this.beginWave();
    }

    public getMonsterDefinition (typeIndex: number): MonsterDefinition {
        const definition = this._level.monsters[typeIndex];
        if (!definition) throw new Error('[MonsterSpawnModel] Unknown monster type: ' + typeIndex);
        return definition;
    }

    public advance (dt: number, activeMonsterCount: number, hardCapacity: number,
        output: MonsterSpawnBatchCommand[], activeCountByType?: ReadonlyMap<number, number>): void {
        output.length = 0;
        if (!Number.isFinite(dt) || dt <= 0 || hardCapacity < 1) return;
        this._scheduledByType.clear();
        this._scheduledThisFrame = 0;
        let remaining = dt;
        // Carry large steps across every crossed boundary, without losing objective events.
        while (remaining > 0 && !this._completed) {
            const wave = this.currentWave;
            const step = Math.min(remaining, wave.duration - this._elapsed);
            this._elapsed += step;
            remaining -= step;
            const events = wave.specialSpawns ?? [];
            while (this._specialIndex < events.length && events[this._specialIndex].atTime <= this._elapsed + 1e-7) {
                const event = events[this._specialIndex++];
                this._pendingSpecials.push({ event, remaining: event.count });
            }
            this.scheduleSpecials(activeMonsterCount, hardCapacity, output, activeCountByType);
            const type = this._monsterTypeById.get(wave.monsterId)!;
            while (this._nextBatchTime <= this._elapsed + 1e-7
                && this._nextBatchTime < wave.duration - wave.restDuration
                && this._spawnedInWave < wave.totalMonsters) {
                this._nextBatchTime += wave.spawnInterval;
                // Reserve three slots for scripted elites/boss, including when normal waves are full.
                const count = Math.min(wave.monstersPerBatch, wave.totalMonsters - this._spawnedInWave,
                    Math.max(0, Math.min(hardCapacity - 3, this.maximumActiveMonsters - 3, wave.activeMonsterLimit)
                        - activeMonsterCount - this._scheduledThisFrame), this.typeCapacity(type, activeCountByType));
                if (count <= 0) continue;
                const variant = this.currentVariant;
                const entrances = variant?.entranceIds ?? wave.entranceIds;
                const entrance = this._entranceById.get(entrances[this._batchIndex % entrances.length])!;
                const formation = variant?.formation ?? wave.formation;
                const fodder = Math.floor((this._spawnedInWave + count) * wave.fodderRatio)
                    - Math.floor(this._spawnedInWave * wave.fodderRatio);
                for (let groupIndex = 0; groupIndex < 2; groupIndex++) {
                    const isFodder = groupIndex === 0;
                    const group = isFodder ? fodder : count - fodder;
                    if (group === 0) continue;
                    output.push({ monsterTypeIndex: type, entrance, formation, count: group,
                        firstMonsterIndex: isFodder ? 0 : fodder, batchSize: count,
                        batchSequence: this._batchSequence, maximumHealth: isFodder
                            ? Math.max(3 * COMBAT_UNIT, Math.ceil(wave.maximumHealth * 0.65)) : wave.maximumHealth });
                }
                this.recordScheduled(type, count);
                this._spawnedInWave += count;
                this._batchIndex++;
                this._batchSequence++;
            }
            if (this._elapsed + 1e-7 < wave.duration) break;
            if (this._waveIndex === this._level.waves.length - 1) this._completed = true;
            else { this._waveIndex++; this.beginWave(); }
        }
        // Critical events keep retrying even after the final reinforcement window.
        this.scheduleSpecials(activeMonsterCount, hardCapacity, output, activeCountByType);
    }

    private get currentWave (): MonsterWaveDefinition { return this._level.waves[this._waveIndex]; }
    private get currentVariant (): MonsterWaveVariant | undefined {
        return this.currentWave.variants?.[this._variantIndices[this._waveIndex]];
    }
    private beginWave (): void {
        this._elapsed = 0; this._batchIndex = 0; this._specialIndex = 0; this._spawnedInWave = 0;
        this._nextBatchTime = this.currentWave.startDelay;
    }
    private recordScheduled (type: number, count: number): void {
        this._scheduledThisFrame += count;
        this._scheduledByType.set(type, (this._scheduledByType.get(type) ?? 0) + count);
    }
    private typeCapacity (type: number, active?: ReadonlyMap<number, number>): number {
        return Math.max(0, (this.getMonsterDefinition(type).maximumActiveCount ?? Infinity)
            - (active?.get(type) ?? 0) - (this._scheduledByType.get(type) ?? 0));
    }
    private scheduleSpecials (active: number, capacity: number, output: MonsterSpawnBatchCommand[],
        byType?: ReadonlyMap<number, number>): void {
        // An occupied elite slot must not block the final boss behind it.
        for (let index = 0; index < this._pendingSpecials.length;) {
            const pending = this._pendingSpecials[index];
            const event = pending.event;
            const type = this._monsterTypeById.get(event.monsterId)!;
            const count = Math.min(pending.remaining, this.typeCapacity(type, byType),
                Math.max(0, Math.min(capacity, this.maximumActiveMonsters) - active - this._scheduledThisFrame));
            if (count > 0) {
                output.push({ monsterTypeIndex: type, entrance: this._entranceById.get(event.entranceId)!,
                    formation: MonsterSpawnFormation.Line, count, firstMonsterIndex: event.count - pending.remaining,
                    batchSize: event.count, batchSequence: this._batchSequence++, maximumHealth: event.maximumHealth,
                    objective: event.objective });
                this.recordScheduled(type, count);
                pending.remaining -= count;
            }
            if (pending.remaining === 0) this._pendingSpecials.splice(index, 1);
            else index++;
        }
    }

    private validateAndIndexLevel (): void {
        const fail = (message: string): never => { throw new Error('[MonsterSpawnModel] ' + message); };
        if (this._level.loop || !this._level.waves.length || !this._level.entrances.length
            || !this._level.monsters.length || this._level.monsters.length > 256
            || !Number.isInteger(this.maximumActiveMonsters) || this.maximumActiveMonsters < 4) fail('Invalid chapter.');
        this._level.monsters.forEach((monster, index) => {
            if (this._monsterTypeById.has(monster.id) || [monster.maximumHealth, monster.pressureCost,
                monster.size, monster.hitRadius, monster.bodyRadius, monster.mass, monster.contactDamageMultiplier,
                monster.moveSpeed, monster.targetRefreshInterval].some(value => !Number.isFinite(value) || value <= 0)
                || !Number.isFinite(monster.hitOffsetY)
                || !Number.isFinite(monster.targetOffsetMin) || !Number.isFinite(monster.targetOffsetMax)
                || monster.targetOffsetMin < 0 || monster.targetOffsetMax < monster.targetOffsetMin
                || !Object.values(MonsterRank).includes(monster.rank)
                || monster.maximumActiveCount !== undefined && (!Number.isInteger(monster.maximumActiveCount) || monster.maximumActiveCount < 1)) fail('Invalid monster: ' + monster.id);
            this._monsterTypeById.set(monster.id, index);
        });
        for (const entrance of this._level.entrances) {
            if (this._entranceById.has(entrance.id) || !Object.values(MonsterSpawnEdge).includes(entrance.edge)
                || !Number.isFinite(entrance.coordinate) || Math.abs(entrance.coordinate) > 1
                || !Number.isFinite(entrance.span) || entrance.span < 0 || entrance.span > 2
                || !Number.isFinite(entrance.clearance) || entrance.clearance < 0
                || !Number.isFinite(entrance.moveSpeedMultiplier) || entrance.moveSpeedMultiplier <= 0) fail('Invalid entrance: ' + entrance.id);
            this._entranceById.set(entrance.id, entrance);
        }
        const ids = new Set<string>();
        let objectives = 0;
        for (const wave of this._level.waves) {
            if (ids.has(wave.id) || !this._monsterTypeById.has(wave.monsterId)
                || [wave.duration, wave.spawnInterval, wave.maximumHealth].some(value => !Number.isFinite(value) || value <= 0)
                || [wave.totalMonsters, wave.restDuration, wave.startDelay].some(value => !Number.isFinite(value) || value < 0)
                || !Number.isInteger(wave.totalMonsters) || wave.startDelay >= wave.duration - wave.restDuration
                || !Number.isInteger(wave.monstersPerBatch) || wave.monstersPerBatch < 1
                || !Number.isInteger(wave.activeMonsterLimit) || wave.activeMonsterLimit < 1 || wave.activeMonsterLimit > this.maximumActiveMonsters
                || !Number.isFinite(wave.fodderRatio) || wave.fodderRatio < 0 || wave.fodderRatio > 1) fail('Invalid wave: ' + wave.id);
            ids.add(wave.id);
            for (const entrances of [wave.entranceIds, ...(wave.variants ?? []).map(variant => variant.entranceIds)]) {
                if (!entrances.length || entrances.some(id => !this._entranceById.has(id))) fail('Invalid wave entrances.');
            }
            if (wave.variants && !wave.variants.length) fail('Empty variants.');
            let previous = -1;
            for (const event of wave.specialSpawns ?? []) {
                if (!Number.isFinite(event.atTime) || event.atTime < 0 || event.atTime >= wave.duration || event.atTime < previous
                    || !Number.isInteger(event.count) || event.count < 1 || !this._monsterTypeById.has(event.monsterId)
                    || !this._entranceById.has(event.entranceId)
                    || event.maximumHealth !== undefined && (!Number.isFinite(event.maximumHealth) || event.maximumHealth <= 0)) fail('Invalid event.');
                if (event.objective) {
                    objectives += event.count;
                    if (wave !== this._level.waves[this._level.waves.length - 1]
                        || this.getMonsterDefinition(this._monsterTypeById.get(event.monsterId)!).rank !== MonsterRank.Boss) fail('Invalid objective.');
                }
                previous = event.atTime;
            }
        }
        if (objectives !== 1) fail('Chapter requires exactly one final boss.');
    }
}
