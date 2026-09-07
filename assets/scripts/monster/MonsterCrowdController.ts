import {
    _decorator,
    Component,
    Label,
    Node,
    Prefab,
    UITransform,
    Vec2,
    Vec3,
    view,
} from 'cc';
import {
    MAX_BATCH_MONSTERS,
    MONSTERS_PER_RENDERER,
    MonsterBatchRenderer,
} from './MonsterBatchRenderer';
import {
    DEFAULT_MONSTER_LEVEL,
    MonsterSpawnBatchCommand,
    MonsterSpawnEdge,
    MonsterSpawnFormation,
    MonsterSpawnModel,
} from './MonsterSpawnModel';
import { TargetMover } from './TargetMover';
import { AbilityController } from '../combat/AbilityController';
import {
    BasicAttackAbility,
    BasicAttackAbilityOptions,
} from '../combat/BasicAttackAbility';
import {
    AbilityFrameContext,
    DamageInfo,
    EnemyCombatWorld,
    EnemyId,
} from '../combat/CombatTypes';
import {
    PiercingArrowAbility,
    PiercingArrowAbilityOptions,
} from '../combat/PiercingArrowAbility';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import {
    UpgradeOption,
    UpgradeSelectionPanel,
    UpgradeSlotOptions,
} from '../ui/UpgradeSelectionPanel';
import { QiBladeAbility, QiBladeAbilityOptions } from '../combat/QiBladeAbility';
import { TornadoAbility, TornadoAbilityOptions } from '../combat/TornadoAbility';
import { GameSettings, GameSkill } from '../GameSettings';
import { CharacterStats } from '../player/CharacterStats';
import { DamageNumberBatchRenderer } from '../ui/DamageNumberBatchRenderer';

const { ccclass, menu, property } = _decorator;
const HASH_COORDINATE_MASK = 0xffff;
const ALL_GAME_SKILLS: readonly GameSkill[] = [
    GameSkill.BasicAttack,
    GameSkill.PiercingArrow,
    GameSkill.QiBlade,
    GameSkill.Tornado,
];
const SKILL_NAMES: Readonly<Record<GameSkill, string>> = {
    [GameSkill.BasicAttack]: '基础射击',
    [GameSkill.PiercingArrow]: '穿透箭',
    [GameSkill.QiBlade]: '气刃环',
    [GameSkill.Tornado]: '龙卷风',
};

@ccclass('MonsterCrowdController')
@menu('Gameplay/Monster Crowd Controller')
export class MonsterCrowdController extends Component implements EnemyCombatWorld {
    @property(Node)
    public renderLayer: Node | null = null;

    @property(Node)
    public target: Node | null = null;

    @property(Prefab)
    public bulletPrefab: Prefab | null = null;

    @property(Prefab)
    public arrowPrefab: Prefab | null = null;

    @property(Prefab)
    public qiBladePrefab: Prefab | null = null;

    @property(Prefab)
    public tornadoPrefab: Prefab | null = null;

    @property({ visible: false })
    public enableBasicAttack = true;

    @property({ visible: false })
    public enablePiercingArrow = true;

    @property({ visible: false })
    public enableQiBlade = true;

    @property({ visible: false })
    public enableTornado = true;

    @property(Node)
    public countLabelNode: Node | null = null;

    @property(Node)
    public upgradePanelNode: Node | null = null;

    @property({ displayName: '首次升级所需击杀', min: 1, step: 1 })
    public firstUpgradeKills = 1;

    @property({ displayName: '后续升级击杀递增', min: 1, step: 1 })
    public killsPerUpgrade = 10;

    @property({ min: 1, max: MAX_BATCH_MONSTERS, step: 1 })
    public maximumMonsters = 2000;

    @property({ min: 1 })
    public monsterHealthGrowthInterval = 60;

    @property({ min: 0 })
    public monsterHealthGrowthPerInterval = 1;

    @property({ min: 0, max: 1, step: 0.01 })
    public monsterHitFlashDuration = 0.1;

    @property({ min: 1 })
    public separationDistance = 48;

    @property({ min: 0 })
    public separationStrength = 105;

    @property({ min: 0 })
    public stopRadius = 76;

    @property({ min: 1 })
    public slowRadius = 150;

    @property({ min: 1 })
    public playerContactRadius = 76;

    @property({ min: 0 })
    public playerContactDamage = 5;

    @property({ min: 0.05 })
    public playerDamageInterval = 0.5;

    @property({ min: 1, max: 2, step: 1 })
    public correctionIterations = 2;

    @property({ min: 0.02 })
    public fireInterval = 0.5;

    @property({ min: 1, step: 1 })
    public bulletsPerShot = 1;

    @property({ min: 1 })
    public bulletSpeed = 650;

    @property({ min: 0.1 })
    public bulletLifetime = 2.5;

    @property({ min: 1 })
    public bulletAttackRange = 500;

    @property({ min: 1 })
    public bulletHitRadius = 34;

    @property({ min: 0 })
    public bulletDamage = 1;

    @property({ min: 0.1 })
    public arrowInterval = 1;

    @property({ min: 1 })
    public arrowSpeed = 900;

    @property({ min: 0 })
    public arrowSpawnOffset = 48;

    @property({ min: 1 })
    public arrowHitRadius = 34;

    @property({ min: 0 })
    public arrowDamage = 1;

    @property({ displayName: 'Qi Blade Hit Radius', min: 1 })
    public qiBladeHitRadius = 48;

    @property({ min: 0.05 })
    public qiBladeDamageInterval = 0.2;

    @property
    public qiBladeRotationSpeed = -100;

    @property
    public qiBladeSelfRotationSpeed = -360;

    @property({ min: 0 })
    public qiBladeDamage = 1;

    @property({ min: 0.1 })
    public tornadoSpawnInterval = 3;

    @property({ min: 0.1 })
    public tornadoDuration = 10;

    @property({ min: 1 })
    public tornadoPullRadius = 190;

    @property({ min: 0 })
    public tornadoPullSpeed = 140;

    @property({ min: 0 })
    public tornadoPullStopRadius = 24;

    @property
    public tornadoRotationSpeed = 150;

    @property({ min: 0.05 })
    public tornadoDamageInterval = 0.5;

    @property({ min: 0 })
    public tornadoDamage = 1;

