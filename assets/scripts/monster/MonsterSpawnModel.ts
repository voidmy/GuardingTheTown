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

export interface MonsterDefinition {
    id: string;
    displayName: string;
    pressureCost: number;
    maximumHealth: number;
    size: number;
    moveSpeed: number;
    maximumSpeed: number;
    /** Maximum velocity change per second when steering toward a target. */
    steeringAcceleration: number;
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

export interface MonsterWaveDefinition {
    id: string;
    displayName: string;
    monsterId: string;
    entranceIds: readonly string[];
    formation: MonsterSpawnFormation;
    /** Major wave duration; enemy composition changes only after this time. */
    duration: number;
    /** A spawn check fills up to this population before adding a normal batch. */
    minimumActiveMonsters: number;
    monstersPerBatch: number;
    startDelay: number;
    spawnInterval: number;
    /** Hard population ceiling for this wave. */
    activeMonsterLimit: number;
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
}

/**
 * Horde baseline adapted from published Vampire Survivors Mad Forest data:
 * 60-second composition windows and 1 / 1 / 0.5 / 0.25-second spawn checks.
 * Its 15 / 30 / 50 / 40 minimum populations and 300 normal-enemy cap are
 * scaled by the current 2556x1179-to-1280x720 battlefield area ratio (~3.27).
 * The 70px/s common-enemy speed is the current 260px/s player speed multiplied
 * by Brotato's slow-enemy-to-player ratio (120 / 450), then rounded.
 */
export const DEFAULT_MONSTER_LEVEL: MonsterLevelDefinition = {
    id: 'greybox-level-01',
    maximumActiveMonsters: 2000,
    loop: true,
    monsters: [
        {
            id: 'cotton',
            displayName: '棉团怪',
            pressureCost: 1,
            maximumHealth: 3,
            size: 56,
            moveSpeed: 70,
            maximumSpeed: 90,
            steeringAcceleration: 90,
            targetOffsetMin: 30,
            targetOffsetMax: 90,
            targetRefreshInterval: 0.75,
        },
    ],
    entrances: [
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
        {
            id: 'intro',
            displayName: '单路教学',
            monsterId: 'cotton',
            entranceIds: ['north'],
            formation: MonsterSpawnFormation.Line,
            duration: 60,
            minimumActiveMonsters: 50,
            monstersPerBatch: 8,
            startDelay: 2,
            spawnInterval: 1,
            activeMonsterLimit: 2000,
        },
        {
            id: 'mowing',
            displayName: '割草波',
            monsterId: 'cotton',
            entranceIds: ['north-west', 'north-east'],
            formation: MonsterSpawnFormation.Staggered,
            duration: 60,
            minimumActiveMonsters: 100,
            monstersPerBatch: 10,
            startDelay: 0,
            spawnInterval: 1,
            activeMonsterLimit: 2000,
        },
        {
            id: 'flank',
            displayName: '侧路压力',
            monsterId: 'cotton',
            entranceIds: ['east'],
            formation: MonsterSpawnFormation.Staggered,
            duration: 60,
            minimumActiveMonsters: 165,
            monstersPerBatch: 12,
            startDelay: 0,
            spawnInterval: 0.5,
            activeMonsterLimit: 2000,
        },
        {
            id: 'surround',
            displayName: '多路高压',
            monsterId: 'cotton',
            entranceIds: ['north', 'east', 'west'],
            formation: MonsterSpawnFormation.Staggered,
            duration: 60,
            minimumActiveMonsters: 130,
            monstersPerBatch: 12,
            startDelay: 0,
            spawnInterval: 0.25,
            activeMonsterLimit: 2000,
        },
    ],
};

/** Stateful scheduler that turns level data into deterministic spawn batches. */
export class MonsterSpawnModel {
    private readonly _monsterTypeById = new Map<string, number>();
    private readonly _entranceById = new Map<string, MonsterSpawnEntranceDefinition>();
    private _waveIndex = 0;
    private _batchIndex = 0;
    private _batchSequence = 0;
    private _timeRemainingInWave = 0;
    private _timeUntilNextBatch = 0;
    private _completed = false;

