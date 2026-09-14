import {
    _decorator,
    AudioClip,
    AudioSource,
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
    MonsterDefinition,
    MonsterRank,
    MonsterSpawnBatchCommand,
    MonsterSpawnEdge,
    MonsterSpawnFormation,
    MonsterSpawnModel,
} from './MonsterSpawnModel';
import { MonsterPrefabVisuals } from './MonsterPrefabVisuals';
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
import { UpgradeSelectionPanel } from '../ui/UpgradeSelectionPanel';
import { UIManager } from '../ui/UIManager';
import { PlayerHud } from '../ui/PlayerHud';
import { CheatPanel } from '../ui/CheatPanel';
import { ProgressionSnapshot } from '../ui/ProgressionUI';
import { RunProgression, UpgradeEffect, UpgradeOffer } from '../progression/RunProgression';
import { QiBladeAbility, QiBladeAbilityOptions } from '../combat/QiBladeAbility';
import { TornadoAbility, TornadoAbilityOptions } from '../combat/TornadoAbility';
import { GameSettings, GameSkill } from '../GameSettings';
import { CharacterStats } from '../player/CharacterStats';
import { DamageNumberBatchRenderer } from '../ui/DamageNumberBatchRenderer';

const { ccclass, menu, property } = _decorator;
const HASH_COORDINATE_MASK = 0xffff;
const MAX_RECYCLED_GRID_BUCKETS = 4096;
const MAX_CACHED_CROWD_PAIRS = 65536;
const CROWD_PAIR_GEOMETRY_STRIDE = 5;
// Existing skill/contact radii already include the normal cotton monster.
const NORMAL_HIT_RADIUS = 28;
const NORMAL_BODY_RADIUS = 24;
const MONSTER_DEATH_SOUND_MIN_INTERVAL = 0.06;
const MONSTER_DEATH_SOUND_OVERLAP_TARGET = 3;
interface BossAttackState {
    impactPending: boolean;
    completed: boolean;
    damageApplied: boolean;
}

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
    [GameSkill.Tornado]: '小旋风',
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

    @property({ type: Prefab, displayName: '棉团精英 Prefab' })
    public cottonKingSimplePrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '苔石拳王 Boss Prefab' })
    public mossStoneKingPrefab: Prefab | null = null;

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

    // Kept only to read legacy scene serialization. Experience now belongs to RunProgression.
    @property({ visible: false })
    public firstUpgradeKills = 1;

    @property({ visible: false })
    public killsPerUpgrade = 10;

    @property({ min: 1, max: MAX_BATCH_MONSTERS, step: 1 })
    public maximumMonsters = 2000;

    @property({ min: 1 })
    public monsterHealthGrowthInterval = 60;

    @property({ min: 0 })
    public monsterHealthGrowthPerInterval = 1;

    @property({ min: 0, max: 1, step: 0.01 })
    public monsterHitFlashDuration = 0.1;

    @property({ type: AudioClip, displayName: '小怪死亡音效' })
    public monsterDeathSound: AudioClip | null = null;

    @property({ min: 0, max: 1, step: 0.01, displayName: '小怪死亡音量' })
    public monsterDeathSoundVolume = 0.35;

    @property({ min: 1 })
    public separationDistance = 48;

    // Read legacy scene values without exposing controls for removed speed policies.
    @property({ visible: false })
    public separationStrength = 105;

    @property({ min: 0, displayName: '怪物跟随间隙' })
    public followingGap = 2;

    @property({ visible: false })
    public followingResponseTime = 0.08;

    @property({ min: 0 })
    public stopRadius = 76;

    @property({ visible: false })
    public slowRadius = 150;

    @property({ min: 1 })
    public playerContactRadius = 76;

    @property({ min: 0 })
    public playerContactDamage = 5;

    @property({ min: 0.05 })
    public playerDamageInterval = 0.5;

    @property({ displayName: 'Boss 起手距离', min: 1 })
    public bossAttackRange = 180;

    @property({ displayName: 'Boss 重击半径', min: 1 })
    public bossImpactRadius = 190;

    @property({ displayName: 'Boss 攻击后间隔', min: 0 })
    public bossAttackCooldown = 0.45;

    // Kept only for legacy scene serialization; overlap correction has been removed.
    @property({ visible: false })
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
    private _nextPlayerDamageTime = 0;
    private _elapsedBattleTime = 0;
    private _deathAudioSource: AudioSource | null = null;
    private _pendingMonsterDeathSound = false;
    private _monsterDeathSoundCooldown = 0;
    private _isChoosingUpgrade = false;
    private _targetMoverWasEnabled = false;
    private _capacity = 0;
    private _positionsX = new Float32Array(0);
    private _positionsY = new Float32Array(0);
    private _velocitiesX = new Float32Array(0);
    private _velocitiesY = new Float32Array(0);
    private _maximumMovementSpeed = 0;
    private _movementAllowed = new Uint8Array(0);
    private _blockerIndices = new Int32Array(0);
    private _bypassSides = new Int8Array(0);
    private _bypassBlockerIds = new Uint32Array(0);
    private _bypassVelocitiesX = new Float32Array(0);
    private _bypassVelocitiesY = new Float32Array(0);
    private _bypassLeftAllowed = new Uint8Array(0);
    private _bypassRightAllowed = new Uint8Array(0);
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
    private readonly _activeCountByType = new Map<number, number>();
    private _prefabVisuals: MonsterPrefabVisuals | null = null;
    private readonly _bossAttacks = new Map<EnemyId, BossAttackState>();
    private readonly _bossNextAttackTimes = new Map<EnemyId, number>();
    private readonly _hitSourceWorld = new Vec3();
    private readonly _hitSourceLocal = new Vec3();
    private _maximumHitQueryExtent = 0;
    private _nextMonsterId: EnemyId = 1;
    private readonly _spawnModel = new MonsterSpawnModel(DEFAULT_MONSTER_LEVEL);
    private readonly _spawnCommands: MonsterSpawnBatchCommand[] = [];
    private readonly _grid = new Map<number, number[]>();
    private readonly _gridBucketPool: number[][] = [];
    private _gridValid = false;
    private _gridCellSize = 0;
    private _gridBoundsDirty = false;
    private _gridMinX = 0;
    private _gridMaxX = 0;
    private _gridMinY = 0;
    private _gridMaxY = 0;
    // Only shared by the two synchronous crowd passes, before positions change.
    private _crowdPairIndices = new Uint32Array(0);
    private _crowdPairGeometry = new Float64Array(0);
    private _crowdPairCount = 0;
    private _crowdPairCacheOverflow = false;
    private readonly _targetLocal = new Vec3();
    private readonly _viewportCenterLocal = new Vec3();
    private readonly _facingDirection = new Vec2(1, 0);
    private readonly _segmentHitIndices: number[] = [];
    private _segmentHitTimes = new Float32Array(0);
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
    private readonly _progression = new RunProgression();
    private readonly _cores = new Set<string>();
    private _hud: PlayerHud | null = null;
    private _uiManager: UIManager | null = null;
    private _cheatPanel: CheatPanel | null = null;
    private _cheatOpen = false;
    private _loadingCheats = false;
    private _battleEnded = false;
    private _offerRetryTime = 0;
    private _initialMaximumHealth = 100;
    private _baseAttackPower = 1;
    private _growthDamageBonus = 0;
    private _coreRewardCount = 0;
    private _eliteRewarded = false;
    private _nextShieldTime = 0;
    private _steadyTimer = 0;
    private _reserveKills = 0;
    private _reserveReady = false;
    private _focusTarget: EnemyId | null = null;
    private _focusStacks = 0;
    private _focusLastHit = -Infinity;
    private _focusOutOfRangeSince = -1;
    private _tornadoAbility: TornadoAbility | null = null;
    private _hudRefreshTimer = 0;
    private _basicAttackOptions: BasicAttackAbilityOptions | null = null;
    private _piercingArrowOptions: PiercingArrowAbilityOptions | null = null;
    private _qiBladeOptions: QiBladeAbilityOptions | null = null;
    private _tornadoOptions: TornadoAbilityOptions | null = null;

    public getProgressionSnapshot (): ProgressionSnapshot {
        const snapshot = this._progression.getSnapshot();
        const coreNames: Record<string, string> = {
            formation: '破阵', focus: '专注猎杀', blade_guard: '护体气刃',
            wind_eye: '风眼暴露', kill_reserve: '余势', steady_guard: '稳守',
        };
        const evolutionNames = ['疾风连射', '交叉箭阵', '护身刃阵', '聚流龙卷'];
        return {
            playerLevel: snapshot.playerLevel,
            experience: snapshot.experience,
            experienceToNext: snapshot.nextLevelExperience,
            skills: snapshot.skills.map(skill => ({
                ...skill,
                name: skill.evolved ? evolutionNames[skill.skill] : SKILL_NAMES[skill.skill],
                innate: skill.skill === snapshot.initialSkill,
            })),
            cores: snapshot.coreIds.map(id => ({ id, name: coreNames[id] ?? id })),
            refreshesRemaining: snapshot.refreshesRemaining,
            evolutionAvailable: this._progression.evolutionAvailable,
            evolutionUsed: snapshot.evolutionUsed,
            evolutionGranted: snapshot.evolutionGranted,
            combatStatus: [
                `护盾 ${Math.ceil(this._characterStats?.shield ?? 0)}`,
                this._cores.has('focus') ? `专注 ${this._focusStacks}/6` : '',
                this._cores.has('kill_reserve') ? (this._reserveReady ? '余势已就绪'
                    : `余势 ${this._reserveKills}/8`) : '',
                this._battleEnded ? '角色已倒下' : '',
            ].filter(Boolean).join(' · '),
        };
    }

    public async openCheats (): Promise<void> {
        if (this._battleEnded || this._loadingCheats || this._cheatOpen
            || this._upgradePanel?.isShowing) return;
        if (!this._uiManager) {
            console.error('[MonsterCrowdController] 秘籍需要场景中的 UIManager。');
            return;
        }
        this._loadingCheats = true;
        this._cheatOpen = true;
        this.setBattlePaused(true);
        try {
            const node = await this._uiManager.openPopup('UI/CheatPanel');
            if (this._battleEnded || !this._cheatOpen) {
                this._uiManager.closePopup('UI/CheatPanel');
                return;
            }
            this._cheatPanel = node?.getComponent(CheatPanel) ?? null;
            if (!this._cheatPanel) throw new Error('CheatPanel Prefab未绑定脚本。');
            this._cheatPanel.setController(this);
        } catch (error) {
            console.error('[MonsterCrowdController] 打开秘籍失败', error);
            this.closeCheats();
        } finally {
            this._loadingCheats = false;
        }
    }

    public closeCheats (): void {
        this._cheatOpen = false;
        this._cheatPanel = null;
        this._uiManager?.closePopup('UI/CheatPanel');
        this.processGrowthQueue();
    }

    public debugSetSkillLevel (skill: number, level: number): boolean {
        if (this._battleEnded || !Number.isInteger(skill) || !Number.isInteger(level)
            || level < 0 || level > 5 || !this.hasSkillAsset(skill)) return false;
        if (!this._progression.debugSetSkillLevel(skill, level, true)) return false;
        this.rebuildSkill(skill);
        this.syncProgression();
        return true;
    }

    public debugMaxAllSkills (): void {
        if (this._battleEnded) return;
        for (const skill of ALL_GAME_SKILLS) {
            if (this.hasSkillAsset(skill)) {
                this._progression.debugSetSkillLevel(skill, 5, true);
                this.rebuildSkill(skill);
            }
        }
        this.syncProgression();
    }

    public debugAddMonsters (): number {
        if (this._battleEnded || !this.enabledInHierarchy || !this._abilityController
            || !this._renderTransform || !this.target || this._capacity <= 0) return 0;
        const wave = DEFAULT_MONSTER_LEVEL.waves.find(
            definition => definition.id === this._spawnModel.currentWaveId,
        );
        const monsterTypeIndex = DEFAULT_MONSTER_LEVEL.monsters.findIndex(
            definition => definition.rank === MonsterRank.Normal,
        );
        if (!wave || monsterTypeIndex < 0) return 0;
        const monster = this._spawnModel.getMonsterDefinition(monsterTypeIndex);
        const count = Math.min(
            100,
            Math.min(this._capacity, wave.activeMonsterLimit) - this._count,
            (monster.maximumActiveCount ?? Infinity)
                - (this._activeCountByType.get(monsterTypeIndex) ?? 0),
        );
        if (count <= 0) return 0;

        this._renderTransform.convertToNodeSpaceAR(this.target.worldPosition, this._targetLocal);
        const previousCount = this._count;
        const edges = [MonsterSpawnEdge.Top, MonsterSpawnEdge.Right,
            MonsterSpawnEdge.Bottom, MonsterSpawnEdge.Left];
        const firstEdge = Math.floor(Math.random() * edges.length);
        const spreadDepth = Math.max(monster.size * 4, this.separationDistance * 4);
        // Jitter separate slots around all four edges without advancing the wave clock.
        for (let index = 0; index < count; index++) {
            const edgeIndex = index % edges.length;
            const edge = edges[(firstEdge + edgeIndex) % edges.length];
            const slots = Math.ceil((count - edgeIndex) / edges.length);
            const span = 1.92 / slots;
            this.spawnOne({
                monsterTypeIndex,
                entrance: {
                    id: 'cheat-around', edge,
                    coordinate: -0.96 + (Math.floor(index / edges.length) + 0.5) * span,
                    span,
                    clearance: 72 + Math.random() * spreadDepth,
                    moveSpeedMultiplier: edge === MonsterSpawnEdge.Left || edge === MonsterSpawnEdge.Right
                        ? 1.15 : 1,
                },
                formation: MonsterSpawnFormation.Staggered,
                count: 1, firstMonsterIndex: 0, batchSize: 1,
                batchSequence: this._nextMonsterId,
            });
        }
        this.syncRenderData();
        this.updateCountLabel();
        return this._count - previousCount;
    }

    public debugGrantEvolution (): void {
        if (this._battleEnded) return;
        this._progression.grantEvolution();
        this.refreshProgressionUI();
    }

    public debugEvolveSkill (skill: number): boolean {
        if (this._battleEnded || !this.hasSkillAsset(skill)) return false;
        if (!this._progression.debugEvolveSkill(skill)) return false;
        this.rebuildSkill(skill);
        this.syncProgression();
        return true;
    }

    public openEvolution (): void {
        if (this._battleEnded || this._cheatOpen || this._upgradePanel?.isShowing) return;
        const offer = this._progression.openOffer('evolution', this.getGrowthHealth());
        if (offer) this.showGrowthOffer(offer);
    }

    private getGrowthHealth (): { current: number; maximum: number; initialMaximum: number } {
        return {
            current: this._characterStats?.currentHealth ?? 100,
            maximum: this._characterStats?.maximumHealth ?? 100,
            initialMaximum: this._initialMaximumHealth,
        };
    }

    private setBattlePaused (paused: boolean): void {
        const value = paused || this._battleEnded;
        if (this._isChoosingUpgrade === value) return;
        this._isChoosingUpgrade = value;
        this._prefabVisuals?.setPaused(value);
        this._characterStats?.setCombatPaused(value);
        if (!this._targetMover) return;
        if (value) {
            this._targetMoverWasEnabled = this._targetMover.enabled;
            this._targetMover.enabled = false;
        } else {
            this._targetMover.enabled = this._targetMoverWasEnabled;
        }
    }

    private processGrowthQueue (): void {
        if (this._battleEnded || this._cheatOpen || this._upgradePanel?.isShowing) return;
        if (this._elapsedBattleTime < this._offerRetryTime) {
            this.setBattlePaused(false);
            return;
        }
        const health = this.getGrowthHealth();
        const offer = this._progression.openOffer('ordinary', health)
            ?? this._progression.openOffer('core', health)
            ?? (this._progression.shouldPromptEvolution
                ? this._progression.openOffer('evolution', health) : null);
        if (offer) this.showGrowthOffer(offer);
        else this.setBattlePaused(false);
    }

    private showGrowthOffer (offer: UpgradeOffer): void {
        this.setBattlePaused(true);
        const snapshot = this._progression.getSnapshot();
        const success = this._upgradePanel?.show(
            snapshot.playerLevel + (offer.kind === 'ordinary' ? 1 : 0),
            offer.options,
            (id: string): boolean => {
                if (this._battleEnded) return false;
                const effect = this._progression.commitOption(id, this.getGrowthHealth(),
                    value => this.applyGrowthEffect(value));
                if (!effect) return false;
                if (effect.type === 'evolution' && effect.skill !== undefined) {
                    this.rebuildSkill(effect.skill);
                }
                this.syncProgression();
                this.scheduleOnce(() => this.processGrowthQueue(), 0);
                return true;
            },
            {
                kind: offer.kind,
                title: offer.kind === 'core' ? '选择核心符文'
                    : offer.kind === 'evolution' ? '选择本局唯一进化' : undefined,
                refreshesRemaining: offer.refreshesRemaining,
                canRefresh: offer.canRefresh,
                onRefresh: (): void => {
                    const refreshed = this._progression.refreshOffer(this.getGrowthHealth());
                    if (refreshed) this.showGrowthOffer(refreshed);
                    this.refreshProgressionUI();
                },
                onDefer: offer.kind === 'evolution' ? (): void => {
                    this._progression.deferEvolution();
                    this._upgradePanel?.hide();
                    this.refreshProgressionUI();
                    this.scheduleOnce(() => this.processGrowthQueue(), 0);
                } : undefined,
            },
        );
        if (!success) {
            console.error('[MonsterCrowdController] 升级界面未就绪，奖励保留等待重试。');
            this._offerRetryTime = this._elapsedBattleTime + 5;
            this.setBattlePaused(false);
        }
    }

    private applyGrowthEffect (effect: UpgradeEffect): boolean {
        if (effect.skill !== undefined && !this.hasSkillAsset(effect.skill)) return false;
        if (effect.type === 'heal') {
            return (this._characterStats?.heal(effect.amount ?? 0) ?? 0) > 0;
        }
        if (effect.type === 'maximum-health') {
            if (!this._characterStats?.isAlive) return false;
            this._characterStats.setMaximumHealth(this._characterStats.maximumHealth + (effect.amount ?? 0));
            this._characterStats.heal(effect.amount ?? 0);
        }
        return true;
    }

    private rebuildSkill (skill: GameSkill): void {
        const abilityIds = ['basic-attack', 'piercing-arrow', 'qi-blade', 'tornado'];
        this._abilityController?.removeAbility(abilityIds[skill]);
        this._projectileSystem?.clearAbility(abilityIds[skill]);
        this._learnedSkills.delete(skill);
        switch (skill) {
        case GameSkill.BasicAttack: this._basicAttackOptions = null; break;
        case GameSkill.PiercingArrow: this._piercingArrowOptions = null; break;
        case GameSkill.QiBlade: this._qiBladeOptions = null; break;
        case GameSkill.Tornado: this._tornadoOptions = null; this._tornadoAbility = null; break;
        }
    }

    private syncProgression (): void {
        const snapshot = this._progression.getSnapshot();
        this._growthDamageBonus = snapshot.damageBonus;
        this._cores.clear();
        for (const id of snapshot.coreIds) this._cores.add(id);
        for (const skill of ALL_GAME_SKILLS) {
            const state = snapshot.skills.find(value => value.skill === skill);
            if (!state) {
                if (this._learnedSkills.has(skill)) this.rebuildSkill(skill);
                continue;
            }
            if (!this._learnedSkills.has(skill)) this.addSkill(skill);
            const level = state.level;
            const evolved = state.evolved;
            if (skill === GameSkill.BasicAttack && this._basicAttackOptions) {
                Object.assign(this._basicAttackOptions, {
                    damage: this.bulletDamage * (evolved ? 0.85 : [0, 1, 1.2, 0.75, 0.9, 1][level]),
                    interval: this.fireInterval * (level >= 5 ? 0.9 : 1),
                    burstCount: evolved ? 3 : level >= 3 ? 2 : 1,
                    burstSpacing: 0.1,
                    projectilesPerShot: 1,
                    maxHits: this._cores.has('formation') ? 3 : 1,
                });
            } else if (skill === GameSkill.PiercingArrow && this._piercingArrowOptions) {
                Object.assign(this._piercingArrowOptions, {
                    damage: this.arrowDamage * (evolved ? 1.9 : [0, 1, 1.2, 1.2, 1.45, 1.65][level]),
                    interval: this.arrowInterval * (level >= 5 ? 0.9 : 1),
                    projectilesPerShot: evolved ? 3 : level >= 3 ? 2 : 1,
                    pattern: evolved ? 'fan' : 'parallel',
                    fanAngle: 30,
                    attackRange: this.bulletAttackRange,
                });
            } else if (skill === GameSkill.QiBlade && this._qiBladeOptions) {
                Object.assign(this._qiBladeOptions, {
                    damage: this.qiBladeDamage * (evolved ? 1.85 : [0, 1, 1, 1.15, 1.4, 1.6][level]),
                    bladeCount: evolved ? 6 : Math.min(3, level),
                    damageInterval: this.qiBladeDamageInterval * (level >= 5 ? 0.9 : 1),
                });
            } else if (skill === GameSkill.Tornado && this._tornadoOptions) {
                Object.assign(this._tornadoOptions, {
                    damage: this.tornadoDamage * (evolved ? 1.9 : [0, 1, 1.15, 1.15, 1.4, 1.6][level]),
                    duration: evolved ? 4 : 3,
                    spawnInterval: level >= 5 ? 4 : 5,
                    initialDelay: 5,
                    maxActiveCount: 1,
                    pullRadius: this.tornadoPullRadius * (evolved ? 1.4 : level >= 3 ? 1.2 : 1),
                    damageRadius: Math.max(this.tornadoPullStopRadius + 12, this.tornadoPullRadius * 0.4),
                    pullSpeed: this.tornadoPullSpeed * (level >= 4 ? 1.3 : level >= 2 ? 1.15 : 1),
                    spawnDistance: this.tornadoPullRadius + this.playerContactRadius + 32,
                    playerSafetyRadius: this.playerContactRadius + 32,
                });
            }
        }
        if (!this._cores.has('blade_guard')) this._characterStats?.removeShieldSource('blade_guard');
        if (!this._cores.has('steady_guard')) this._characterStats?.removeShieldSource('steady_guard');
        if (!this._cores.has('focus')) this.clearFocus();
        this.refreshProgressionUI();
    }

    private refreshProgressionUI (): void {
        this._hud?.refresh();
        this._cheatPanel?.refresh();
        this._lastDisplayedCount = -1;
        this.updateCountLabel();
    }

    private updateCoreTimers (dt: number): void {
        const nextCoreTime = this._coreRewardCount === 0 ? 60 : 210;
        const eliteReady = this._coreRewardCount === 0 || this._eliteRewarded;
        if (this._coreRewardCount < 2 && this._elapsedBattleTime >= nextCoreTime && eliteReady) {
            this._progression.grantCoreReward();
            this._coreRewardCount++;
        }
        if (this._cores.has('steady_guard') && this._characterStats?.isAlive) {
            this._steadyTimer += dt;
            if (this._steadyTimer >= 5) {
                this._steadyTimer -= 5;
                this._characterStats.addShield('steady_guard', this._characterStats.maximumHealth * 0.1, 0.2);
            }
        }
        if (this._focusTarget !== null && this._elapsedBattleTime - this._focusLastHit >= 3) {
            this._focusStacks = 0;
        }
    }

    private onPlayerDamaged (): void {
        this._steadyTimer = 0;
    }

    private onPlayerDied (): void {
        this._battleEnded = true;
        this._progression.cancelPendingRewards();
        this._upgradePanel?.hide();
        this._cheatOpen = false;
        this._cheatPanel = null;
        this._uiManager?.closePopup('UI/CheatPanel');
        this.setBattlePaused(true);
        this.refreshProgressionUI();
        console.info('[MonsterCrowdController] 角色已倒下，战斗与待领取升级已停止。');
    }

    private clearFocus (): void {
        this._focusTarget = null;
        this._focusStacks = 0;
        this._focusLastHit = -Infinity;
        this._focusOutOfRangeSince = -1;
    }

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

    public findAttackTarget (
        originX: number, originY: number, maxDistance: number,
        insideBoundsOnly: boolean, sourceAbilityId: string,
    ): EnemyId | null {
        if (!this._cores.has('focus')) {
            return sourceAbilityId === 'piercing-arrow' ? null
                : this.findNearestEnemy(originX, originY, maxDistance, insideBoundsOnly);
        }
        const rankValue = (index: number): number => {
            const rank = this.getMonsterDefinition(index).rank;
            return rank === MonsterRank.Boss ? 2 : rank === MonsterRank.Elite ? 1 : 0;
        };
        const inRange = (index: number): boolean => {
            if (insideBoundsOnly && !this.isMonsterInsideCombatBounds(index)) return false;
            return (this._positionsX[index] - originX) ** 2
                + (this.getMonsterHitY(index) - originY) ** 2 <= maxDistance ** 2;
        };
        let best = -1;
        let bestRank = -1;
        let bestDistance = Infinity;
        for (let index = 0; index < this._count; index++) {
            if (!inRange(index)) continue;
            const rank = rankValue(index);
            const distance = (this._positionsX[index] - originX) ** 2
                + (this.getMonsterHitY(index) - originY) ** 2;
            if (rank > bestRank || rank === bestRank && (distance < bestDistance
                || distance === bestDistance && this._monsterIds[index] < this._monsterIds[best])) {
                best = index;
                bestRank = rank;
                bestDistance = distance;
            }
        }
        const current = this._focusTarget === null ? undefined : this._monsterIndexById.get(this._focusTarget);
        if (current !== undefined) {
            if (inRange(current)) {
                this._focusOutOfRangeSince = -1;
                if (bestRank <= rankValue(current)) return this._focusTarget;
            } else if (bestRank <= rankValue(current)) {
                if (this._focusOutOfRangeSince < 0) this._focusOutOfRangeSince = this._elapsedBattleTime;
                if (this._elapsedBattleTime - this._focusOutOfRangeSince < 2) return null;
            }
        }
        this.clearFocus();
        if (best >= 0) this._focusTarget = this._monsterIds[best];
        return this._focusTarget;
    }

    public clampAbilityPosition (position: Vec2, padding: number): void {
        if (!this._renderTransform) return;
        const halfWidth = Math.max(0, this._renderTransform.width * 0.5 - padding);
        const halfHeight = Math.max(0, this._renderTransform.height * 0.5 - padding);
        position.x = Math.max(-halfWidth, Math.min(halfWidth, position.x));
        position.y = Math.max(-halfHeight, Math.min(halfHeight, position.y));
    }

    public getEnemyPosition (enemyId: EnemyId, out: Vec2): boolean {
        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined) return false;

        out.set(this._positionsX[index], this.getMonsterHitY(index));
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
        const safeRadius = Math.max(0, hitRadius);
        const queryRadius = safeRadius + this._maximumHitQueryExtent;
        const hitIndices = this._segmentHitIndices;
        hitIndices.length = 0;

        this.forEachMonsterInArea(
            Math.min(startX, endX) - queryRadius,
            Math.max(startX, endX) + queryRadius,
            Math.min(startY, endY) - queryRadius,
            Math.max(startY, endY) + queryRadius,
            (index) => {
                if (insideBoundsOnly && !this.isMonsterInsideCombatBounds(index)) return;
                const deltaX = startX - this._positionsX[index];
                const deltaY = startY - this.getMonsterHitY(index);
                const radius = safeRadius + this.getMonsterExtraHitRadius(index);
                const startDistance = deltaX * deltaX + deltaY * deltaY - radius * radius;
                let entryTime = 0;
                if (startDistance > 0) {
                    if (segmentLengthSquared <= 0.0001) return;
                    const projection = deltaX * segmentX + deltaY * segmentY;
                    const discriminant = projection * projection
                        - segmentLengthSquared * startDistance;
                    if (discriminant < 0) return;
                    entryTime = (-projection - Math.sqrt(discriminant)) / segmentLengthSquared;
                    if (entryTime < 0 || entryTime > 1) return;
                }
                this._segmentHitTimes[index] = entryTime;
                hitIndices.push(index);
            },
        );

        // Large bodies can be touched before a nearer enemy's center projection.
        hitIndices.sort((first, second) => this._segmentHitTimes[first]
            - this._segmentHitTimes[second] || this._monsterIds[first] - this._monsterIds[second]);
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
        const queryRadius = safeRadius + this._maximumHitQueryExtent;
        this.forEachMonsterInArea(
            centerX - queryRadius,
            centerX + queryRadius,
            centerY - queryRadius,
            centerY + queryRadius,
            (index) => {
                if (insideBoundsOnly && !this.isMonsterInsideCombatBounds(index)) return;
                const deltaX = this._positionsX[index] - centerX;
                const deltaY = this.getMonsterHitY(index) - centerY;
                const hitDistance = safeRadius + this.getMonsterExtraHitRadius(index);
                if (deltaX * deltaX + deltaY * deltaY <= hitDistance * hitDistance) {
                    results.push(this._monsterIds[index]);
                }
            },
        );
        results.sort((first, second) => first - second);
    }

    private forEachMonsterInArea (
        minimumX: number,
        maximumX: number,
        minimumY: number,
        maximumY: number,
        inspect: (index: number) => void,
    ): void {
        if (!this.isGridValid()) {
            for (let index = 0; index < this._count; index++) inspect(index);
            return;
        }
        const cellSize = this.getGridCellSize();
        const minimumCellX = Math.max(this._gridMinX, Math.floor(minimumX / cellSize));
        const maximumCellX = Math.min(this._gridMaxX, Math.floor(maximumX / cellSize));
        const minimumCellY = Math.max(this._gridMinY, Math.floor(minimumY / cellSize));
        const maximumCellY = Math.min(this._gridMaxY, Math.floor(maximumY / cellSize));
        for (let gridY = minimumCellY; gridY <= maximumCellY; gridY++) {
            for (let gridX = minimumCellX; gridX <= maximumCellX; gridX++) {
                const bucket = this._grid.get(this.getCellKey(gridX, gridY));
                if (bucket) for (const index of bucket) inspect(index);
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
        const monster = this.getMonsterDefinition(index);
        if (monster.rank === MonsterRank.Boss) return false;
        const safeStopRadius = Math.max(0, stopRadius)
            + Math.max(0, monster.bodyRadius - NORMAL_BODY_RADIUS);
        if (distance <= safeStopRadius || distance < 0.001) return true;

        const moveDistance = Math.min(
            Math.max(0, maximumDistance) * (monster.rank === MonsterRank.Elite ? 0.25 : 1 / monster.mass),
            distance - safeStopRadius,
        );
        const stepX = deltaX / distance * moveDistance;
        const stepY = deltaY / distance * moveDistance;
        const fromPlayerX = this._positionsX[index] - this._targetLocal.x;
        const fromPlayerY = this._positionsY[index] - this._targetLocal.y;
        const safetyRadius = this.playerContactRadius + 32
            + Math.max(0, monster.bodyRadius - NORMAL_BODY_RADIUS);
        const startDistanceSquared = fromPlayerX ** 2 + fromPlayerY ** 2;
        const radialMovement = fromPlayerX * stepX + fromPlayerY * stepY;
        if (startDistanceSquared <= safetyRadius ** 2) {
            if (radialMovement <= 0) return false;
        } else if (moveDistance > 0) {
            const t = Math.max(0, Math.min(1, -radialMovement / (moveDistance * moveDistance)));
            if ((fromPlayerX + stepX * t) ** 2 + (fromPlayerY + stepY * t) ** 2
                <= safetyRadius ** 2) return false;
        }
        const previousX = this._positionsX[index];
        const previousY = this._positionsY[index];
        this._positionsX[index] += stepX;
        this._positionsY[index] += stepY;
        this._bypassBlockerIds[index] = 0;
        this._bypassSides[index] = 0;
        this.updateMonsterGridPosition(index, previousX, previousY);
        return true;
    }

    public applyDamage (enemyId: EnemyId, damage: DamageInfo): boolean {
        if (this._isChoosingUpgrade || this._battleEnded) return false;

        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined || !Number.isFinite(damage.amount) || damage.amount <= 0) return false;

        const damageX = this._positionsX[index];
        const monster = this.getMonsterDefinition(index);
        const primary = damage.isPrimaryAttack !== false;
        const projectile = damage.sourceAbilityId === 'basic-attack'
            || damage.sourceAbilityId === 'piercing-arrow';
        let amount = damage.amount;
        if (projectile && this._cores.has('formation')) {
            amount *= (damage.targetIndex ?? 0) === 0 ? 0.85 : 1.1;
        }
        const focusedHit = projectile && enemyId === this._focusTarget && this._cores.has('focus');
        if (focusedHit) amount *= 1 + this._focusStacks * 0.05;
        if (this._cores.has('wind_eye')) {
            if (damage.sourceAbilityId === 'tornado') amount *= 0.8;
            else if (this._tornadoAbility?.getActiveWindAreas().some(area =>
                (this._positionsX[index] - area.x) ** 2
                    + (this.getMonsterHitY(index) - area.y) ** 2 <= area.radius ** 2)) {
                amount *= monster.rank === MonsterRank.Boss ? 1.075 : 1.15;
            }
        }
        if (primary && this._reserveReady && this._cores.has('kill_reserve')
            && monster.rank !== MonsterRank.Normal) {
            amount *= 2;
            this._reserveReady = false;
        }
        if (focusedHit && primary) {
            this._focusStacks = Math.min(6, this._focusStacks + 1);
            this._focusLastHit = this._elapsedBattleTime;
        }
        if (primary && damage.sourceAbilityId === 'qi-blade' && this._cores.has('blade_guard')
            && this._elapsedBattleTime >= this._nextShieldTime && this._characterStats) {
            this._characterStats.addShield('blade_guard', this._characterStats.maximumHealth * 0.03, 0.15);
            this._nextShieldTime = this._elapsedBattleTime + 1;
        }
        const appliedDamage = Math.min(this._health[index], amount);
        const damageY = this.getMonsterHitY(index) + Math.max(48, monster.hitRadius);
        this._health[index] -= amount;
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
            if (enemyId === this._focusTarget) this.clearFocus();
            this.registerKill(monster);
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
        this._deathAudioSource = this.getComponent(AudioSource);
        this._characterStats = this.target.getComponent(CharacterStats);
        this._characterStats?.setCombatPaused(false);
        this._targetMover?.resetHitFeedback();
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
        this._movementAllowed = new Uint8Array(this._capacity);
        this._blockerIndices = new Int32Array(this._capacity);
        this._bypassSides = new Int8Array(this._capacity);
        this._bypassBlockerIds = new Uint32Array(this._capacity);
        this._bypassVelocitiesX = new Float32Array(this._capacity);
        this._bypassVelocitiesY = new Float32Array(this._capacity);
        this._bypassLeftAllowed = new Uint8Array(this._capacity);
        this._bypassRightAllowed = new Uint8Array(this._capacity);
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
        this._segmentHitTimes = new Float32Array(this._capacity);
        this._activeCountByType.clear();
        const prefabs = new Map<string, Prefab>();
        if (this.cottonKingSimplePrefab) {
            prefabs.set('cotton-king-simple', this.cottonKingSimplePrefab);
        }
        if (this.mossStoneKingPrefab) {
            prefabs.set('moss-stone-king', this.mossStoneKingPrefab);
        }
        this._prefabVisuals = new MonsterPrefabVisuals(this.renderLayer, prefabs);
        for (const monster of DEFAULT_MONSTER_LEVEL.monsters) {
            if (monster.prefabKey && !this._prefabVisuals.hasPrefab(monster.prefabKey)) {
                console.error(`[MonsterCrowdController] Missing enemy prefab: ${monster.prefabKey}`);
                this.enabled = false;
                return;
            }
        }
        this._spawnModel.reset();
        this._totalKillCount = 0;
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
        this._basicAttackOptions = null;
        this._piercingArrowOptions = null;
        this._qiBladeOptions = null;
        this._tornadoOptions = null;

        const gameSettings = this.node.getComponentInChildren(GameSettings);
        const initialSkill = this.getInitialSkill(gameSettings);
        if (initialSkill === null) {
            console.error('[MonsterCrowdController] 没有可用的初始技能。');
            this.enabled = false;
            return;
        }
        this._initialMaximumHealth = this._characterStats?.maximumHealth ?? 100;
        this._baseAttackPower = this._characterStats?.attackPower ?? 1;
        this._progression.reset(initialSkill, ALL_GAME_SKILLS.filter(skill => this.hasSkillAsset(skill)));
        this.syncProgression();
        const scene = this.node.scene;
        this._uiManager = scene?.getComponentInChildren(UIManager) ?? null;
        this._hud = scene?.getComponentInChildren(PlayerHud) ?? null;
        if (this._hud) this._hud.characterNode = this.target;
        this._hud?.setController(this);
        this._characterStats?.node.on(CharacterStats.Event.Died, this.onPlayerDied, this);
        this._characterStats?.node.on(CharacterStats.Event.Damaged, this.onPlayerDamaged, this);
        this.updateCountLabel();
    }

    protected lateUpdate (dt: number): void {
        // Audio keeps playing while upgrade choices pause the battle simulation.
        this._monsterDeathSoundCooldown = Math.max(
            0, this._monsterDeathSoundCooldown - Math.max(0, dt),
        );
        if (this._batches.length === 0 || !this._renderTransform || !this.target) return;
        if (this._battleEnded || this._isChoosingUpgrade) return;
        this.processGrowthQueue();
        if (this._isChoosingUpgrade) return;

        const frameDt = Math.min(Math.max(dt, 0), 0.1);
        const simulationDt = Math.min(frameDt, 1 / 30);
        this._prefabVisuals?.advance(frameDt);
        this._elapsedBattleTime += frameDt;
        this.updateCoreTimers(frameDt);
        this._renderTransform.convertToNodeSpaceAR(
            this.target.worldPosition,
            this._targetLocal,
        );
        this.spawnMonsters(frameDt);

        if (this._count > 0) {
            this.updateBossAttacks();
            if (this._battleEnded) return;
            this.ensureGrid();
            this.calculateVelocities(
                this._targetLocal.x,
                this._targetLocal.y,
                simulationDt,
            );
            this.limitCrowdMovement(simulationDt);
            this.moveMonsters(simulationDt);
            this.ensureGrid();
            this.applyPlayerContactDamage();
            if (this._battleEnded) return;
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
        this.flushMonsterDeathSound();

        this.syncRenderData();
        this.updateCountLabel();
        this._hudRefreshTimer += frameDt;
        if (this._hudRefreshTimer >= 0.2) {
            this._hudRefreshTimer = 0;
            this.refreshProgressionUI();
        }
        this.processGrowthQueue();
    }

    protected onDestroy (): void {
        this._battleEnded = true;
        this._characterStats?.node.off(CharacterStats.Event.Died, this.onPlayerDied, this);
        this._characterStats?.node.off(CharacterStats.Event.Damaged, this.onPlayerDamaged, this);
        this._uiManager?.closePopup('UI/CheatPanel');
        this._prefabVisuals?.clear();
        this._bossAttacks.clear();
        this._bossNextAttackTimes.clear();
        this._targetMover?.resetHitFeedback();
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

        const getAttackPower = (): number => this._baseAttackPower * (1 + this._growthDamageBonus);
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
                this,
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
            this._tornadoAbility = new TornadoAbility(this, options);
            this._abilityController.addAbility(this._tornadoAbility);
            break;
        }
        default:
            return false;
        }

        this._learnedSkills.add(skill);
        console.info(`[MonsterCrowdController] 已获得技能：${SKILL_NAMES[skill]}`);
        return true;
    }

    private findNearestMonster (
        originX: number,
        originY: number,
        maxDistance: number,
        insideBoundsOnly: boolean,
    ): number {
        const maximumDistanceSquared = Math.max(0, maxDistance) ** 2;
        if (!this.isGridValid()) return this.findNearestMonsterByFullScan(
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
                if (insideBoundsOnly && !this.isMonsterInsideCombatBounds(index)) continue;

                const deltaX = this._positionsX[index] - originX;
                const deltaY = this.getMonsterHitY(index) - originY;
                const distance = Math.max(0, Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                    - this.getMonsterExtraHitRadius(index));
                const distanceSquared = distance * distance;
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
                const distanceToUnsearchedCells = Math.max(0, Math.min(
                    originX - minimumX,
                    maximumX - originX,
                    originY - minimumY,
                    maximumY - originY,
                ) - this._maximumHitQueryExtent);
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
            if (insideBoundsOnly && !this.isMonsterInsideCombatBounds(i)) continue;

            const deltaX = this._positionsX[i] - originX;
            const deltaY = this.getMonsterHitY(i) - originY;
            const distance = Math.max(0, Math.sqrt(deltaX * deltaX + deltaY * deltaY)
                - this.getMonsterExtraHitRadius(i));
            const distanceSquared = distance * distance;
            if (distanceSquared <= nearestDistanceSquared) {
                nearestDistanceSquared = distanceSquared;
                nearestIndex = i;
            }
        }
        return nearestIndex;
    }

    private getMonsterDefinition (index: number): MonsterDefinition {
        return this._spawnModel.getMonsterDefinition(this._monsterTypeIndices[index]);
    }

    private getMonsterHitY (index: number): number {
        return this._positionsY[index] + this.getMonsterDefinition(index).hitOffsetY;
    }

    private getMonsterExtraHitRadius (index: number): number {
        return Math.max(0, this.getMonsterDefinition(index).hitRadius - NORMAL_HIT_RADIUS);
    }

    private getMonsterBodyRadius (index: number): number {
        return Math.max(1, this.separationDistance) * 0.5
            + Math.max(0, this.getMonsterDefinition(index).bodyRadius - NORMAL_BODY_RADIUS);
    }

    private refreshHitQueryExtent (): void {
        this._maximumHitQueryExtent = 0;
        for (const [typeIndex, count] of this._activeCountByType) {
            if (count <= 0) continue;
            const monster = this._spawnModel.getMonsterDefinition(typeIndex);
            this._maximumHitQueryExtent = Math.max(this._maximumHitQueryExtent,
                Math.max(0, monster.hitRadius - NORMAL_HIT_RADIUS) + Math.abs(monster.hitOffsetY));
        }
    }

    private isMonsterInsideCombatBounds (index: number): boolean {
        if (!this._renderTransform) return false;

        const halfWidth = this._renderTransform.width * 0.5;
        const halfHeight = this._renderTransform.height * 0.5;
        const x = this._positionsX[index];
        const y = this.getMonsterHitY(index);
        const radius = this.getMonsterDefinition(index).hitRadius;
        const dx = Math.max(0, Math.abs(x) - halfWidth);
        const dy = Math.max(0, Math.abs(y) - halfHeight);
        return dx * dx + dy * dy <= radius * radius;
    }

    private removeMonster (index: number): void {
        const lastIndex = this._count - 1;
        if (index < 0 || index > lastIndex) return;

        const removedId = this._monsterIds[index];
        const removedType = this._monsterTypeIndices[index];
        this._activeCountByType.set(removedType,
            Math.max(0, (this._activeCountByType.get(removedType) ?? 0) - 1));
        this.refreshHitQueryExtent();
        this._prefabVisuals?.die(removedId);
        this._bossAttacks.delete(removedId);
        this._bossNextAttackTimes.delete(removedId);
        this._monsterIndexById.delete(removedId);

        if (this.isGridValid()) {
            const removedKey = this.getCellKeyForPosition(
                this._positionsX[index],
                this._positionsY[index],
            );
            this.removeGridIndex(removedKey, index);

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
            this._bypassSides[index] = this._bypassSides[lastIndex];
            this._bypassBlockerIds[index] = this._bypassBlockerIds[lastIndex];
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
        if (!this._countLabel) return;
        if (this._lastDisplayedCount === this._count
            && this._lastDisplayedKillCount === this._totalKillCount) return;
        this._lastDisplayedCount = this._count;
        this._lastDisplayedKillCount = this._totalKillCount;
        const progress = this._progression.getSnapshot();
        this._countLabel.string = `当前怪物：${this._count} / ${this._capacity}`
            + `\n击杀：${this._totalKillCount}　Lv.${progress.playerLevel}`
            + (progress.nextLevelExperience > 0
                ? `　经验：${progress.experience} / ${progress.nextLevelExperience}` : '　等级已满');
    }

    private registerKill (monster: MonsterDefinition): void {
        this._totalKillCount++;
        if (this._cores.has('kill_reserve') && !this._reserveReady) {
            this._reserveKills++;
            if (this._reserveKills >= 8) {
                this._reserveReady = true;
                this._reserveKills = 0;
            }
        }
        if (monster.rank === MonsterRank.Elite) {
            this._progression.addExperience(20);
            if (!this._eliteRewarded) {
                this._eliteRewarded = true;
                this._progression.grantEvolution();
                this._characterStats?.heal(this._characterStats.maximumHealth * 0.15);
            }
        } else if (monster.rank === MonsterRank.Normal) {
            this._pendingMonsterDeathSound = true;
            this._progression.addExperience(1);
        }
        // Choices start after the simulation frame, so an area attack finishes atomically.
        this.updateCountLabel();
    }

    private flushMonsterDeathSound (): void {
        if (!this._pendingMonsterDeathSound) return;
        // Merge simultaneous kills and discard excess triggers instead of queuing a tail.
        this._pendingMonsterDeathSound = false;
        const clip = this.monsterDeathSound;
        if (!clip || !this._deathAudioSource || this._monsterDeathSoundCooldown > 0) return;
        const volume = Math.min(1, Math.max(0, this.monsterDeathSoundVolume));
        if (volume <= 0) return;

        this._deathAudioSource.playOneShot(clip, volume);
        // Longer replacement clips also need a wider interval to limit overlap.
        this._monsterDeathSoundCooldown = Math.max(
            MONSTER_DEATH_SOUND_MIN_INTERVAL,
            clip.getDuration() / MONSTER_DEATH_SOUND_OVERLAP_TARGET,
        );
    }

    private spawnMonsters (dt: number): void {
        this._spawnModel.advance(
            dt,
            this._count,
            this._capacity,
            this._spawnCommands,
            this._activeCountByType,
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
        const spawnDistance = entrance.clearance
            + (monster.prefabKey ? monster.size : monster.size * 0.5) + depth;
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

        if (command.targetOffset) {
            // Keep the entire prefab visible instead of waiting for it to walk in from an edge.
            const visibleHalfWidth = Math.max(0, halfWidth - monster.size);
            const visibleHalfHeight = Math.max(0, halfHeight - monster.size);
            x = Math.max(centerX - visibleHalfWidth, Math.min(centerX + visibleHalfWidth,
                this._targetLocal.x + command.targetOffset.x));
            y = Math.max(centerY - visibleHalfHeight, Math.min(centerY + visibleHalfHeight,
                this._targetLocal.y + command.targetOffset.y));
        }

        this._positionsX[this._count] = x;
        this._positionsY[this._count] = y;
        this._velocitiesX[this._count] = 0;
        this._velocitiesY[this._count] = 0;
        this._bypassSides[this._count] = 0;
        this._bypassBlockerIds[this._count] = 0;
        this._moveSpeedMultipliers[this._count] = entrance.moveSpeedMultiplier;
        this._monsterTypeIndices[this._count] = command.monsterTypeIndex;
        this._health[this._count] = this.getMonsterHealth(monster.maximumHealth);
        this._hitFlashEndTimes[this._count] = 0;
        const monsterId = this._nextMonsterId++;
        if (monster.prefabKey
            && !this._prefabVisuals?.spawn(
                monsterId, monster.prefabKey, x, y, monster.deathAnimationDuration,
            )) return;
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
        this._activeCountByType.set(command.monsterTypeIndex,
            (this._activeCountByType.get(command.monsterTypeIndex) ?? 0) + 1);
        this._maximumHitQueryExtent = Math.max(this._maximumHitQueryExtent,
            Math.max(0, monster.hitRadius - NORMAL_HIT_RADIUS) + Math.abs(monster.hitOffsetY));
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
        for (const bucket of this._grid.values()) this.recycleGridBucket(bucket);
        this._grid.clear();

        this._gridCellSize = this.getGridCellSize();
        const cellSize = this._gridCellSize;
        this._gridMinX = Number.POSITIVE_INFINITY;
        this._gridMaxX = Number.NEGATIVE_INFINITY;
        this._gridMinY = Number.POSITIVE_INFINITY;
        this._gridMaxY = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < this._count; i++) {
            const gridX = Math.floor(this._positionsX[i] / cellSize);
            const gridY = Math.floor(this._positionsY[i] / cellSize);
            this._gridMinX = Math.min(this._gridMinX, gridX);
            this._gridMaxX = Math.max(this._gridMaxX, gridX);
            this._gridMinY = Math.min(this._gridMinY, gridY);
            this._gridMaxY = Math.max(this._gridMaxY, gridY);
            const key = this.getCellKey(gridX, gridY);
            let bucket = this._grid.get(key);
            if (!bucket) {
                bucket = this._gridBucketPool.pop() ?? [];
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
        this._gridBoundsDirty = false;
    }

    private isGridValid (): boolean {
        if (this._gridCellSize !== this.getGridCellSize()) this._gridValid = false;
        return this._gridValid;
    }

    private ensureGrid (): void {
        if (!this.isGridValid()) {
            this.rebuildGrid();
        } else if (this._gridBoundsDirty) {
            // Deaths and skill pulls can leave conservative bounds during combat.
            // Tighten them once at the next simulation step, without rebuilding buckets.
            const cellSize = this._gridCellSize;
            this._gridMinX = this._gridMinY = Number.POSITIVE_INFINITY;
            this._gridMaxX = this._gridMaxY = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < this._count; i++) {
                const gridX = Math.floor(this._positionsX[i] / cellSize);
                const gridY = Math.floor(this._positionsY[i] / cellSize);
                this._gridMinX = Math.min(this._gridMinX, gridX);
                this._gridMaxX = Math.max(this._gridMaxX, gridX);
                this._gridMinY = Math.min(this._gridMinY, gridY);
                this._gridMaxY = Math.max(this._gridMaxY, gridY);
            }
            if (this._count === 0) {
                this._gridMinX = this._gridMaxX = this._gridMinY = this._gridMaxY = 0;
            }
            this._gridBoundsDirty = false;
        }
    }

    private recycleGridBucket (bucket: number[]): void {
        bucket.length = 0;
        if (this._gridBucketPool.length < MAX_RECYCLED_GRID_BUCKETS) {
            this._gridBucketPool.push(bucket);
        }
    }

    private removeGridIndex (
        key: number,
        index: number,
        x = this._positionsX[index],
        y = this._positionsY[index],
    ): void {
        const bucket = this._grid.get(key);
        const bucketIndex = bucket?.indexOf(index) ?? -1;
        if (!bucket || bucketIndex < 0) return;
        bucket.splice(bucketIndex, 1);
        if (bucket.length > 0) return;
        this._grid.delete(key);
        this.recycleGridBucket(bucket);
        const gridX = Math.floor(x / this._gridCellSize);
        const gridY = Math.floor(y / this._gridCellSize);
        if (gridX === this._gridMinX || gridX === this._gridMaxX
            || gridY === this._gridMinY || gridY === this._gridMaxY) {
            this._gridBoundsDirty = true;
        }
    }

    private updateMonsterGridPosition (index: number, previousX: number, previousY: number): void {
        if (!this.isGridValid()) return;
        const previousKey = this.getCellKeyForPosition(previousX, previousY);
        const gridX = Math.floor(this._positionsX[index] / this._gridCellSize);
        const gridY = Math.floor(this._positionsY[index] / this._gridCellSize);
        const key = this.getCellKey(gridX, gridY);
        if (key === previousKey) return;
        this.removeGridIndex(previousKey, index, previousX, previousY);
        let bucket = this._grid.get(key);
        if (!bucket) {
            bucket = this._gridBucketPool.pop() ?? [];
            this._grid.set(key, bucket);
        }
        bucket.push(index);
        this._gridMinX = Math.min(this._gridMinX, gridX);
        this._gridMaxX = Math.max(this._gridMaxX, gridX);
        this._gridMinY = Math.min(this._gridMinY, gridY);
        this._gridMaxY = Math.max(this._gridMaxY, gridY);
    }

    private calculateVelocities (targetX: number, targetY: number, dt: number): void {
        this._maximumMovementSpeed = 0;
        for (let i = 0; i < this._count; i++) {
            const monster = this._spawnModel.getMonsterDefinition(
                this._monsterTypeIndices[i],
            );
            if (monster.rank === MonsterRank.Boss) {
                // Boss pursuit ignores crowd queues, including any previously chosen detour.
                this._bypassBlockerIds[i] = 0;
                this._bypassSides[i] = 0;
            }
            if (this._bossAttacks.has(this._monsterIds[i])) {
                this._velocitiesX[i] = 0;
                this._velocitiesY[i] = 0;
                continue;
            }
            const bodyExpansion = Math.max(0, monster.bodyRadius - NORMAL_BODY_RADIUS);
            const stopDistance = this.stopRadius + bodyExpansion;
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
            const targetDistanceSquared = deltaX * deltaX + deltaY * deltaY;
            if (targetDistanceSquared <= stopDistance * stopDistance
                || targetDistanceSquared < 0.000001) {
                this._velocitiesX[i] = 0;
                this._velocitiesY[i] = 0;
                this._bypassBlockerIds[i] = 0;
                this._bypassSides[i] = 0;
                continue;
            }

            const targetDistance = Math.sqrt(targetDistanceSquared);
            const speed = monster.moveSpeed * this._moveSpeedMultipliers[i];
            this._maximumMovementSpeed = Math.max(this._maximumMovementSpeed, speed);
            let directionX = deltaX / targetDistance;
            let directionY = deltaY / targetDistance;

            const blockerId = this._bypassBlockerIds[i];
            if (blockerId !== 0) {
                const blocker = this._monsterIndexById.get(blockerId);
                if (blocker === undefined || blocker === i
                    || !this.hasCrowdPriority(blocker, i)) {
                    this._bypassBlockerIds[i] = 0;
                } else {
                    const bx = this._positionsX[blocker] - this._positionsX[i];
                    const by = this._positionsY[blocker] - this._positionsY[i];
                    const distanceSquared = bx * bx + by * by;
                    const along = bx * directionX + by * directionY;
                    const clearance = this.getMonsterBodyRadius(i)
                        + this.getMonsterBodyRadius(blocker)
                        + Math.max(0, this.followingGap) + 4;
                    if (along <= 0 || along >= targetDistance
                        || distanceSquared - along * along >= clearance * clearance) {
                        // Keep the chosen side until the route actually clears the body.
                        this._bypassBlockerIds[i] = 0;
                    } else if (distanceSquared > 0.000001) {
                        const distance = Math.sqrt(distanceSquared);
                        const nx = bx / distance;
                        const ny = by / distance;
                        const tangent = Math.min(1, clearance / distance);
                        const inward = distance > clearance
                            ? Math.sqrt(Math.max(0, 1 - tangent * tangent))
                            : -Math.min(0.5, (clearance - distance) / 8);
                        const side = this._bypassSides[i];
                        // This changes direction only, including while escaping overlap.
                        const inverseLength = 1 / Math.sqrt(inward * inward + tangent * tangent);
                        directionX = (nx * inward - ny * tangent * side) * inverseLength;
                        directionY = (ny * inward + nx * tangent * side) * inverseLength;
                    }
                }
            }

            this._velocitiesX[i] = directionX * speed;
            this._velocitiesY[i] = directionY * speed;
        }
    }

    private moveMonsters (dt: number): void {
        for (let i = 0; i < this._count; i++) {
            const previousX = this._positionsX[i];
            const previousY = this._positionsY[i];
            this._positionsX[i] += this._velocitiesX[i] * dt;
            this._positionsY[i] += this._velocitiesY[i] * dt;
            if (this._positionsX[i] !== previousX || this._positionsY[i] !== previousY) {
                this._gridValid = false;
            }
        }
    }

    private limitCrowdMovement (dt: number): void {
        this._crowdPairCount = 0;
        this._crowdPairCacheOverflow = false;
        if (this._count < 2 || dt <= 0 || this._maximumMovementSpeed <= 0) return;

        // All pairs read the same positions and candidate velocities. Apply the
        // stop decisions only after the query, so spawn/deletion order cannot
        // decide which monster gets to move first.
        this._movementAllowed.fill(1, 0, this._count);
        this._blockerIndices.fill(-1, 0, this._count);
        const gap = Math.max(0, this.followingGap);
        const lookAhead = 2 * this._maximumMovementSpeed * dt;
        this.forEachNearbyPair((first, second) => {
            const dx = this._positionsX[second] - this._positionsX[first];
            const dy = this._positionsY[second] - this._positionsY[first];
            const distanceSquared = dx * dx + dy * dy;
            const occupiedDistance = this.getMonsterBodyRadius(first)
                + this.getMonsterBodyRadius(second) + gap;
            if (distanceSquared >= (occupiedDistance + lookAhead) ** 2
                || distanceSquared < 0.000001) return;
            // A side neighbour can be harmless for the forward step yet block
            // a detour. Cache it before either forward-movement early return.
            const geometryOffset = this.cacheCrowdPair(
                first, second, dx, dy, distanceSquared, occupiedDistance,
            );

            // Project this full step onto the line between the bodies. Only spend
            // existing space: another pair may stop the leader later in this pass.
            // Keeping the projection unnormalized avoids velocity divisions.
            const firstStep = Math.max(0,
                (this._velocitiesX[first] * dx + this._velocitiesY[first] * dy) * dt);
            const secondStep = Math.max(0,
                (-this._velocitiesX[second] * dx - this._velocitiesY[second] * dy) * dt);
            if (firstStep + secondStep <= 0.000001) return;
            const freeSpace = Math.max(0,
                distanceSquared - occupiedDistance * Math.sqrt(distanceSquared));
            if (geometryOffset >= 0) this._crowdPairGeometry[geometryOffset + 4] = freeSpace;
            if (firstStep + secondStep <= freeSpace + 0.000001) return;
            if (firstStep > 0.000001) {
                this.recordCrowdBlocker(first, second, distanceSquared);
            }
            if (secondStep > 0.000001) {
                this.recordCrowdBlocker(second, first, distanceSquared);
            }
        }, gap + lookAhead);

        let bypassCount = 0;
        this._bypassVelocitiesX.fill(0, 0, this._count);
        this._bypassVelocitiesY.fill(0, 0, this._count);
        for (let i = 0; i < this._count; i++) {
            if (this.getMonsterDefinition(i).rank === MonsterRank.Boss) continue;
            if (this._movementAllowed[i]) {
                if (this._bypassBlockerIds[i] === 0) this._bypassSides[i] = 0;
                continue;
            }
            const blocker = this._blockerIndices[i];
            if (blocker >= 0) {
                const dx = this._positionsX[blocker] - this._positionsX[i];
                const dy = this._positionsY[blocker] - this._positionsY[i];
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared > 0.000001) {
                    const speed = this.getMonsterDefinition(i).moveSpeed * this._moveSpeedMultipliers[i];
                    const scale = speed / Math.sqrt(distanceSquared);
                    this._bypassVelocitiesX[i] = -dy * scale;
                    this._bypassVelocitiesY[i] = dx * scale;
                    bypassCount++;
                }
            }
            this._velocitiesX[i] = 0;
            this._velocitiesY[i] = 0;
        }
        if (bypassCount === 0) return;

        this.evaluateCrowdBypasses(dt, gap, lookAhead);
    }

    private cacheCrowdPair (
        first: number,
        second: number,
        dx: number,
        dy: number,
        distanceSquared: number,
        occupiedDistance: number,
    ): number {
        if (this._crowdPairCacheOverflow) return -1;
        if (this._crowdPairCount === MAX_CACHED_CROWD_PAIRS) {
            // A pathological pile must not grow memory indefinitely or lose
            // collision candidates. The second pass falls back to a full query.
            this._crowdPairCacheOverflow = true;
            return -1;
        }
        const pair = this._crowdPairCount++;
        if (pair * 2 === this._crowdPairIndices.length) {
            const previousCapacity = this._crowdPairIndices.length / 2;
            const capacity = Math.min(MAX_CACHED_CROWD_PAIRS,
                Math.max(1024, previousCapacity * 2));
            const indices = new Uint32Array(capacity * 2);
            const geometry = new Float64Array(capacity * CROWD_PAIR_GEOMETRY_STRIDE);
            indices.set(this._crowdPairIndices);
            geometry.set(this._crowdPairGeometry);
            this._crowdPairIndices = indices;
            this._crowdPairGeometry = geometry;
        }
        this._crowdPairIndices[pair * 2] = first;
        this._crowdPairIndices[pair * 2 + 1] = second;
        const offset = pair * CROWD_PAIR_GEOMETRY_STRIDE;
        this._crowdPairGeometry[offset] = dx;
        this._crowdPairGeometry[offset + 1] = dy;
        this._crowdPairGeometry[offset + 2] = distanceSquared;
        this._crowdPairGeometry[offset + 3] = occupiedDistance;
        // Compute clearance only if one of the two passes needs it.
        this._crowdPairGeometry[offset + 4] = -1;
        return offset;
    }

    private recordCrowdBlocker (
        index: number,
        other: number,
        distanceSquared: number,
    ): void {
        if (this.getMonsterDefinition(index).rank === MonsterRank.Boss) return;
        const previous = this._blockerIndices[index];
        if (previous >= 0) {
            const dx = this._positionsX[previous] - this._positionsX[index];
            const dy = this._positionsY[previous] - this._positionsY[index];
            const previousDistanceSquared = dx * dx + dy * dy;
            if (distanceSquared > previousDistanceSquared
                || distanceSquared === previousDistanceSquared
                    && this._monsterIds[other] > this._monsterIds[previous]) return;
        }
        this._movementAllowed[index] = 0;
        // This index is only used within this movement step, before any deaths.
        this._blockerIndices[index] = other;
    }

    private evaluateCrowdBypasses (
        dt: number,
        gap: number,
        lookAhead: number,
    ): void {
        this._movementAllowed.fill(1, 0, this._count);
        this._bypassLeftAllowed.fill(1, 0, this._count);
        this._bypassRightAllowed.fill(1, 0, this._count);
        // All candidates stay fixed until this pass ends. Reuse the exact pair
        // order and geometry collected before any forward velocities were stopped.
        const inspectPair = (
            first: number, second: number, dx: number, dy: number,
            distanceSquared: number, occupiedDistance: number, cachedFreeSpace: number,
        ): void => {
            const firstHasBypass = this._bypassVelocitiesX[first] !== 0
                || this._bypassVelocitiesY[first] !== 0;
            const secondHasBypass = this._bypassVelocitiesX[second] !== 0
                || this._bypassVelocitiesY[second] !== 0;
            if (!firstHasBypass && !secondHasBypass) return;
            const firstForward = (this._velocitiesX[first] * dx + this._velocitiesY[first] * dy) * dt;
            const secondForward = (-this._velocitiesX[second] * dx - this._velocitiesY[second] * dy) * dt;
            const firstSide = (this._bypassVelocitiesX[first] * dx + this._bypassVelocitiesY[first] * dy) * dt;
            const secondSide = (-this._bypassVelocitiesX[second] * dx - this._bypassVelocitiesY[second] * dy) * dt;
            const firstMayApproach = Math.max(firstForward, Math.abs(firstSide)) > 0.000001;
            const secondMayApproach = Math.max(secondForward, Math.abs(secondSide)) > 0.000001;
            const freeSpace = cachedFreeSpace >= 0 ? cachedFreeSpace : Math.max(0,
                distanceSquared - occupiedDistance * Math.sqrt(distanceSquared));
            // Reserve room for either side the neighbour might choose, even if
            // another pair later stops it. A candidate either fits at full speed
            // or is rejected; no fractional movement is applied.
            this.limitBypassCandidates(first, firstForward, firstSide,
                freeSpace * (secondMayApproach ? 0.5 : 1));
            this.limitBypassCandidates(second, secondForward, secondSide,
                freeSpace * (firstMayApproach ? 0.5 : 1));
        };
        if (this._crowdPairCacheOverflow) {
            this.forEachNearbyPair((first, second) => {
                const dx = this._positionsX[second] - this._positionsX[first];
                const dy = this._positionsY[second] - this._positionsY[first];
                const distanceSquared = dx * dx + dy * dy;
                const occupiedDistance = this.getMonsterBodyRadius(first)
                    + this.getMonsterBodyRadius(second) + gap;
                if (distanceSquared >= (occupiedDistance + lookAhead) ** 2
                    || distanceSquared < 0.000001) return;
                inspectPair(first, second, dx, dy, distanceSquared, occupiedDistance, -1);
            }, gap + lookAhead);
        } else {
            for (let pair = 0; pair < this._crowdPairCount; pair++) {
                const offset = pair * CROWD_PAIR_GEOMETRY_STRIDE;
                inspectPair(
                    this._crowdPairIndices[pair * 2], this._crowdPairIndices[pair * 2 + 1],
                    this._crowdPairGeometry[offset], this._crowdPairGeometry[offset + 1],
                    this._crowdPairGeometry[offset + 2], this._crowdPairGeometry[offset + 3],
                    this._crowdPairGeometry[offset + 4],
                );
            }
        }

        for (let i = 0; i < this._count; i++) {
            if (this.getMonsterDefinition(i).rank === MonsterRank.Boss) continue;
            if (!this._movementAllowed[i]) {
                this._velocitiesX[i] = 0;
                this._velocitiesY[i] = 0;
            }
            const bx = this._bypassVelocitiesX[i];
            const by = this._bypassVelocitiesY[i];
            if (bx === 0 && by === 0) continue;
            const left = this._bypassLeftAllowed[i];
            const right = this._bypassRightAllowed[i];
            let side = this._bypassSides[i];
            if (side === 0) {
                const targetDx = this._targetSnapshotsX[i] + this._targetOffsetsX[i]
                    - this._positionsX[i];
                const targetDy = this._targetSnapshotsY[i] + this._targetOffsetsY[i]
                    - this._positionsY[i];
                const progress = bx * targetDx + by * targetDy;
                side = Math.abs(progress) > 0.001
                    ? (progress > 0 ? 1 : -1)
                    : (this._monsterIds[i] & 1 ? 1 : -1);
            }
            const preferred = side > 0 ? left : right;
            const alternative = side > 0 ? right : left;
            if (!preferred) {
                if (!alternative) continue;
                side = -side;
            }
            this._bypassSides[i] = side;
            const blocker = this._blockerIndices[i];
            this._bypassBlockerIds[i] = this.hasCrowdPriority(blocker, i)
                ? this._monsterIds[blocker] : 0;
            this._velocitiesX[i] = bx * side;
            this._velocitiesY[i] = by * side;
        }
    }

    private limitBypassCandidates (
        index: number,
        forward: number,
        side: number,
        availableSpace: number,
    ): void {
        // A neighbour's detour must not slow the Boss in the second crowd pass either.
        if (this.getMonsterDefinition(index).rank === MonsterRank.Boss) return;
        if (forward > availableSpace + 0.000001) this._movementAllowed[index] = 0;
        if (side > availableSpace + 0.000001) this._bypassLeftAllowed[index] = 0;
        if (-side > availableSpace + 0.000001) this._bypassRightAllowed[index] = 0;
    }

    private hasCrowdPriority (first: number, second: number): boolean {
        if (first < 0 || first >= this._count || second < 0 || second >= this._count) return false;
        const firstBoss = this.getMonsterDefinition(first).rank === MonsterRank.Boss;
        const secondBoss = this.getMonsterDefinition(second).rank === MonsterRank.Boss;
        if (firstBoss !== secondBoss) return firstBoss;
        // Persistent detours may only follow a body closer to the shared target.
        // The strict distance/ID ordering prevents pairs (or longer chains) from
        // circling one another indefinitely and carrying the crowd away.
        const firstX = this._positionsX[first] - this._targetLocal.x;
        const firstY = this._positionsY[first] - this._targetLocal.y;
        const secondX = this._positionsX[second] - this._targetLocal.x;
        const secondY = this._positionsY[second] - this._targetLocal.y;
        const firstDistance = firstX * firstX + firstY * firstY;
        const secondDistance = secondX * secondX + secondY * secondY;
        return firstDistance < secondDistance
            || firstDistance === secondDistance
                && this._monsterIds[first] < this._monsterIds[second];
    }

    private updateBossAttacks (): void {
        for (let index = 0; index < this._count; index++) {
            const monster = this.getMonsterDefinition(index);
            if (monster.rank !== MonsterRank.Boss) continue;

            const enemyId = this._monsterIds[index];
            const attack = this._bossAttacks.get(enemyId);
            if (attack) {
                if (attack.impactPending) {
                    attack.impactPending = false;
                    // Contact may already have hit during this swing; only settle it once.
                    const dx = this._targetLocal.x - this._positionsX[index];
                    const dy = this._targetLocal.y - this._positionsY[index];
                    const radius = Math.max(1, this.bossImpactRadius);
                    if (!attack.damageApplied && dx * dx + dy * dy <= radius * radius) {
                        this.applyPlayerHit(index, true);
                        if (this._battleEnded) return;
                    }
                }
                if (attack.completed) {
                    this._bossAttacks.delete(enemyId);
                    this._bossNextAttackTimes.set(enemyId,
                        this._elapsedBattleTime + Math.max(0, this.bossAttackCooldown));
                    this._targetRefreshTimers[index] = 0;
                }
                continue;
            }

            if (this._elapsedBattleTime < (this._bossNextAttackTimes.get(enemyId) ?? 0)) continue;
            const dx = this._targetLocal.x - this._positionsX[index];
            const dy = this._targetLocal.y - this._positionsY[index];
            const range = Math.max(1, this.bossAttackRange);
            if (dx * dx + dy * dy > range * range) continue;

            const state: BossAttackState = {
                impactPending: false, completed: false, damageApplied: false,
            };
            this._bossAttacks.set(enemyId, state);
            const started = this._prefabVisuals?.playAttack(enemyId, dx,
                () => { state.impactPending = true; },
                () => { state.completed = true; });
            if (!started) {
                this._bossAttacks.delete(enemyId);
                this._bossNextAttackTimes.set(enemyId, this._elapsedBattleTime + 1);
                continue;
            }
            this._velocitiesX[index] = 0;
            this._velocitiesY[index] = 0;
        }
    }

    private applyPlayerContactDamage (): void {
        if (!this._characterStats?.isAlive
            || this._elapsedBattleTime < this._nextPlayerDamageTime) return;

        const contactRadius = Math.max(1, this.playerContactRadius);
        let damageMultiplier = 0;
        let sourceIndex = -1;
        // Contact uses the footprint at the feet, not the offset damage/aim circle.
        for (let index = 0; index < this._count; index++) {
            const monster = this.getMonsterDefinition(index);
            // Touching a large enemy reacts immediately, even during its windup.
            if (monster.rank === MonsterRank.Boss
                && this._bossAttacks.get(this._monsterIds[index])?.damageApplied) continue;
            const radius = contactRadius + Math.max(0, monster.bodyRadius - NORMAL_BODY_RADIUS);
            const dx = this._positionsX[index] - this._targetLocal.x;
            const dy = this._positionsY[index] - this._targetLocal.y;
            if (dx * dx + dy * dy <= radius * radius) {
                if (monster.contactDamageMultiplier > damageMultiplier) {
                    damageMultiplier = monster.contactDamageMultiplier;
                    sourceIndex = index;
                }
            }
        }
        if (sourceIndex >= 0) {
            this.applyPlayerHit(sourceIndex,
                this.getMonsterDefinition(sourceIndex).rank === MonsterRank.Boss);
        }
    }

    private applyPlayerHit (sourceIndex: number, heavy: boolean): void {
        if (!this.target || !this._characterStats?.isAlive
            || this._elapsedBattleTime < this._nextPlayerDamageTime) return;

        // Convert the source into the player's parent space, independent of sprite mirroring.
        this._hitSourceLocal.set(this._positionsX[sourceIndex], this._positionsY[sourceIndex], 0);
        const parentTransform = this.target.parent?.getComponent(UITransform);
        if (this._renderTransform && parentTransform) {
            this._renderTransform.convertToWorldSpaceAR(this._hitSourceLocal, this._hitSourceWorld);
            parentTransform.convertToNodeSpaceAR(this._hitSourceWorld, this._hitSourceLocal);
        }
        const dx = this.target.position.x - this._hitSourceLocal.x;
        const dy = this.target.position.y - this._hitSourceLocal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const monster = this.getMonsterDefinition(sourceIndex);
        const damageMultiplier = monster.contactDamageMultiplier;

        const appliedDamage = this._characterStats.takeDamage(
            Math.max(0, this.playerContactDamage) * damageMultiplier,
            {
                directionX: distance > 0.001 ? dx / distance : 1,
                directionY: distance > 0.001 ? dy / distance : 0,
                heavy,
                elite: monster.rank === MonsterRank.Elite,
            },
        );
        if (appliedDamage <= 0) return;
        const attack = this._bossAttacks.get(this._monsterIds[sourceIndex]);
        if (attack) attack.damageApplied = true;
        this._nextPlayerDamageTime = this._elapsedBattleTime
            + Math.max(0.05, this.playerDamageInterval);

        this._damageNumberRenderer?.showPlayerDamage(
            this._targetLocal.x,
            this._targetLocal.y + 72,
            appliedDamage,
        );

    }

    private syncRenderData (): void {
        const flashDuration = Math.max(0, this.monsterHitFlashDuration);
        for (const batch of this._batches) batch.setCount(0);
        let normalCount = 0;
        for (let index = 0; index < this._count; index++) {
            const monster = this.getMonsterDefinition(index);
            const hitFlash = flashDuration > 0
                ? Math.min(1, Math.max(0, (
                    this._hitFlashEndTimes[index] - this._elapsedBattleTime
                ) / flashDuration))
                : 0;
            if (monster.prefabKey) {
                this._prefabVisuals?.sync(
                    this._monsterIds[index],
                    this._positionsX[index],
                    this._positionsY[index],
                    this._velocitiesX[index],
                    this._velocitiesY[index],
                    hitFlash,
                );
                continue;
            }
            const batchIndex = Math.floor(normalCount / MONSTERS_PER_RENDERER);
            this._batches[batchIndex].setMonster(
                normalCount % MONSTERS_PER_RENDERER,
                this._positionsX[index],
                this._positionsY[index],
                monster.size,
                monster.size,
                index & 3,
                this._velocitiesX[index] < -0.01,
                hitFlash,
            );
            normalCount++;
        }
        for (const batch of this._batches) batch.commit();
    }

    private forEachNearbyPair (
        callback: (first: number, second: number) => void,
        extraDistance = 0,
    ): void {
        const cellSize = this.getGridCellSize();
        for (let first = 0; first < this._count; first++) {
            const firstRadius = this.getMonsterBodyRadius(first);
            // The larger footprint owns the pair. Bounds include braking space
            // only for the movement query; ordinary contact queries stay small.
            const extent = firstRadius * 2 + extraDistance;
            const minX = Math.floor((this._positionsX[first] - extent) / cellSize);
            const maxX = Math.floor((this._positionsX[first] + extent) / cellSize);
            const minY = Math.floor((this._positionsY[first] - extent) / cellSize);
            const maxY = Math.floor((this._positionsY[first] + extent) / cellSize);
            for (let gridY = minY; gridY <= maxY; gridY++) {
                for (let gridX = minX; gridX <= maxX; gridX++) {
                    const bucket = this._grid.get(this.getCellKey(gridX, gridY));
                    if (!bucket) continue;
                    for (const second of bucket) {
                        const secondRadius = this.getMonsterBodyRadius(second);
                        if (secondRadius < firstRadius
                            || secondRadius === firstRadius && second > first) {
                            callback(first, second);
                        }
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
        const cellSize = this.getGridCellSize();
        return this.getCellKey(
            Math.floor(x / cellSize),
            Math.floor(y / cellSize),
        );
    }

    private getMonsterHashRatio (monsterId: number, salt: number): number {
        let hash = (monsterId ^ salt) >>> 0;
        hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
        hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
        return ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
    }
}