    private _batches: MonsterBatchRenderer[] = [];
    private _renderTransform: UITransform | null = null;
    private _countLabel: Label | null = null;
    private _count = 0;
    private _lastDisplayedCount = -1;
    private _lastDisplayedKillCount = -1;
    private _totalKillCount = 0;
    private _nextUpgradeKillCount = 1;
    private _currentUpgradeKillRequirement = 1;
    private _playerLevel = 1;
    private _nextPlayerDamageTime = 0;
    private _elapsedBattleTime = 0;
    private _isChoosingUpgrade = false;
    private _targetMoverWasEnabled = false;
    private _capacity = 0;
    private _positionsX = new Float32Array(0);
    private _positionsY = new Float32Array(0);
    private _velocitiesX = new Float32Array(0);
    private _velocitiesY = new Float32Array(0);
    private _separationX = new Float32Array(0);
    private _separationY = new Float32Array(0);
    private _moveSpeedMultipliers = new Float32Array(0);
    private _targetSnapshotsX = new Float32Array(0);
    private _targetSnapshotsY = new Float32Array(0);
    private _targetOffsetsX = new Float32Array(0);
    private _targetOffsetsY = new Float32Array(0);
    private _targetRefreshTimers = new Float32Array(0);
    private _targetRefreshIntervals = new Float32Array(0);
    private _monsterTypeIndices = new Uint8Array(0);
    private _health = new Float32Array(0);
    private _hitFlashEndTimes = new Float32Array(0);
    private _monsterIds = new Uint32Array(0);
    private readonly _monsterIndexById = new Map<EnemyId, number>();
    private _nextMonsterId: EnemyId = 1;
    private readonly _spawnModel = new MonsterSpawnModel(DEFAULT_MONSTER_LEVEL);
    private readonly _spawnCommands: MonsterSpawnBatchCommand[] = [];
    private readonly _grid = new Map<number, number[]>();
    private _gridValid = false;
    private _gridMinX = 0;
    private _gridMaxX = 0;
    private _gridMinY = 0;
    private _gridMaxY = 0;
    private readonly _targetLocal = new Vec3();
    private readonly _viewportCenterLocal = new Vec3();
    private readonly _facingDirection = new Vec2(1, 0);
    private readonly _segmentHitIndices: number[] = [];
    private readonly _abilityFrameContext: AbilityFrameContext = {
        originX: 0,
        originY: 0,
        facingX: 1,
        facingY: 0,
    };
    private _targetMover: TargetMover | null = null;
    private _characterStats: CharacterStats | null = null;
    private _damageNumberRenderer: DamageNumberBatchRenderer | null = null;
    private _abilityController: AbilityController | null = null;
    private _projectileSystem: ProjectileSystem | null = null;
    private _upgradePanel: UpgradeSelectionPanel | null = null;
    private readonly _learnedSkills = new Set<GameSkill>();
    private readonly _upgradeRanks = new Map<string, number>();
    private _basicAttackOptions: BasicAttackAbilityOptions | null = null;
    private _piercingArrowOptions: PiercingArrowAbilityOptions | null = null;
    private _qiBladeOptions: QiBladeAbilityOptions | null = null;
    private _tornadoOptions: TornadoAbilityOptions | null = null;

    public get monsterCount (): number {
        return this._count;
    }

    public get hasEnemies (): boolean {
        return this._count > 0;
    }

    public findNearestEnemy (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
    ): EnemyId | null {
        const index = this.findNearestMonster(
            originX,
            originY,
            maxDistance,
            insideBoundsOnly,
        );
        return index >= 0 ? this._monsterIds[index] : null;
    }

    public getEnemyPosition (enemyId: EnemyId, out: Vec2): boolean {
        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined) return false;