    constructor (private readonly _level: MonsterLevelDefinition) {
        this.validateAndIndexLevel();
        this.reset();
    }

    public get maximumActiveMonsters (): number {
        return this._level.maximumActiveMonsters;
    }

    public get currentWaveId (): string {
        return this.currentWave.id;
    }

    public get currentWaveName (): string {
        return this.currentWave.displayName;
    }

    public reset (): void {
        this._waveIndex = 0;
        this._batchIndex = 0;
        this._batchSequence = 0;
        this._completed = false;
        this._timeRemainingInWave = this.currentWave.duration;
        this._timeUntilNextBatch = Math.max(0, this.currentWave.startDelay);
    }

    public getMonsterDefinition (typeIndex: number): MonsterDefinition {
        const definition = this._level.monsters[typeIndex];
        if (!definition) {
            throw new Error(`[MonsterSpawnModel] Unknown monster type index: ${typeIndex}`);
        }
        return definition;
    }

    /**
     * Advances a real-time wave clock. Spawn checks keep a minimum population
     * and add regular batches until the active ceiling is reached. The wave
     * clock never pauses at capacity, matching minute-based horde directors.
     */
    public advance (
        dt: number,
        activeMonsterCount: number,
        hardCapacity: number,
        output: MonsterSpawnBatchCommand[],
    ): void {
        output.length = 0;
        if (this._completed || dt <= 0 || hardCapacity <= 0) return;

        this._timeRemainingInWave -= dt;
        if (this._timeRemainingInWave <= 0) {
            const overrun = -this._timeRemainingInWave;
            this.advanceWave();
            if (this._completed) return;
            this._timeRemainingInWave = Math.max(
                0.001,
                this.currentWave.duration - overrun,
            );
            this._timeUntilNextBatch = Math.max(0, this.currentWave.startDelay);
            return;
        }

        this._timeUntilNextBatch -= dt;
        let scheduledMonsterCount = 0;
        for (let guard = 0; guard < 64 && this._timeUntilNextBatch <= 0; guard++) {
            const wave = this.currentWave;
            this._timeUntilNextBatch += wave.spawnInterval;
            const availableCapacity = this.getAvailableCapacity(
                activeMonsterCount,
                scheduledMonsterCount,
                hardCapacity,
            );
            if (availableCapacity <= 0) continue;

            const missingFromMinimum = Math.max(
                0,
                wave.minimumActiveMonsters
                    - activeMonsterCount
                    - scheduledMonsterCount,
            );
            const requestedCount = Math.max(
                wave.monstersPerBatch,
                missingFromMinimum,
            );
            const count = Math.min(requestedCount, availableCapacity);
            if (count <= 0) continue;

            const entranceId = wave.entranceIds[
                this._batchIndex % wave.entranceIds.length
            ];
            output.push({
                monsterTypeIndex: this._monsterTypeById.get(wave.monsterId)!,
                entrance: this._entranceById.get(entranceId)!,
                formation: wave.formation,
                count,
                firstMonsterIndex: 0,
                batchSize: count,
                batchSequence: this._batchSequence,
            });

            scheduledMonsterCount += count;
            this._batchSequence++;
            this._batchIndex++;
        }
    }

    private get currentWave (): MonsterWaveDefinition {
        return this._level.waves[this._waveIndex];
    }

    private getAvailableCapacity (
        activeMonsterCount: number,
        scheduledMonsterCount: number,
        hardCapacity: number,
    ): number {
        const activeLimit = Math.min(
            hardCapacity,
            this._level.maximumActiveMonsters,
            this.currentWave.activeMonsterLimit,
        );
        return Math.max(0, activeLimit - activeMonsterCount - scheduledMonsterCount);
    }

    private advanceWave (): void {
        this._batchIndex = 0;
        this._waveIndex++;
        if (this._waveIndex < this._level.waves.length) return;

        if (this._level.loop) {
            this._waveIndex = 0;
        } else {
            this._waveIndex = this._level.waves.length - 1;
            this._completed = true;
        }
    }