        out.set(this._positionsX[index], this._positionsY[index]);
        return true;
    }

    public queryEnemiesAlongSegment (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        hitRadius: number,
        results: EnemyId[],
        insideBoundsOnly: boolean,
    ): void {
        results.length = 0;
        const segmentX = endX - startX;
        const segmentY = endY - startY;
        const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
        const hitDistanceSquared = hitRadius * hitRadius;
        const hitIndices = this._segmentHitIndices;
        hitIndices.length = 0;

        const inspectMonster = (index: number): void => {
            if (insideBoundsOnly && !this.isPointInsideCombatBounds(
                this._positionsX[index],
                this._positionsY[index],
            )) return;

            let interpolation = 0;
            if (segmentLengthSquared > 0.0001) {
                interpolation = (
                    (this._positionsX[index] - startX) * segmentX
                    + (this._positionsY[index] - startY) * segmentY
                ) / segmentLengthSquared;
                interpolation = Math.max(0, Math.min(1, interpolation));
            }

            const closestX = startX + segmentX * interpolation;
            const closestY = startY + segmentY * interpolation;
            const deltaX = this._positionsX[index] - closestX;
            const deltaY = this._positionsY[index] - closestY;
            if (deltaX * deltaX + deltaY * deltaY <= hitDistanceSquared) {
                hitIndices.push(index);
            }
        };

        if (!this._gridValid) {
            for (let index = 0; index < this._count; index++) inspectMonster(index);
        } else {
            const cellSize = this.getGridCellSize();
            const minimumCellX = Math.floor(
                (Math.min(startX, endX) - hitRadius) / cellSize,
            );
            const maximumCellX = Math.floor(
                (Math.max(startX, endX) + hitRadius) / cellSize,
            );
            const minimumCellY = Math.floor(
                (Math.min(startY, endY) - hitRadius) / cellSize,
            );
            const maximumCellY = Math.floor(
                (Math.max(startY, endY) + hitRadius) / cellSize,
            );
            for (let gridY = minimumCellY; gridY <= maximumCellY; gridY++) {
                for (let gridX = minimumCellX; gridX <= maximumCellX; gridX++) {
                    const bucket = this._grid.get(this.getCellKey(gridX, gridY));
                    if (!bucket) continue;
                    for (const index of bucket) inspectMonster(index);
                }
            }
        }

        const getInterpolation = (index: number): number => {
            if (segmentLengthSquared <= 0.0001) return 0;
            return (
                (this._positionsX[index] - startX) * segmentX
                + (this._positionsY[index] - startY) * segmentY
            ) / segmentLengthSquared;
        };
        hitIndices.sort((first, second) => getInterpolation(first) - getInterpolation(second));
        for (const index of hitIndices) results.push(this._monsterIds[index]);
    }

    public queryEnemiesInCircle (
        centerX: number,
        centerY: number,
        radius: number,
        results: EnemyId[],
        insideBoundsOnly: boolean,
    ): void {
        results.length = 0;
        const safeRadius = Math.max(0, radius);
        const radiusSquared = safeRadius * safeRadius;

        const inspectMonster = (index: number): void => {
            const x = this._positionsX[index];
            const y = this._positionsY[index];
            if (insideBoundsOnly && !this.isPointInsideCombatBounds(x, y)) return;

            const deltaX = x - centerX;
            const deltaY = y - centerY;
            if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
                results.push(this._monsterIds[index]);
            }
        };

        if (!this._gridValid) {
            for (let index = 0; index < this._count; index++) inspectMonster(index);
            return;
        }

        const cellSize = this.getGridCellSize();
        const minimumCellX = Math.floor((centerX - safeRadius) / cellSize);
        const maximumCellX = Math.floor((centerX + safeRadius) / cellSize);
        const minimumCellY = Math.floor((centerY - safeRadius) / cellSize);
        const maximumCellY = Math.floor((centerY + safeRadius) / cellSize);
        for (let gridY = minimumCellY; gridY <= maximumCellY; gridY++) {
            for (let gridX = minimumCellX; gridX <= maximumCellX; gridX++) {
                const bucket = this._grid.get(this.getCellKey(gridX, gridY));
                if (!bucket) continue;
                for (const index of bucket) inspectMonster(index);
            }
        }
    }

    public pullEnemyToward (
        enemyId: EnemyId,
        targetX: number,
        targetY: number,
        maximumDistance: number,
        stopRadius: number,
    ): boolean {
        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined) return false;

        const deltaX = targetX - this._positionsX[index];
        const deltaY = targetY - this._positionsY[index];
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const safeStopRadius = Math.max(0, stopRadius);
        if (distance <= safeStopRadius || distance < 0.001) return true;

        const moveDistance = Math.min(
            Math.max(0, maximumDistance),
            distance - safeStopRadius,
        );
        this._positionsX[index] += deltaX / distance * moveDistance;
        this._positionsY[index] += deltaY / distance * moveDistance;
        this._velocitiesX[index] *= 0.8;
        this._velocitiesY[index] *= 0.8;
        this._gridValid = false;
        return true;
    }

    public applyDamage (enemyId: EnemyId, damage: DamageInfo): boolean {
        if (this._isChoosingUpgrade) return false;

        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined || damage.amount <= 0) return false;

        const appliedDamage = Math.min(this._health[index], damage.amount);
        const damageX = this._positionsX[index];
        const damageY = this._positionsY[index] + 48;
        this._health[index] -= damage.amount;
        this._hitFlashEndTimes[index] = this._elapsedBattleTime
            + Math.max(0, this.monsterHitFlashDuration);
        this._damageNumberRenderer?.showDamage(
            damageX,
            damageY,
            appliedDamage,
            damage.sourceAbilityId,
        );
        if (this._health[index] <= 0) {
            this.removeMonster(index);
            this.registerKill();
        }
        return true;
    }

    protected start (): void {
        if (!this.renderLayer || !this.target) {
            console.error('[MonsterCrowdController] Render layer and target must be assigned.');
            this.enabled = false;
            return;
        }

        this._batches = this.renderLayer.getComponentsInChildren(MonsterBatchRenderer);
        this._renderTransform = this.renderLayer.getComponent(UITransform);
        this._countLabel = this.countLabelNode?.getComponent(Label) ?? null;
        this._targetMover = this.target.getComponent(TargetMover);
        this._characterStats = this.target.getComponent(CharacterStats);
        this._damageNumberRenderer = this.renderLayer.parent
            ?.getComponentInChildren(DamageNumberBatchRenderer) ?? null;
        if (this.upgradePanelNode) {
            this._upgradePanel = this.upgradePanelNode.getComponent(UpgradeSelectionPanel);
        }
        if (this._batches.length === 0 || !this._renderTransform) {
            console.error('[MonsterCrowdController] Render layer is missing required components.');
            this.enabled = false;
            return;
        }

        const renderCapacity = this._batches.length * MONSTERS_PER_RENDERER;
        this._capacity = Math.min(
            MAX_BATCH_MONSTERS,
            renderCapacity,
            Math.max(1, this.maximumMonsters | 0),
            this._spawnModel.maximumActiveMonsters,
        );
        this._positionsX = new Float32Array(this._capacity);
        this._positionsY = new Float32Array(this._capacity);
        this._velocitiesX = new Float32Array(this._capacity);
        this._velocitiesY = new Float32Array(this._capacity);
        this._separationX = new Float32Array(this._capacity);
        this._separationY = new Float32Array(this._capacity);
        this._moveSpeedMultipliers = new Float32Array(this._capacity);
        this._targetSnapshotsX = new Float32Array(this._capacity);
        this._targetSnapshotsY = new Float32Array(this._capacity);
        this._targetOffsetsX = new Float32Array(this._capacity);
        this._targetOffsetsY = new Float32Array(this._capacity);
        this._targetRefreshTimers = new Float32Array(this._capacity);
        this._targetRefreshIntervals = new Float32Array(this._capacity);
        this._monsterTypeIndices = new Uint8Array(this._capacity);
        this._health = new Float32Array(this._capacity);
        this._hitFlashEndTimes = new Float32Array(this._capacity);
        this._monsterIds = new Uint32Array(this._capacity);
        this._spawnModel.reset();
        this._totalKillCount = 0;
        this._currentUpgradeKillRequirement = Math.max(1, this.firstUpgradeKills | 0);
        this._nextUpgradeKillCount = this._currentUpgradeKillRequirement;
        this._playerLevel = 1;
        this._nextPlayerDamageTime = 0;
        this._elapsedBattleTime = 0;
        this._isChoosingUpgrade = false;
        this._upgradePanel?.hide();
        this._damageNumberRenderer?.clear();
        for (const batch of this._batches) batch.clear();

        this._projectileSystem = new ProjectileSystem(
            this,
            this.renderLayer,
            this._renderTransform,
        );
        this._abilityController = new AbilityController();
        this._learnedSkills.clear();
        this._upgradeRanks.clear();
        this._basicAttackOptions = null;
        this._piercingArrowOptions = null;
        this._qiBladeOptions = null;
        this._tornadoOptions = null;

        const gameSettings = this.node.getComponentInChildren(GameSettings);
        const initialSkill = this.getInitialSkill(gameSettings);
        if (initialSkill === null || !this.addSkill(initialSkill)) {
            console.error('[MonsterCrowdController] 没有可用的初始技能。');
            this.enabled = false;
            return;
        }
        this.updateCountLabel();
    }

    protected lateUpdate (dt: number): void {
        if (this._batches.length === 0 || !this._renderTransform || !this.target) return;
        if (this._isChoosingUpgrade) return;

        const frameDt = Math.min(Math.max(dt, 0), 0.1);
        const simulationDt = Math.min(frameDt, 1 / 30);
        this._elapsedBattleTime += frameDt;
        this._renderTransform.convertToNodeSpaceAR(
            this.target.worldPosition,
            this._targetLocal,
        );
        this.spawnMonsters(frameDt);

        if (this._count > 0) {
            this.rebuildGrid();
            this.calculateSeparation();
            this.calculateVelocities(
                this._targetLocal.x,
                this._targetLocal.y,
                simulationDt,
            );
            this.moveMonsters(simulationDt);
            this.rebuildGrid();
            this.applyPlayerContactDamage();
        }

        if (this._targetMover) {
            this._targetMover.getFacingDirection(this._facingDirection);
        } else {
            this._facingDirection.set(1, 0);
        }
        this._abilityFrameContext.originX = this._targetLocal.x;
        this._abilityFrameContext.originY = this._targetLocal.y;
        this._abilityFrameContext.facingX = this._facingDirection.x;
        this._abilityFrameContext.facingY = this._facingDirection.y;
        this._abilityController?.update(frameDt, this._abilityFrameContext);
        this._projectileSystem?.update(simulationDt);

        if (!this._gridValid && this._count > 1) this.rebuildGrid();

        for (let iteration = 0;
            iteration < this.correctionIterations && this._count > 1;
            iteration++) {
            if (iteration > 0) this.rebuildGrid();
            this.correctOverlaps();
        }

        this.syncRenderData();
        this.updateCountLabel();
    }

    protected onDestroy (): void {
        this._projectileSystem?.clear();
        this._abilityController?.clear();
    }

    private getInitialSkill (gameSettings: GameSettings | null): GameSkill | null {
        const legacySkills = ALL_GAME_SKILLS.filter((skill) => {
            switch (skill) {
            case GameSkill.BasicAttack: return this.enableBasicAttack;
            case GameSkill.PiercingArrow: return this.enablePiercingArrow;
            case GameSkill.QiBlade: return this.enableQiBlade;
            case GameSkill.Tornado: return this.enableTornado;
            default: return false;
            }
        });
        const configuredSkills = gameSettings?.initialSkills ?? legacySkills;
        const uniqueSkills = configuredSkills.filter(
            (skill, index) => ALL_GAME_SKILLS.includes(skill)
                && configuredSkills.indexOf(skill) === index,
        );
        if (uniqueSkills.length > 1) {
            console.warn('[MonsterCrowdController] 初始技能只能有一个，将使用列表第一项。');
        }

        const configuredSkill = uniqueSkills.find((skill) => this.hasSkillAsset(skill));
        return configuredSkill
            ?? ALL_GAME_SKILLS.find((skill) => this.hasSkillAsset(skill))
            ?? null;
    }

    private hasSkillAsset (skill: GameSkill): boolean {
        switch (skill) {
        case GameSkill.BasicAttack: return Boolean(this.bulletPrefab);
        case GameSkill.PiercingArrow: return Boolean(this.arrowPrefab);
        case GameSkill.QiBlade: return Boolean(this.qiBladePrefab);
        case GameSkill.Tornado: return Boolean(this.tornadoPrefab);
        default: return false;
        }
    }

    private addSkill (skill: GameSkill): boolean {
        if (this._learnedSkills.has(skill)
            || !this._abilityController
            || !this._projectileSystem
            || !this.renderLayer) return false;

        const getAttackPower = (): number => this._characterStats?.attackPower ?? 1;
        switch (skill) {
        case GameSkill.BasicAttack: {
            if (!this.bulletPrefab) return false;
            const options: BasicAttackAbilityOptions = {
                prefab: this.bulletPrefab,
                visualParent: this.renderLayer,
                interval: this.fireInterval,
                projectilesPerShot: Math.max(1, this.bulletsPerShot | 0),
                spreadAngle: 5,
                attackRange: this.bulletAttackRange,
                projectileSpeed: this.bulletSpeed,
                projectileLifetime: this.bulletLifetime,
                hitRadius: this.bulletHitRadius,
                damage: this.bulletDamage,
                getAttackPower,
            };
            this._basicAttackOptions = options;
            this._abilityController.addAbility(new BasicAttackAbility(
                this,
                this._projectileSystem,
                options,
            ));
            break;
        }
        case GameSkill.PiercingArrow: {
            if (!this.arrowPrefab) return false;
            const options: PiercingArrowAbilityOptions = {
                prefab: this.arrowPrefab,
                visualParent: this.renderLayer.parent ?? this.renderLayer,
                interval: this.arrowInterval,
                projectileSpeed: this.arrowSpeed,
                spawnOffset: this.arrowSpawnOffset,
                projectilesPerShot: 1,
                projectileSpacing: 72,
                hitRadius: this.arrowHitRadius,
                damage: this.arrowDamage,
                getAttackPower,
            };
            this._piercingArrowOptions = options;
            this._abilityController.addAbility(new PiercingArrowAbility(
                this._projectileSystem,
                options,
            ));
            break;
        }
        case GameSkill.QiBlade: {
            if (!this.qiBladePrefab) return false;
            const options: QiBladeAbilityOptions = {
                prefab: this.qiBladePrefab,
                visualParent: this.renderLayer,
                hitRadius: this.qiBladeHitRadius,
                damageInterval: this.qiBladeDamageInterval,
                rotationSpeed: this.qiBladeRotationSpeed,
                selfRotationSpeed: this.qiBladeSelfRotationSpeed,
                bladeCount: 1,
                damage: this.qiBladeDamage,
                getAttackPower,
            };
            this._qiBladeOptions = options;
            this._abilityController.addAbility(new QiBladeAbility(this, options));
            break;
        }
        case GameSkill.Tornado: {
            if (!this.tornadoPrefab) return false;
            const options: TornadoAbilityOptions = {
                prefab: this.tornadoPrefab,
                visualParent: this.renderLayer,
                spawnInterval: this.tornadoSpawnInterval,
                duration: this.tornadoDuration,
                pullRadius: this.tornadoPullRadius,
                pullSpeed: this.tornadoPullSpeed,
                pullStopRadius: this.tornadoPullStopRadius,
                rotationSpeed: this.tornadoRotationSpeed,
                maxActiveCount: 1,
                damageInterval: this.tornadoDamageInterval,
                damage: this.tornadoDamage,
                getAttackPower,
            };
            this._tornadoOptions = options;
            this._abilityController.addAbility(new TornadoAbility(this, options));
            break;
        }
        default:
            return false;
        }

        this._learnedSkills.add(skill);
        console.info(`[MonsterCrowdController] 已获得技能：${SKILL_NAMES[skill]}`);
        return true;
    }

    private buildUpgradeSlots (): UpgradeSlotOptions[] {
        const skillUpgrades = this.buildSkillUpgradeOptions();
        const newSkills = this.buildNewSkillOptions();
        const rightOptions = newSkills.length > 0 ? newSkills : skillUpgrades;
        return [
            { label: '技能强化', options: skillUpgrades },
            { label: '技能强化', options: skillUpgrades },
            {
                label: newSkills.length > 0 ? '学习新技能' : '技能强化',
                options: rightOptions,
            },
        ];
    }

    private buildNewSkillOptions (): UpgradeOption[] {
        const attackPower = Math.max(0, this._characterStats?.attackPower ?? 1);
        return ALL_GAME_SKILLS
            .filter((skill) => !this._learnedSkills.has(skill)
                && this.hasSkillAsset(skill))
            .map((skill) => ({
                id: `learn:${skill}`,
                name: `获得·${SKILL_NAMES[skill]}`,
                description: this.getNewSkillDescription(skill, attackPower),
            }));
    }

    private getNewSkillDescription (skill: GameSkill, attackPower: number): string {
        switch (skill) {
        case GameSkill.BasicAttack:
            return `自动瞄准最近敌人。初始伤害 ${this.formatStat(
                this.bulletDamage * attackPower,
            )}，每次 1 发。`;
        case GameSkill.PiercingArrow:
            return `发射贯穿整条战场的箭矢。初始伤害 ${this.formatStat(
                this.arrowDamage * attackPower,
            )}。`;
        case GameSkill.QiBlade:
            return `召唤 1 把环绕气刃。初始伤害 ${this.formatStat(
                this.qiBladeDamage * attackPower,
            )}。`;
        case GameSkill.Tornado:
            return `召唤可聚怪的龙卷风。每跳初始伤害 ${this.formatStat(
                this.tornadoDamage * attackPower,
            )}。`;
        default:
            return '';
        }
    }

    private buildSkillUpgradeOptions (): UpgradeOption[] {
        const options: UpgradeOption[] = [];
        const basic = this._basicAttackOptions;
        if (basic) {
            this.pushUpgrade(options, 'basic.damage', '基础射击·火力强化',
                `伤害 ${this.formatStat(basic.damage)} → ${this.formatStat(
                    basic.damage + this.getDamageStep(this.bulletDamage),
                )}`);
            this.pushUpgrade(options, 'basic.interval', '基础射击·快速装填',
                `攻击间隔 ${this.formatStat(basic.interval)}秒 → ${this.formatStat(
                    basic.interval * 0.88,
                )}秒`, 4);
            this.pushUpgrade(options, 'basic.count', '基础射击·齐射',
                `子弹数量 ${basic.projectilesPerShot} → ${basic.projectilesPerShot + 1}`,
                2);
            this.pushUpgrade(options, 'basic.speed', '基础射击·弹道加速',
                `子弹速度 ${this.formatStat(basic.projectileSpeed)} → ${this.formatStat(
                    basic.projectileSpeed * 1.15,
                )}`, 3);
        }

        const arrow = this._piercingArrowOptions;
        if (arrow) {
            this.pushUpgrade(options, 'arrow.damage', '穿透箭·穿心',
                `伤害 ${this.formatStat(arrow.damage)} → ${this.formatStat(
                    arrow.damage + this.getDamageStep(this.arrowDamage),
                )}`);
            this.pushUpgrade(options, 'arrow.interval', '穿透箭·疾风拉弓',
                `发射间隔 ${this.formatStat(arrow.interval)}秒 → ${this.formatStat(
                    arrow.interval * 0.88,
                )}秒`, 4);
            this.pushUpgrade(options, 'arrow.count', '穿透箭·箭阵',
                `箭矢数量 ${arrow.projectilesPerShot} → ${arrow.projectilesPerShot + 1}`,
                2);
            this.pushUpgrade(options, 'arrow.speed', '穿透箭·强弦',
                `箭矢速度 ${this.formatStat(arrow.projectileSpeed)} → ${this.formatStat(
                    arrow.projectileSpeed * 1.2,
                )}`, 3);
        }

        const qiBlade = this._qiBladeOptions;
        if (qiBlade) {
            this.pushUpgrade(options, 'qi.damage', '气刃环·巨刃',
                `伤害 ${this.formatStat(qiBlade.damage)} → ${this.formatStat(
                    qiBlade.damage + this.getDamageStep(this.qiBladeDamage),
                )}`);
            this.pushUpgrade(options, 'qi.count', '气刃环·剑阵',
                `气刃数量 ${qiBlade.bladeCount} → ${qiBlade.bladeCount + 1}`,
                2);
            this.pushUpgrade(options, 'qi.rotation', '气刃环·疾旋',
                `旋转速度 ${this.formatStat(Math.abs(qiBlade.rotationSpeed))} → ${
                    this.formatStat(Math.abs(qiBlade.rotationSpeed) * 1.2)
                } 度/秒`, 3);
            this.pushUpgrade(options, 'qi.interval', '气刃环·连续切割',
                `伤害间隔 ${this.formatStat(qiBlade.damageInterval)}秒 → ${
                    this.formatStat(qiBlade.damageInterval * 0.9)
                }秒`, 3);
        }

        const tornado = this._tornadoOptions;
        if (tornado) {
            this.pushUpgrade(options, 'tornado.damage', '龙卷风·风刃',
                `每跳伤害 ${this.formatStat(tornado.damage)} → ${this.formatStat(
                    tornado.damage + this.getDamageStep(this.tornadoDamage),
                )}`);
            this.pushUpgrade(options, 'tornado.count', '龙卷风·风群',
                `同时存在数量 ${tornado.maxActiveCount} → ${tornado.maxActiveCount + 1}`,
                2);
            this.pushUpgrade(options, 'tornado.radius', '龙卷风·风眼扩大',
                `吸引范围 ${this.formatStat(tornado.pullRadius)} → ${this.formatStat(
                    tornado.pullRadius * 1.15,
                )}`, 3);
            this.pushUpgrade(options, 'tornado.pull', '龙卷风·强力牵引',
                `拉扯速度 ${this.formatStat(tornado.pullSpeed)} → ${this.formatStat(
                    tornado.pullSpeed * 1.2,
                )}`, 3);
            this.pushUpgrade(options, 'tornado.interval', '龙卷风·快速召唤',
                `召唤间隔 ${this.formatStat(tornado.spawnInterval)}秒 → ${this.formatStat(
                    tornado.spawnInterval * 0.88,
                )}秒`, 3);
        }
        return options;
    }

    private pushUpgrade (
        options: UpgradeOption[],
        id: string,
        name: string,
        description: string,
        maximumRank = Number.POSITIVE_INFINITY,
    ): void {
        const rank = this._upgradeRanks.get(id) ?? 0;
        if (rank >= maximumRank) return;
        options.push({
            id,
            name: `${name} Lv.${rank + 1}`,
            description,
        });
    }

    private applyUpgradeOption (optionId: string): boolean {
        if (optionId.startsWith('learn:')) {
            const skill = Number(optionId.slice('learn:'.length)) as GameSkill;
            return ALL_GAME_SKILLS.includes(skill) && this.addSkill(skill);
        }

        let applied = true;
        switch (optionId) {
        case 'basic.damage':
            if (this._basicAttackOptions) {
                this._basicAttackOptions.damage += this.getDamageStep(this.bulletDamage);
            } else applied = false;
            break;
        case 'basic.interval':
            if (this._basicAttackOptions) this._basicAttackOptions.interval *= 0.88;
            else applied = false;
            break;
        case 'basic.count':
            if (this._basicAttackOptions) this._basicAttackOptions.projectilesPerShot++;
            else applied = false;
            break;
        case 'basic.speed':
            if (this._basicAttackOptions) this._basicAttackOptions.projectileSpeed *= 1.15;
            else applied = false;
            break;
        case 'arrow.damage':
            if (this._piercingArrowOptions) {
                this._piercingArrowOptions.damage += this.getDamageStep(this.arrowDamage);
            } else applied = false;
            break;
        case 'arrow.interval':
            if (this._piercingArrowOptions) this._piercingArrowOptions.interval *= 0.88;
            else applied = false;
            break;
        case 'arrow.count':
            if (this._piercingArrowOptions) this._piercingArrowOptions.projectilesPerShot++;
            else applied = false;
            break;
        case 'arrow.speed':
            if (this._piercingArrowOptions) this._piercingArrowOptions.projectileSpeed *= 1.2;
            else applied = false;
            break;
        case 'qi.damage':
            if (this._qiBladeOptions) {
                this._qiBladeOptions.damage += this.getDamageStep(this.qiBladeDamage);
            } else applied = false;
            break;
        case 'qi.count':
            if (this._qiBladeOptions) this._qiBladeOptions.bladeCount++;
            else applied = false;
            break;
        case 'qi.rotation':
            if (this._qiBladeOptions) this._qiBladeOptions.rotationSpeed *= 1.2;
            else applied = false;
            break;
        case 'qi.interval':
            if (this._qiBladeOptions) this._qiBladeOptions.damageInterval *= 0.9;
            else applied = false;
            break;
        case 'tornado.damage':
            if (this._tornadoOptions) {
                this._tornadoOptions.damage += this.getDamageStep(this.tornadoDamage);
            } else applied = false;
            break;
        case 'tornado.count':
            if (this._tornadoOptions) this._tornadoOptions.maxActiveCount++;
            else applied = false;
            break;
        case 'tornado.radius':
            if (this._tornadoOptions) this._tornadoOptions.pullRadius *= 1.15;
            else applied = false;
            break;
        case 'tornado.pull':
            if (this._tornadoOptions) this._tornadoOptions.pullSpeed *= 1.2;
            else applied = false;
            break;
        case 'tornado.interval':
            if (this._tornadoOptions) this._tornadoOptions.spawnInterval *= 0.88;
            else applied = false;
            break;
        default:
            applied = false;
            break;
        }

        if (!applied) return false;
        this._upgradeRanks.set(optionId, (this._upgradeRanks.get(optionId) ?? 0) + 1);
        console.info(`[MonsterCrowdController] 已应用技能升级：${optionId}`);
        return true;
    }

    private getDamageStep (initialDamage: number): number {
        return Math.max(0.1, Math.max(0, initialDamage) * 0.25);
    }

    private formatStat (value: number): string {
        return Number(value.toFixed(2)).toString();
    }

    private findNearestMonster (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
    ): number {
        const maximumDistanceSquared = Math.max(0, maxDistance) ** 2;
        if (!this._gridValid) return this.findNearestMonsterByFullScan(
            originX,
            originY,
            maximumDistanceSquared,
            insideBoundsOnly,
        );

        const cellSize = this.getGridCellSize();
        const originCellX = Math.floor(originX / cellSize);
        const originCellY = Math.floor(originY / cellSize);
        const maximumRing = Math.max(
            Math.abs(originCellX - this._gridMinX),
            Math.abs(originCellX - this._gridMaxX),
            Math.abs(originCellY - this._gridMinY),
            Math.abs(originCellY - this._gridMaxY),
        );
        let nearestIndex = -1;
        let nearestDistanceSquared = maximumDistanceSquared;

        const inspectCell = (gridX: number, gridY: number): void => {
            const bucket = this._grid.get(this.getCellKey(gridX, gridY));
            if (!bucket) return;

            for (const index of bucket) {
                if (insideBoundsOnly && !this.isPointInsideCombatBounds(
                    this._positionsX[index],
                    this._positionsY[index],
                )) continue;

                const deltaX = this._positionsX[index] - originX;
                const deltaY = this._positionsY[index] - originY;
                const distanceSquared = deltaX * deltaX + deltaY * deltaY;
                if (distanceSquared <= nearestDistanceSquared) {
                    nearestDistanceSquared = distanceSquared;
                    nearestIndex = index;
                }
            }
        };

        for (let ring = 0; ring <= maximumRing; ring++) {
            if (ring === 0) {
                inspectCell(originCellX, originCellY);
            } else {
                const minimumX = originCellX - ring;
                const maximumX = originCellX + ring;
                const minimumY = originCellY - ring;
                const maximumY = originCellY + ring;
                for (let gridX = minimumX; gridX <= maximumX; gridX++) {
                    inspectCell(gridX, minimumY);
                    inspectCell(gridX, maximumY);
                }
                for (let gridY = minimumY + 1; gridY < maximumY; gridY++) {
                    inspectCell(minimumX, gridY);
                    inspectCell(maximumX, gridY);
                }
            }

            if (nearestIndex >= 0) {
                const minimumX = (originCellX - ring) * cellSize;
                const maximumX = (originCellX + ring + 1) * cellSize;
                const minimumY = (originCellY - ring) * cellSize;
                const maximumY = (originCellY + ring + 1) * cellSize;
                const distanceToUnsearchedCells = Math.min(
                    originX - minimumX,
                    maximumX - originX,
                    originY - minimumY,
                    maximumY - originY,
                );
                if (nearestDistanceSquared <= distanceToUnsearchedCells
                    * distanceToUnsearchedCells) {
                    break;
                }
            }
        }
        return nearestIndex;
    }

    private findNearestMonsterByFullScan (
        originX: number,
        originY: number,
        maximumDistanceSquared: number,
        insideBoundsOnly: boolean,
    ): number {
        let nearestIndex = -1;
        let nearestDistanceSquared = maximumDistanceSquared;

        for (let i = 0; i < this._count; i++) {
            if (insideBoundsOnly && !this.isPointInsideCombatBounds(
                this._positionsX[i],
                this._positionsY[i],
            )) continue;

            const deltaX = this._positionsX[i] - originX;
            const deltaY = this._positionsY[i] - originY;
            const distanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (distanceSquared <= nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    }

    private isPointInsideCombatBounds (x: number, y: number): boolean {
        if (!this._renderTransform) return false;

        const halfWidth = this._renderTransform.width * 0.5;
        const halfHeight = this._renderTransform.height * 0.5;
        return x >= -halfWidth && x <= halfWidth
            && y >= -halfHeight && y <= halfHeight;
    }

    private removeMonster (index: number): void {
        const lastIndex = this._count - 1;
        if (index < 0 || index > lastIndex) return;

        const removedId = this._monsterIds[index];
        this._monsterIndexById.delete(removedId);

        if (this._gridValid) {
            const removedKey = this.getCellKeyForPosition(
                this._positionsX[index],
                this._positionsY[index],
            );
            const removedBucket = this._grid.get(removedKey);
            const removedBucketIndex = removedBucket?.indexOf(index) ?? -1;
            if (removedBucket && removedBucketIndex >= 0) {
                removedBucket.splice(removedBucketIndex, 1);
            }

            if (index !== lastIndex) {
                const lastKey = this.getCellKeyForPosition(
                    this._positionsX[lastIndex],
                    this._positionsY[lastIndex],
                );
                const lastBucket = this._grid.get(lastKey);
                const lastBucketIndex = lastBucket?.indexOf(lastIndex) ?? -1;
                if (lastBucket && lastBucketIndex >= 0) {
                    lastBucket[lastBucketIndex] = index;
                }
            }
        }

        if (index !== lastIndex) {
            this._positionsX[index] = this._positionsX[lastIndex];
            this._positionsY[index] = this._positionsY[lastIndex];
            this._velocitiesX[index] = this._velocitiesX[lastIndex];
            this._velocitiesY[index] = this._velocitiesY[lastIndex];
            this._separationX[index] = this._separationX[lastIndex];
            this._separationY[index] = this._separationY[lastIndex];
            this._moveSpeedMultipliers[index] = this._moveSpeedMultipliers[lastIndex];
            this._targetSnapshotsX[index] = this._targetSnapshotsX[lastIndex];
            this._targetSnapshotsY[index] = this._targetSnapshotsY[lastIndex];
            this._targetOffsetsX[index] = this._targetOffsetsX[lastIndex];
            this._targetOffsetsY[index] = this._targetOffsetsY[lastIndex];
            this._targetRefreshTimers[index] = this._targetRefreshTimers[lastIndex];
            this._targetRefreshIntervals[index] = this._targetRefreshIntervals[lastIndex];
            this._monsterTypeIndices[index] = this._monsterTypeIndices[lastIndex];
            this._health[index] = this._health[lastIndex];
            this._hitFlashEndTimes[index] = this._hitFlashEndTimes[lastIndex];
            this._monsterIds[index] = this._monsterIds[lastIndex];
            this._monsterIndexById.set(this._monsterIds[index], index);
        }
        this._count--;
        if (this._count === 0) {
            this._gridMinX = 0;
            this._gridMaxX = 0;
            this._gridMinY = 0;
            this._gridMaxY = 0;
        }
    }

    private updateCountLabel (): void {
        if (!this._countLabel
            || this._lastDisplayedCount === this._count
                && this._lastDisplayedKillCount === this._totalKillCount) return;

        this._lastDisplayedCount = this._count;
        this._lastDisplayedKillCount = this._totalKillCount;
        const currentUpgradeStart = this._nextUpgradeKillCount
            - this._currentUpgradeKillRequirement;
        const currentUpgradeProgress = Math.min(
            this._currentUpgradeKillRequirement,
            Math.max(0, this._totalKillCount - currentUpgradeStart),
        );
        this._countLabel.string = `当前怪物：${this._count} / ${this._capacity}`
            + `\n击杀：${this._totalKillCount}`
            + `　升级进度：${currentUpgradeProgress}`
            + ` / ${this._currentUpgradeKillRequirement}`;
    }

    private registerKill (): void {
        this._totalKillCount++;
        if (this._totalKillCount < this._nextUpgradeKillCount) {
            this.updateCountLabel();
            return;
        }

        this._playerLevel++;
        const completedUpgradeCount = Math.max(1, this._playerLevel - 1);
        this._currentUpgradeKillRequirement = Math.max(1, this.killsPerUpgrade | 0)
            * completedUpgradeCount;
        this._nextUpgradeKillCount = this._totalKillCount
            + this._currentUpgradeKillRequirement;
        this.updateCountLabel();

        if (!this._upgradePanel) {
            console.warn('[MonsterCrowdController] 未配置升级选择面板。');
            return;
        }

        this._isChoosingUpgrade = true;
        if (this._targetMover) {
            this._targetMoverWasEnabled = this._targetMover.enabled;
            this._targetMover.enabled = false;
        }
        const resumeBattle = (): void => {
            this._isChoosingUpgrade = false;
            if (this._targetMover) this._targetMover.enabled = this._targetMoverWasEnabled;
            this.updateCountLabel();
        };
        const upgradeSlots = this.buildUpgradeSlots();
        if (!this._upgradePanel.show(
            this._playerLevel,
            upgradeSlots,
            (optionId: string): void => {
                if (!this.applyUpgradeOption(optionId)) {
                    console.warn(`[MonsterCrowdController] 无法应用升级：${optionId}`);
                }
                resumeBattle();
            },
        )) {
            console.warn('[MonsterCrowdController] 升级选择面板无法打开。');
            resumeBattle();
        }
    }

    private spawnMonsters (dt: number): void {
        this._spawnModel.advance(
            dt,
            this._count,
            this._capacity,
            this._spawnCommands,
        );
        for (const command of this._spawnCommands) {
            this.spawnBatch(command);
        }
    }

    private spawnBatch (command: MonsterSpawnBatchCommand): void {
        for (let i = 0; i < command.count && this._count < this._capacity; i++) {
            this.spawnOne(command);
        }
    }

    private spawnOne (command: MonsterSpawnBatchCommand): void {
        if (!this._renderTransform || this._count >= this._capacity) return;

        const visibleSize = view.getVisibleSize();
        const halfWidth = visibleSize.width * 0.5;
        const halfHeight = visibleSize.height * 0.5;
        this._renderTransform.convertToNodeSpaceAR(
            this.node.worldPosition,
            this._viewportCenterLocal,
        );
        const centerX = this._viewportCenterLocal.x;
        const centerY = this._viewportCenterLocal.y;
        const entrance = command.entrance;
        const monster = this._spawnModel.getMonsterDefinition(command.monsterTypeIndex);
        const isStaggered = command.formation === MonsterSpawnFormation.Staggered;
        const randomCoordinate = Math.random() - 0.5;
        const normalizedCoordinate = Math.max(-0.96, Math.min(0.96,
            entrance.coordinate + randomCoordinate * entrance.span));
        const depthStep = Math.max(monster.size * 0.65, this.separationDistance * 0.75);
        const depth = Math.random() * depthStep * (isStaggered ? 2 : 1);
        const spawnDistance = entrance.clearance + monster.size * 0.5 + depth;
        let x = 0;
        let y = 0;

        switch (entrance.edge) {
        case MonsterSpawnEdge.Top:
            x = centerX + normalizedCoordinate * halfWidth;
            y = centerY + halfHeight + spawnDistance;
            break;
        case MonsterSpawnEdge.Bottom:
            x = centerX + normalizedCoordinate * halfWidth;
            y = centerY - halfHeight - spawnDistance;
            break;
        case MonsterSpawnEdge.Left:
            x = centerX - halfWidth - spawnDistance;
            y = centerY + normalizedCoordinate * halfHeight;
            break;
        case MonsterSpawnEdge.Right:
            x = centerX + halfWidth + spawnDistance;
            y = centerY + normalizedCoordinate * halfHeight;
            break;
        }

        this._positionsX[this._count] = x;
        this._positionsY[this._count] = y;
        this._velocitiesX[this._count] = 0;
        this._velocitiesY[this._count] = 0;
        this._separationX[this._count] = 0;
        this._separationY[this._count] = 0;
        this._moveSpeedMultipliers[this._count] = entrance.moveSpeedMultiplier;
        this._monsterTypeIndices[this._count] = command.monsterTypeIndex;
        this._health[this._count] = this.getMonsterHealth(monster.maximumHealth);
        this._hitFlashEndTimes[this._count] = 0;
        const monsterId = this._nextMonsterId++;
        const angle = this.getMonsterHashRatio(monsterId, 0x68bc21eb) * Math.PI * 2;
        const radiusRatio = this.getMonsterHashRatio(monsterId, 0x02e5be93);
        const offsetRadius = monster.targetOffsetMin
            + (monster.targetOffsetMax - monster.targetOffsetMin) * radiusRatio;
        const refreshRatio = this.getMonsterHashRatio(monsterId, 0x967a889b);
        const refreshInterval = monster.targetRefreshInterval
            * (0.875 + refreshRatio * 0.25);
        this._targetSnapshotsX[this._count] = this._targetLocal.x;
        this._targetSnapshotsY[this._count] = this._targetLocal.y;
        this._targetOffsetsX[this._count] = Math.cos(angle) * offsetRadius;
        this._targetOffsetsY[this._count] = Math.sin(angle) * offsetRadius;
        this._targetRefreshTimers[this._count] = refreshInterval;
        this._targetRefreshIntervals[this._count] = refreshInterval;
        this._monsterIds[this._count] = monsterId;
        this._monsterIndexById.set(monsterId, this._count);
        this._count++;
        this._gridValid = false;
    }

    private getMonsterHealth (baseHealth: number): number {
        const growthInterval = Math.max(1, this.monsterHealthGrowthInterval);
        const growthCount = Math.floor(this._elapsedBattleTime / growthInterval);
        const healthGrowth = growthCount * Math.max(0, this.monsterHealthGrowthPerInterval);
        return Math.max(0.01, baseHealth + healthGrowth);
    }

    private rebuildGrid (): void {
        for (const bucket of this._grid.values()) bucket.length = 0;

        const inverseCellSize = 1 / this.getGridCellSize();
        this._gridMinX = Number.POSITIVE_INFINITY;
        this._gridMaxX = Number.NEGATIVE_INFINITY;
        this._gridMinY = Number.POSITIVE_INFINITY;
        this._gridMaxY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < this._count; i++) {
            const gridX = Math.floor(this._positionsX[i] * inverseCellSize);
            const gridY = Math.floor(this._positionsY[i] * inverseCellSize);
            this._gridMinX = Math.min(this._gridMinX, gridX);
            this._gridMaxX = Math.max(this._gridMaxX, gridX);
            this._gridMinY = Math.min(this._gridMinY, gridY);
            this._gridMaxY = Math.max(this._gridMaxY, gridY);
            const key = this.getCellKey(gridX, gridY);
            let bucket = this._grid.get(key);
            if (!bucket) {
                bucket = [];
                this._grid.set(key, bucket);
            }
            bucket.push(i);
        }
        if (this._count === 0) {
            this._gridMinX = 0;
            this._gridMaxX = 0;
            this._gridMinY = 0;
            this._gridMaxY = 0;
        }
        this._gridValid = true;
    }

    private calculateSeparation (): void {
        this._separationX.fill(0, 0, this._count);
        this._separationY.fill(0, 0, this._count);
        const distance = Math.max(1, this.separationDistance);
        const distanceSquared = distance * distance;

        this.forEachNearbyPair((first, second) => {
            let deltaX = this._positionsX[first] - this._positionsX[second];
            let deltaY = this._positionsY[first] - this._positionsY[second];
            const pairDistanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (pairDistanceSquared >= distanceSquared) return;

            let pairDistance = Math.sqrt(pairDistanceSquared);
            if (pairDistance < 0.001) {
                const angle = this.getPairAngle(first, second);
                deltaX = Math.cos(angle);
                deltaY = Math.sin(angle);
                pairDistance = 0;
            } else {
                deltaX /= pairDistance;
                deltaY /= pairDistance;
            }

            const force = (1 - pairDistance / distance) * this.separationStrength;
            const forceX = deltaX * force;
            const forceY = deltaY * force;
            this._separationX[first] += forceX;
            this._separationY[first] += forceY;
            this._separationX[second] -= forceX;
            this._separationY[second] -= forceY;
        });
    }

    private calculateVelocities (targetX: number, targetY: number, dt: number): void {
        const slowDistance = Math.max(this.stopRadius + 1, this.slowRadius);

        for (let i = 0; i < this._count; i++) {
            const monster = this._spawnModel.getMonsterDefinition(
                this._monsterTypeIndices[i],
            );
            const speedMultiplier = this._moveSpeedMultipliers[i];
            const maximumSpeed = monster.maximumSpeed * speedMultiplier;
            const maximumSpeedSquared = maximumSpeed * maximumSpeed;
            this._targetRefreshTimers[i] -= dt;
            if (this._targetRefreshTimers[i] <= 0) {
                this._targetSnapshotsX[i] = targetX;
                this._targetSnapshotsY[i] = targetY;
                this._targetRefreshTimers[i] += this._targetRefreshIntervals[i];
                if (this._targetRefreshTimers[i] <= 0) {
                    this._targetRefreshTimers[i] = this._targetRefreshIntervals[i];
                }
            }

            const personalTargetX = this._targetSnapshotsX[i] + this._targetOffsetsX[i];
            const personalTargetY = this._targetSnapshotsY[i] + this._targetOffsetsY[i];
            const deltaX = personalTargetX - this._positionsX[i];
            const deltaY = personalTargetY - this._positionsY[i];
            const targetDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            let desiredVelocityX = 0;
            let desiredVelocityY = 0;

            if (targetDistance > this.stopRadius) {
                const slowScale = Math.min(1,
                    (targetDistance - this.stopRadius) / (slowDistance - this.stopRadius));
                const targetSpeed = monster.moveSpeed * speedMultiplier * slowScale;
                desiredVelocityX = deltaX / targetDistance * targetSpeed;
                desiredVelocityY = deltaY / targetDistance * targetSpeed;
            }

            desiredVelocityX += this._separationX[i];
            desiredVelocityY += this._separationY[i];
            const desiredSpeedSquared = desiredVelocityX * desiredVelocityX
                + desiredVelocityY * desiredVelocityY;
            if (desiredSpeedSquared > maximumSpeedSquared) {
                const scale = maximumSpeed / Math.sqrt(desiredSpeedSquared);
                desiredVelocityX *= scale;
                desiredVelocityY *= scale;
            }

            let velocityChangeX = desiredVelocityX - this._velocitiesX[i];
            let velocityChangeY = desiredVelocityY - this._velocitiesY[i];
            const velocityChangeSquared = velocityChangeX * velocityChangeX
                + velocityChangeY * velocityChangeY;
            const maximumVelocityChange = monster.steeringAcceleration
                * speedMultiplier * dt;
            if (velocityChangeSquared > maximumVelocityChange * maximumVelocityChange) {
                const scale = maximumVelocityChange / Math.sqrt(velocityChangeSquared);
                velocityChangeX *= scale;
                velocityChangeY *= scale;
            }

            this._velocitiesX[i] += velocityChangeX;
            this._velocitiesY[i] += velocityChangeY;
        }
    }

    private moveMonsters (dt: number): void {
        this._gridValid = false;
        for (let i = 0; i < this._count; i++) {
            this._positionsX[i] += this._velocitiesX[i] * dt;
            this._positionsY[i] += this._velocitiesY[i] * dt;
        }
    }

    private applyPlayerContactDamage (): void {
        if (!this._characterStats?.isAlive
            || this._elapsedBattleTime < this._nextPlayerDamageTime) return;

        const contactRadius = Math.max(1, this.playerContactRadius);
        const touchingMonster = this.findNearestMonster(
            this._targetLocal.x,
            this._targetLocal.y,
            contactRadius,
            false,
        );
        if (touchingMonster < 0) return;

        const appliedDamage = this._characterStats.takeDamage(
            Math.max(0, this.playerContactDamage),
        );
        if (appliedDamage <= 0) return;

        this._damageNumberRenderer?.showPlayerDamage(
            this._targetLocal.x,
            this._targetLocal.y + 72,
            appliedDamage,
        );

        this._nextPlayerDamageTime = this._elapsedBattleTime
            + Math.max(0.05, this.playerDamageInterval);
    }

    private correctOverlaps (): void {
        const minimumDistance = Math.max(1, this.separationDistance);
        const minimumDistanceSquared = minimumDistance * minimumDistance;

        this.forEachNearbyPair((first, second) => {
            let deltaX = this._positionsX[first] - this._positionsX[second];
            let deltaY = this._positionsY[first] - this._positionsY[second];
            const pairDistanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (pairDistanceSquared >= minimumDistanceSquared) return;

            let pairDistance = Math.sqrt(pairDistanceSquared);
            if (pairDistance < 0.001) {
                const angle = this.getPairAngle(first, second);
                deltaX = Math.cos(angle);
                deltaY = Math.sin(angle);
                pairDistance = 0;
            } else {
                deltaX /= pairDistance;
                deltaY /= pairDistance;
            }

            const halfCorrection = (minimumDistance - pairDistance) * 0.5;
            const correctionX = deltaX * halfCorrection;
            const correctionY = deltaY * halfCorrection;
            this._positionsX[first] += correctionX;
            this._positionsY[first] += correctionY;
            this._positionsX[second] -= correctionX;
            this._positionsY[second] -= correctionY;
        });
        this._gridValid = false;
    }

    private syncRenderData (): void {
        const flashDuration = Math.max(0, this.monsterHitFlashDuration);
        for (let batchIndex = 0; batchIndex < this._batches.length; batchIndex++) {
            const batch = this._batches[batchIndex];
            const sourceStart = batchIndex * MONSTERS_PER_RENDERER;
            const batchCount = Math.min(
                MONSTERS_PER_RENDERER,
                Math.max(0, this._count - sourceStart),
            );

            batch.setCount(batchCount);
            for (let localIndex = 0; localIndex < batchCount; localIndex++) {
                const sourceIndex = sourceStart + localIndex;
                const velocityX = this._velocitiesX[sourceIndex];
                const hitFlash = flashDuration > 0
                    ? Math.min(1, Math.max(0, (
                        this._hitFlashEndTimes[sourceIndex] - this._elapsedBattleTime
                    ) / flashDuration))
                    : 0;
                const monster = this._spawnModel.getMonsterDefinition(
                    this._monsterTypeIndices[sourceIndex],
                );
                batch.setMonster(
                    localIndex,
                    this._positionsX[sourceIndex],
                    this._positionsY[sourceIndex],
                    monster.size,
                    monster.size,
                    sourceIndex & 3,
                    velocityX < -0.01,
                    hitFlash,
                );
            }
            batch.commit();
        }
    }

    private forEachNearbyPair (callback: (first: number, second: number) => void): void {
        const inverseCellSize = 1 / this.getGridCellSize();

        for (let first = 0; first < this._count; first++) {
            const gridX = Math.floor(this._positionsX[first] * inverseCellSize);
            const gridY = Math.floor(this._positionsY[first] * inverseCellSize);

            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    const bucket = this._grid.get(this.getCellKey(
                        gridX + offsetX,
                        gridY + offsetY,
                    ));
                    if (!bucket) continue;

                    for (const second of bucket) {
                        if (second > first) callback(first, second);
                    }
                }
            }
        }
    }

    private getCellKey (gridX: number, gridY: number): number {
        return ((gridX & HASH_COORDINATE_MASK) << 16)
            | (gridY & HASH_COORDINATE_MASK);
    }

    private getGridCellSize (): number {
        return Math.max(1, this.separationDistance);
    }

    private getCellKeyForPosition (x: number, y: number): number {
        const inverseCellSize = 1 / this.getGridCellSize();
        return this.getCellKey(
            Math.floor(x * inverseCellSize),
            Math.floor(y * inverseCellSize),
        );
    }

    private getPairAngle (first: number, second: number): number {
        const hash = (Math.imul(first + 1, 73856093)
            ^ Math.imul(second + 1, 19349663)) >>> 0;
        return hash / 0xffffffff * Math.PI * 2;
    }

    private getMonsterHashRatio (monsterId: number, salt: number): number {
        let hash = (monsterId ^ salt) >>> 0;
        hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
        hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
        return ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
    }
}