    private validateAndIndexLevel (): void {
        if (this._level.monsters.length === 0
            || this._level.entrances.length === 0
            || this._level.waves.length === 0) {
            throw new Error('[MonsterSpawnModel] Level needs monsters, entrances and waves.');
        }
        if (!Number.isInteger(this._level.maximumActiveMonsters)
            || this._level.maximumActiveMonsters < 1) {
            throw new Error('[MonsterSpawnModel] maximumActiveMonsters must be positive.');
        }
        if (this._level.monsters.length > 256) {
            throw new Error('[MonsterSpawnModel] At most 256 monster types are supported.');
        }

        this._level.monsters.forEach((definition, index) => {
            if (this._monsterTypeById.has(definition.id)) {
                throw new Error(`[MonsterSpawnModel] Duplicate monster id: ${definition.id}`);
            }
            const stats = [
                definition.pressureCost,
                definition.maximumHealth,
                definition.size,
                definition.moveSpeed,
                definition.maximumSpeed,
                definition.steeringAcceleration,
                definition.targetRefreshInterval,
            ];
            if (stats.some((value) => !Number.isFinite(value) || value <= 0)) {
                throw new Error(`[MonsterSpawnModel] Monster ${definition.id} has invalid stats.`);
            }
            if (!Number.isFinite(definition.targetOffsetMin)
                || !Number.isFinite(definition.targetOffsetMax)
                || definition.targetOffsetMin < 0
                || definition.targetOffsetMax < definition.targetOffsetMin) {
                throw new Error(`[MonsterSpawnModel] Monster ${definition.id} has invalid target offsets.`);
            }
            this._monsterTypeById.set(definition.id, index);
        });

        for (const entrance of this._level.entrances) {
            if (this._entranceById.has(entrance.id)) {
                throw new Error(`[MonsterSpawnModel] Duplicate entrance id: ${entrance.id}`);
            }
            if (!Number.isFinite(entrance.coordinate)
                || !Number.isFinite(entrance.span)
                || !Number.isFinite(entrance.clearance)
                || !Number.isFinite(entrance.moveSpeedMultiplier)
                || entrance.coordinate < -1 || entrance.coordinate > 1
                || entrance.span < 0 || entrance.span > 2
                || entrance.clearance < 0
                || entrance.moveSpeedMultiplier <= 0) {
                throw new Error(`[MonsterSpawnModel] Entrance ${entrance.id} has invalid bounds.`);
            }
            this._entranceById.set(entrance.id, entrance);
        }

        for (const wave of this._level.waves) {
            if (!this._monsterTypeById.has(wave.monsterId)) {
                throw new Error(`[MonsterSpawnModel] Wave ${wave.id} has unknown monster ${wave.monsterId}.`);
            }
            if (wave.entranceIds.length === 0) {
                throw new Error(`[MonsterSpawnModel] Wave ${wave.id} needs an entrance.`);
            }
            const timing = [wave.duration, wave.startDelay, wave.spawnInterval];
            if (!Number.isInteger(wave.minimumActiveMonsters)
                || wave.minimumActiveMonsters < 0
                || !Number.isInteger(wave.monstersPerBatch) || wave.monstersPerBatch < 1
                || timing.some((value) => !Number.isFinite(value) || value < 0)
                || wave.duration <= 0
                || wave.spawnInterval <= 0
                || !Number.isInteger(wave.activeMonsterLimit)
                || wave.activeMonsterLimit < 1
                || wave.minimumActiveMonsters > wave.activeMonsterLimit
                || wave.activeMonsterLimit > this._level.maximumActiveMonsters) {
                throw new Error(`[MonsterSpawnModel] Wave ${wave.id} has invalid timing or limits.`);
            }
            for (const entranceId of wave.entranceIds) {
                if (!this._entranceById.has(entranceId)) {
                    throw new Error(`[MonsterSpawnModel] Wave ${wave.id} has unknown entrance ${entranceId}.`);
                }
            }
        }
    }
}
