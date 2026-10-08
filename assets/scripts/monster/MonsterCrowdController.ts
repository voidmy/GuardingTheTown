import {
    _decorator,
    director,
    Game,
    game,
    AudioClip,
    AudioSource,
    Component,
    Label,
    Node,
    Prefab,
    Rect,
    sys,
    UITransform,
    Vec2,
    Vec3,
    view,
} from 'cc';
import { DEBUG } from 'cc/env';
import {
    BASE_ATTACK_POWER, BASE_CONTACT_DAMAGE, BASE_PLAYER_HEALTH, formatCombatNumber,
    ATTACK_BONUS_PER_RANK, calculateSkillDamage,
} from '../combat/CombatNumbers';
import {
    MAX_BATCH_MONSTERS,
    MONSTERS_PER_RENDERER,
    MonsterBatchRenderer,
} from './MonsterBatchRenderer';
import {
    DEFAULT_MONSTER_LEVEL,
    createRunRandom,
    getMonsterMoveSpeedMultiplier,
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
    MAX_BASIC_ATTACK_PROJECTILES,
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
import { MAX_SKILL_SLOTS, RunProgression, UpgradeEffect, UpgradeOffer } from '../progression/RunProgression';
import { LootDropSystem } from '../progression/LootDropSystem';
import { LootReward } from '../progression/LootDropModel';
import { CharmId, POTIONS, POTION_IDS, PotionId, PotionInventory, POTION_USE_GAP } from '../progression/ExpeditionDefinitions';
import { ExpeditionLoadout } from '../progression/ExpeditionLoadout';
import { MetaProgress } from '../progression/MetaProgress';
import { MANUAL_SUPPLY_TIMES, RESEARCH_SKILLS, SkillMastery, SkillResearchSession } from '../progression/SkillMastery';
import { PotionEffects } from '../combat/PotionEffects';
import { HomePanel } from '../ui/HomePanel';
import { ExpeditionHud } from '../ui/ExpeditionHud';
import { PotionMenu } from '../ui/PotionMenu';
import { QiBladeAbility, QiBladeAbilityOptions } from '../combat/QiBladeAbility';
import { SwordQiAbility, SwordQiAbilityOptions } from '../combat/SwordQiAbility';
import { TornadoAbility, TornadoAbilityOptions } from '../combat/TornadoAbility';
import { ElementalAbility, ElementalAbilityOptions, ElementalKind } from '../combat/ElementalAbility';
import { ElementalSkillAudio } from '../combat/ElementalSkillAudio';
import { ALL_SKILLS, SKILL_NAMES, EVOLUTIONS, SKILL_DAMAGE_PROFILES } from '../progression/UpgradeDefinitions';
import { GameSkill } from '../GameSettings';
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

type CottonPhase = 'enter' | 'pursue' | 'summon' | 'charge' | 'roll' | 'recover';
interface CottonSkillState {
    phase: CottonPhase;
    remaining: number;
    nextSummon: boolean;
    summonedTotal: number;
    summonCount: number;
    summonResolved: boolean;
    points: Vec2[];
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    hitRadius: number;
    damageApplied: boolean;
}
const COTTON_SUMMON_BATCH = 6;
const COTTON_SUMMON_LIMIT = 12;
const COTTON_ROLL_DURATION = 0.8;

const ALL_GAME_SKILLS = ALL_SKILLS;
const ABILITY_IDS = ['basic-attack', 'piercing-arrow', 'qi-blade', 'tornado',
    'thunder', 'chain-lightning', 'frost-pulse', 'sword-qi'] as const;
const RESEARCH_ABILITY_SKILLS: Readonly<Record<string, GameSkill>> = {
    'sword-qi': GameSkill.SwordQi, thunder: GameSkill.Thunder,
    'piercing-arrow': GameSkill.PiercingArrow, 'chain-lightning': GameSkill.ChainLightning,
};

@ccclass('MonsterCrowdController')
@menu('Gameplay/Monster Crowd Controller')
export class MonsterCrowdController extends Component implements EnemyCombatWorld {
    @property(Node)
    public renderLayer: Node | null = null;

    @property({ type: Node, displayName: '地面特效层' })
    public groundEffectLayer: Node | null = null;

    @property({ type: Node, displayName: '技能上层特效' })
    public skillEffectLayer: Node | null = null;

    @property({ type: ElementalSkillAudio, displayName: '元素技能音效' })
    public elementalAudio: ElementalSkillAudio | null = null;

    @property(Node)
    public target: Node | null = null;

    @property({ type: Node, displayName: '死亡掉落层' })
    public lootLayerNode: Node | null = null;

    @property({ min: 0, step: 1, displayName: '普通怪掉落经验' })
    public normalDropExperience = 1;

    @property({ min: 0, step: 1, displayName: '精英掉落经验' })
    public eliteDropExperience = 20;

    @property({ min: 0, step: 1, displayName: 'Boss 掉落经验' })
    public bossDropExperience = 50;

    @property({ min: 0, max: 100, step: 0.1, displayName: '宝箱额外掉率（%）', tooltip: '普通怪基准概率，额外掉落，不替代经验。' })
    public chestDropChance = 0.8;

    @property({ min: 0, max: 100, step: 0.1, displayName: '装备额外掉率（%）' })
    public equipmentDropChance = 0.2;

    @property({ min: 0, displayName: '精英稀有掉率倍率' })
    public eliteRareDropMultiplier = 5;

    @property({ min: 0, displayName: 'Boss 稀有掉率倍率' })
    public bossRareDropMultiplier = 10;

    @property(Prefab)
    public bulletPrefab: Prefab | null = null;

    @property(Prefab)
    public arrowPrefab: Prefab | null = null;

    @property(Prefab)
    public qiBladePrefab: Prefab | null = null;

    @property(Prefab)
    public tornadoPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '自动落雷特效' })
    public thunderPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '连锁闪电特效' })
    public chainLightningPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '寒霜脉冲特效' })
    public frostPulsePrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '地裂药水特效' })
    public earthRiftPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '唤雨药水特效' })
    public rainPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '刀气起双斩特效' })
    public swordQiPrefab: Prefab | null = null;

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
    public maximumMonsters = 360;

    @property({ visible: false })
    public monsterHealthGrowthInterval = 60;

    @property({ visible: false })
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
    public playerContactDamage = BASE_CONTACT_DAMAGE;

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
    public fireInterval = 1.5;

    @property({ displayName: '初始散弹数', min: 1, max: MAX_BASIC_ATTACK_PROJECTILES, step: 1 })
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

    @property({ displayName: '气刃初始环绕距离', min: 1, tooltip: 'Lv.1 气刃到角色中心的距离，不影响刀身大小。' })
    public qiBladeOrbitRadius = 190;

    @property({ displayName: '气刃每级距离增量', min: 0, tooltip: '每升一级增加的环绕距离；进化保持 Lv.5 距离。' })
    public qiBladeOrbitRadiusPerLevel = 15;

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
    private _frozenUntil = new Float32Array(0);
    private _slowedUntil = new Float32Array(0);
    private _frostSpeedRatios = new Float32Array(0);
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
    private readonly _cottonSkills = new Map<EnemyId, CottonSkillState>();
    private readonly _summonedMonsters = new Set<EnemyId>();
    private readonly _skillPosition = new Vec2();
    private readonly _summonCommand: MonsterSpawnBatchCommand = {
        monsterTypeIndex: DEFAULT_MONSTER_LEVEL.monsters.findIndex((monster) => monster.id === 'cotton'),
        entrance: DEFAULT_MONSTER_LEVEL.entrances[0], formation: MonsterSpawnFormation.Line,
        count: 1, firstMonsterIndex: 0, batchSize: 1, batchSequence: 0,
    };
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
    private readonly _rainViewportMin = new Vec3();
    private readonly _rainViewportMax = new Vec3();
    private readonly _rainViewportWorld = new Vec3();
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
    private _lootDrops: LootDropSystem | null = null;
    private readonly _lootPosition = new Vec3();
    private readonly _lootWorldPosition = new Vec3();
    private readonly _collectLoot = (reward: LootReward): number | void => {
        if (this._battleEnded || this._homeOpen) return 0;
        if (reward.kind === 'manual') return this.collectManual(reward);
        if (reward.kind === 'potion') {
            if (!reward.potion || !this._potions.pickup(reward.potion)) return 0;
            this._lootNotice = `拾取${POTIONS[reward.potion].name}`;
            this._lootNoticeTime = 4;
            this._lootCollectedThisFrame = true;
            return 1;
        }
        if (reward.kind === 'sand') {
            const amount = reward.stacks ?? 1;
            if (!MetaProgress.instance.addSand(amount)) return 0;
            this._runSand += amount;
            this._lootCollectedThisFrame = true;
            return amount;
        }
        if (reward.kind === 'chest' || reward.kind === 'equipment') {
            this.collectRareLoot(reward);
            this._lootCollectedThisFrame = true;
            return;
        }
        this._progression.addExperience(reward.experience);
        if (reward.evolution) {
            this._progression.grantEvolution();
            this._characterStats?.heal(this._characterStats.maximumHealth * 0.15);
        }
        this._lootCollectedThisFrame = true;
    };
    private _lootCollectedThisFrame = false;
    private _lootEquipmentChanged = false;
    private _lootNotice = '';
    private _lootNoticeTime = 0;
    private _abilityController: AbilityController | null = null;
    private _projectileSystem: ProjectileSystem | null = null;
    private _upgradePanel: UpgradeSelectionPanel | null = null;
    private readonly _learnedSkills = new Set<GameSkill>();
    private _rewardRandom: () => number = Math.random;
    private _spawnRandom: () => number = Math.random;
    private readonly _progression = new RunProgression(() => this._rewardRandom());
    private readonly _cores = new Set<string>();
    private _hud: PlayerHud | null = null;
    private _uiManager: UIManager | null = null;
    private _cheatPanel: CheatPanel | null = null;
    private _cheatOpen = false;
    private _loadingCheats = false;
    private _battleEnded = false;
    private _victoryPending = false;
    private _victory = false;
    private _finalBossId: EnemyId | null = null;
    private _victorySandPending = 0;
    private _maximumHealth = new Float32Array(0);
    private readonly _supplies: { time: number; kind: 'chest' | 'equipment' | 'potion'; potion?: PotionId }[] = [];
    private _nextSupply = 0;
    private _homeOpen = true;
    private _potionMenuOpen = false;
    private _castingPotion = false;
    private _leaving = false;
    private _equippedCharm: CharmId | null = null;
    private _cooldownMultiplier = 1;
    private _runSand = 0;
    private _research: SkillResearchSession | null = null;
    private _researchSkills: GameSkill[] = [];
    private _nextManualSupply = 0;
    private _noticedMasteries = 0;
    private _manualRetryTime = 0;
    private readonly _saveResearch = (): void => {
        this._research?.flush();
        this.updateMasteredSkills();
    };
    private _potionGap = 0;
    private _potions = new PotionInventory();
    private _potionEffects: PotionEffects | null = null;
    private _homePanel: HomePanel | null = null;
    private _expeditionHud: ExpeditionHud | null = null;
    private _potionMenu: PotionMenu | null = null;
    private readonly _canCollectLoot = (reward: LootReward): boolean => reward.kind === 'potion'
        ? this._potions.hasSpace : reward.kind === 'manual'
            ? SkillMastery.instance.canResearch && this._elapsedBattleTime >= this._manualRetryTime
            : reward.kind !== 'sand' || !MetaProgress.instance.error;
    private _offerRetryTime = 0;
    private _initialMaximumHealth = BASE_PLAYER_HEALTH;
    private _baseAttackPower = BASE_ATTACK_POWER;
    private _baseMoveSpeed = 220;
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
    private _swordQiOptions: SwordQiAbilityOptions | null = null;
    private _tornadoOptions: TornadoAbilityOptions | null = null;
    private readonly _elementalOptions = new Map<GameSkill, ElementalAbilityOptions>();

    public getProgressionSnapshot (): ProgressionSnapshot {
        const snapshot = this._progression.getSnapshot();
        const coreNames: Record<string, string> = {
            formation: '破阵', focus: '专注猎杀', blade_guard: '护体气刃',
            wind_eye: '风眼暴露', kill_reserve: '余势', steady_guard: '稳守',
        };
        return {
            elapsedSeconds: this._elapsedBattleTime,
            kills: this._totalKillCount,
            skillLimit: MAX_SKILL_SLOTS,
            playerLevel: snapshot.playerLevel,
            experience: snapshot.experience,
            experienceToNext: snapshot.nextLevelExperience,
            skills: snapshot.skills.map(skill => ({
                ...skill,
                name: skill.evolved ? EVOLUTIONS[skill.skill].name : SKILL_NAMES[skill.skill],
                innate: skill.skill === snapshot.initialSkill,
                damage: this.getSkillDamage(skill.skill),
                temporary: this._research?.isTrial(skill.skill) ?? false,
                research: this._research?.isTrial(skill.skill) ? this.researchProgress(skill.skill) : undefined,
            })),
            cores: snapshot.coreIds.map(id => ({ id, name: coreNames[id] ?? id })),
            refreshesRemaining: snapshot.refreshesRemaining,
            evolutionAvailable: this._progression.evolutionAvailable,
            evolutionUsed: snapshot.evolutionUsed,
            evolutionGranted: snapshot.evolutionGranted,
            combatStatus: [
                this._homeOpen ? '选择本命后开始守镇' : this._battleEnded
                    ? this._victory ? '守镇成功 · 苔石拳王已击败' : '守镇失利 · 返回小院再战'
                    : this._spawnModel.currentWaveNotice,
                this._cores.has('focus') ? `专注 ${this._focusStacks}/6` : '',
                this._cores.has('kill_reserve') ? (this._reserveReady ? '余势已就绪'
                    : `余势 ${this._reserveKills}/8`) : '',
            ].filter(Boolean).join(' · ') + (this._lootNoticeTime > 0 ? `\n${this._lootNotice}` : ''),
        };
    }

    public async openCheats (): Promise<void> {
        if (!DEBUG) return;
        if (this._homeOpen || this._potionMenuOpen || this._battleEnded || this._loadingCheats || this._cheatOpen
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

    public debugGrantEarthRift (): string {
        if (this._homeOpen || this._battleEnded || !this._potionEffects || !this.earthRiftPrefab) return '请先开始守镇。';
        if (!this._potions.pickup('earth-rift')) return '药水栏已满，请先使用或丢弃一瓶。';
        this.refreshProgressionUI();
        return '已获得地裂灵露，关闭秘籍后点击药水栏使用。';
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
        if (this._homeOpen || this._potionMenuOpen || this._battleEnded || this._cheatOpen || this._upgradePanel?.isShowing) return;
        const offer = this._progression.openOffer('evolution', this.getGrowthHealth());
        if (offer) this.showGrowthOffer(offer);
    }

    private getGrowthHealth (): { current: number; maximum: number; initialMaximum: number } {
        return {
            current: this._characterStats?.currentHealth ?? BASE_PLAYER_HEALTH,
            maximum: this._characterStats?.maximumHealth ?? BASE_PLAYER_HEALTH,
            initialMaximum: this._initialMaximumHealth,
        };
    }

    private setBattlePaused (paused: boolean): void {
        const value = paused || this._battleEnded || this._homeOpen || this._potionMenuOpen;
        if (this._isChoosingUpgrade === value) return;
        this._isChoosingUpgrade = value;
        this._potionEffects?.setPaused(value);
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
        if (this._battleEnded || this._homeOpen || this._potionMenuOpen || this._cheatOpen || this._upgradePanel?.isShowing) return;
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
        this._abilityController?.removeAbility(ABILITY_IDS[skill]);
        this._projectileSystem?.clearAbility(ABILITY_IDS[skill]);
        this._elementalOptions.delete(skill);
        this._learnedSkills.delete(skill);
        switch (skill) {
        case GameSkill.BasicAttack: this._basicAttackOptions = null; break;
        case GameSkill.PiercingArrow: this._piercingArrowOptions = null; break;
        case GameSkill.QiBlade: this._qiBladeOptions = null; break;
        case GameSkill.SwordQi: this._swordQiOptions = null; break;
        case GameSkill.Tornado: this._tornadoOptions = null; this._tornadoAbility = null; break;
        }
    }

    private syncProgression (): void {
        const snapshot = this._progression.getSnapshot();
        this._growthDamageBonus = snapshot.damageBonus;
        if (this._characterStats) {
            // Recompute from the initial speed so repeated syncs never compound bonuses.
            this._characterStats.moveSpeed = this._baseMoveSpeed * (1 + snapshot.moveSpeedBonus)
                * (this._equippedCharm === 'wind' ? 1.12 : 1);
        }
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
            const elemental = this._elementalOptions.get(skill);
            if (elemental) { elemental.level = level; elemental.evolved = evolved; elemental.cooldownMultiplier = this._cooldownMultiplier; }
            if (skill === GameSkill.SwordQi && this._swordQiOptions) {
                this._swordQiOptions.level = level;
                this._swordQiOptions.evolved = evolved;
                this._swordQiOptions.cooldownMultiplier = this._cooldownMultiplier;
            }
            if (skill === GameSkill.BasicAttack && this._basicAttackOptions) {
                Object.assign(this._basicAttackOptions, {
                    damage: this.bulletDamage,
                    interval: this.fireInterval * this._cooldownMultiplier,
                    projectilesPerShot: evolved ? MAX_BASIC_ATTACK_PROJECTILES : Math.min(
                        MAX_BASIC_ATTACK_PROJECTILES,
                        Math.max(1, this.bulletsPerShot | 0) + Math.max(0, level - 1),
                    ),
                });
            } else if (skill === GameSkill.PiercingArrow && this._piercingArrowOptions) {
                Object.assign(this._piercingArrowOptions, {
                    damage: this.arrowDamage,
                    interval: this.arrowInterval * (level >= 5 ? 0.7 : level >= 4 ? 0.8 : level >= 2 ? 0.9 : 1) * this._cooldownMultiplier,
                    projectilesPerShot: evolved ? 3 : level >= 3 ? 2 : 1,
                    pattern: evolved ? 'fan' : 'parallel',
                    fanAngle: 30,
                    attackRange: this.bulletAttackRange,
                });
            } else if (skill === GameSkill.QiBlade && this._qiBladeOptions) {
                Object.assign(this._qiBladeOptions, {
                    damage: this.qiBladeDamage,
                    bladeCount: evolved ? 6 : level,
                    orbitRadius: this.qiBladeOrbitRadius + (level - 1) * this.qiBladeOrbitRadiusPerLevel,
                    damageInterval: this.qiBladeDamageInterval * this._cooldownMultiplier,
                });
            } else if (skill === GameSkill.Tornado && this._tornadoOptions) {
                Object.assign(this._tornadoOptions, {
                    damage: this.tornadoDamage,
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
        this._expeditionHud?.refresh(this._potions.slots, this._equippedCharm, this._runSand, this._potionGap, this._battleEnded);
        this._cheatPanel?.refresh();
        this._lastDisplayedCount = -1;
        this.updateCountLabel();
    }

    private updateCoreTimers (dt: number): void {
        const nextCoreTime = this._coreRewardCount === 0 ? 80 : 210;
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
        if (this._battleEnded) return;
        this.finishBattle(false);
    }

    private finishBattle (victory: boolean): void {
        if (this._battleEnded) return;
        this._saveResearch();
        this._victory = victory;
        this._victoryPending = false;
        this._battleEnded = true;
        this._potionEffects?.stopRain();
        this._potionMenuOpen = false;
        this._potionMenu?.hide();
        this._progression.cancelPendingRewards();
        this._upgradePanel?.hide();
        this._cheatOpen = false;
        this._cheatPanel = null;
        this._uiManager?.closePopup('UI/CheatPanel');
        this.setBattlePaused(true);
        if (victory) {
            this._victorySandPending = 15;
            this.settleVictoryReward();
        }
        this.refreshProgressionUI();
        const seconds = Math.floor(this._elapsedBattleTime);
        this._potionMenu?.showResult(victory ? '守镇成功' : '守镇失利',
            `${Math.floor(seconds / 60)}分${seconds % 60}秒 · 击败 ${this._totalKillCount} 只 · Lv.${this._progression.getSnapshot().playerLevel}\n`
            + `梦砂 +${this._runSand}`
            + (victory ? ` · 通关15梦砂${this._victorySandPending > 0 ? '待重试领取' : '已计入'}` : ' · 失败也保留收获')
            + this.researchSummary(),
            () => this.returnHome());
        this._potionMenu?.showStatus(this._research?.hasPending ? '研习暂未保存，返回时重试。' : '研习已保存 · 掌握后可选本命');
        console.info(`[MonsterCrowdController] ${victory ? '守镇成功' : '角色倒下'}，本局结束。`);
    }

    private settleVictoryReward (): boolean {
        if (this._victorySandPending === 0) return true;
        if (!MetaProgress.instance.addSand(this._victorySandPending)) return false;
        this._runSand += this._victorySandPending;
        this._victorySandPending = 0;
        return true;
    }

    private clearFocus (): void {
        this._focusTarget = null;
        this._focusStacks = 0;
        this._focusLastHit = -Infinity;
        this._focusOutOfRangeSince = -1;
    }

    private isRegularSkill (skill: GameSkill): boolean {
        return skill !== GameSkill.Tornado && skill !== GameSkill.FrostPulse;
    }

    private getStartingSkills (): GameSkill[] {
        return ALL_GAME_SKILLS.filter(skill => this.isRegularSkill(skill) && this.hasSkillAsset(skill)
            && (skill !== GameSkill.SwordQi || !!this.skillEffectLayer)
            && (skill !== GameSkill.Thunder && skill !== GameSkill.ChainLightning
                || !!this.skillEffectLayer && !!this.groundEffectLayer));
    }

    private getStartingPotions (): PotionId[] {
        return POTION_IDS.filter(id => id === 'healing'
            || id === 'storm' && !!this.tornadoPrefab
            || id === 'frost' && !!this.frostPulsePrefab
            || id === 'earth-rift' && !!this.earthRiftPrefab
            || id === 'rain' && !!this.rainPrefab);
    }

    private beginExpedition (loadout: ExpeditionLoadout): string {
        if (!this._homeOpen || !this._characterStats || !this.tornadoPrefab || !this.frostPulsePrefab
            || !this.renderLayer || !this.groundEffectLayer || !this._homePanel || !this._expeditionHud) {
            return '启程资源尚未就绪，请稍后重试。';
        }
        const skills = this.getStartingSkills();
        if (!skills.includes(loadout.skill)) return '所选本命暂不可用，请重新选择。';
        if (!SkillMastery.instance.owns(loadout.skill)) return '该技能尚未掌握，请先在战斗中拾取秘籍研习。';
        const charm = loadout.charm;
        if (charm !== null && !MetaProgress.instance.owns(charm)) return '请先解锁要携带的灵契。';
        const capacity = charm === 'satchel' ? 3 : 2;
        const potions = this.getStartingPotions();
        if (loadout.potions.length > capacity || loadout.potions.some(id => id !== null && !potions.includes(id))) {
            return '灵露配置已变化，请重新配置携带栏位。';
        }
        this._equippedCharm = charm;
        const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
        let previousRoute = '';
        try { previousRoute = sys.localStorage.getItem('guarding-town:last-route:v1') ?? ''; } catch { /* Optional preference. */ }
        this._spawnModel.reset(seed, previousRoute);
        this._rewardRandom = createRunRandom(seed ^ 0x9e3779b9);
        this._spawnRandom = createRunRandom(seed ^ 0xc2b2ae35);
        const supplyRandom = createRunRandom(seed ^ 0x85ebca6b);
        this._supplies.length = 0;
        this._nextSupply = 0;
        this._supplies.push({ time: 90 + Math.floor(supplyRandom() * 20),
            kind: supplyRandom() < 0.5 ? 'chest' : 'equipment' });
        this._supplies.push({ time: 215 + Math.floor(supplyRandom() * 20), kind: 'potion',
            potion: potions[Math.floor(supplyRandom() * potions.length)] });
        try { sys.localStorage.setItem('guarding-town:last-route:v1', this._spawnModel.routeSignature); } catch { /* Gameplay does not depend on storage. */ }
        console.info(`[MonsterCrowdController] 第一章 seed=${this._spawnModel.seed} routes=${this._spawnModel.routeSignature}`);
        this._cooldownMultiplier = charm === 'echo' ? 0.9 : 1;
        this._researchSkills = skills;
        this._research = new SkillResearchSession(SkillMastery.instance);
        this._nextManualSupply = 0;
        this._noticedMasteries = 0;
        this._manualRetryTime = 0;
        this._progression.reset(loadout.skill, skills, skills.filter(skill => SkillMastery.instance.owns(skill)));
        this.syncProgression();
        if (!this._learnedSkills.has(loadout.skill)) return '本命技能未能就绪，请重新选择。';
        this._potions = new PotionInventory(charm === 'satchel');
        // Keep deliberate empty slots and the exact order chosen in the departure panel.
        for (let index = 0; index < loadout.potions.length; index++) {
            this._potions.slots[index] = loadout.potions[index];
        }
        this._potionEffects = new PotionEffects(this, this.tornadoPrefab, this.frostPulsePrefab,
            this.renderLayer, this.groundEffectLayer, this._characterStats,
            () => this._baseAttackPower * (1 + this._growthDamageBonus),
            () => this.elementalAudio?.play('frost-pulse', false), this.earthRiftPrefab, {
                onImpact: () => this._targetMover?.playSkillImpact(14, 0.32),
                getVolume: () => this.elementalAudio?.volume ?? 0.7,
            }, this.rainPrefab, this.skillEffectLayer ?? this.renderLayer, {
                onOpening: () => this._targetMover?.playSkillImpact(5, 0.18),
                getVolume: () => this.elementalAudio?.volume ?? 0.7,
            });
        this._homeOpen = false;
        this._homePanel!.node.active = false;
        if (this._hud) this._hud.node.active = true;
        if (this.countLabelNode) this.countLabelNode.active = true;
        this._expeditionHud!.node.active = true;
        this.setBattlePaused(false);
        this.syncProgression();
        return '';
    }

    private openPotion (index: number): void {
        if (this._homeOpen || this._battleEnded || this._cheatOpen || this._potionMenuOpen
            || this._upgradePanel?.isShowing || !this._potionMenu) return;
        const id = this._potions.slots[index];
        if (!id) {
            this._lootNotice = '药水由怪物掉落，靠近后自动拾取。';
            this._lootNoticeTime = 4;
            this.refreshProgressionUI();
            return;
        }
        this._potionMenuOpen = true;
        this.setBattlePaused(true);
        const close = (): void => {
            this._potionMenuOpen = false;
            this._potionMenu?.hide();
            this.processGrowthQueue();
            this.refreshProgressionUI();
        };
        this._potionMenu.show(POTIONS[id].name, POTIONS[id].description, () => {
            if (this._potions.slots[index] !== id || !this._potionMenuOpen || this._battleEnded) return '药水状态已变化。';
            if (this._potionGap > 0) return `请关闭菜单，等待 ${this._potionGap.toFixed(1)} 秒后再使用。`;
            if (!this._potionEffects || !this.target || !this._renderTransform) return '药水效果尚未就绪。';
            this._renderTransform.convertToNodeSpaceAR(this.target.worldPosition, this._targetLocal);
            this._targetMover?.getFacingDirection(this._facingDirection);
            const context = this._abilityFrameContext;
            context.originX = this._targetLocal.x; context.originY = this._targetLocal.y;
            context.facingX = this._facingDirection.x; context.facingY = this._facingDirection.y;
            let error: string;
            this._castingPotion = true;
            try { error = this._potionEffects.use(id, context); }
            finally { this._castingPotion = false; }
            if (error) return error;
            this._potions.remove(index);
            this._potionGap = POTION_USE_GAP;
            close();
            return '';
        }, () => {
            if (this._potions.slots[index] !== id || !this._potionMenuOpen || this._battleEnded) return;
            this._potions.remove(index);
            close();
        }, close);
    }

    private openReturnHome (): void {
        if (this._homeOpen || this._potionMenuOpen || this._cheatOpen || this._upgradePanel?.isShowing || this._leaving) return;
        const leave = (): string => this.returnHome();
        if (this._battleEnded) { leave(); return; }
        this._potionMenuOpen = true;
        this.setBattlePaused(true);
        this._saveResearch();
        this._potionMenu?.show('返回归梦小院', `已拾取的 ${this._runSand} 梦砂与研习进度会保留。\n本局技能等级和剩余药水将清空。`
            + this.researchSummary(), leave, null, () => {
            this._potionMenuOpen = false;
            this._potionMenu?.hide();
            this.processGrowthQueue();
        });
        if (this._research?.hasPending) this._potionMenu?.showStatus('研习暂未保存，返回时重试。');
    }

    private returnHome (): string {
        if (this._leaving) return '';
        if (this._research && !this._research.flush()) return SkillMastery.instance.error + ' 请再次点击返回。';
        if (!this.settleVictoryReward()) return '通关奖励暂未保存，请再次点击领取并返回。';
        this._leaving = true;
        this.setBattlePaused(true);
        this._potionEffects?.stopRain();
        director.loadScene(this.node.scene.name, error => {
            if (error && this.isValid) {
                this._leaving = false;
                this._potionMenu?.showStatus('返回小院失败，请再次尝试。');
            }
        });
        return '';
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
            return this.findNearestEnemy(originX, originY, maxDistance, insideBoundsOnly);
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

    public findPriorityEnemy (x: number, y: number, range: number): EnemyId | null {
        let best: EnemyId | null = null;
        let bestRank = -1;
        let bestDistance = range * range;
        // Only once per thunder cast, independent of the projectile focus core.
        this.forEachMonsterInArea(x - range, x + range, y - range, y + range, index => {
            if (!this.isMonsterInsideCombatBounds(index)) return;
            const distance = (this._positionsX[index] - x) ** 2 + (this.getMonsterHitY(index) - y) ** 2;
            if (distance > range * range) return;
            const monster = this.getMonsterDefinition(index);
            const rank = monster.rank === MonsterRank.Boss ? 2 : monster.rank === MonsterRank.Elite ? 1 : 0;
            const id = this._monsterIds[index];
            if (rank > bestRank || rank === bestRank && (distance < bestDistance
                || distance === bestDistance && (best === null || id < best))) {
                best = id; bestRank = rank; bestDistance = distance;
            }
        });
        return best;
    }

    public applyFrost (enemyId: EnemyId, freezeDuration: number, slowDuration: number, speedRatio: number): void {
        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined || this._battleEnded || this._isChoosingUpgrade && !this._castingPotion) return;
        const rank = this.getMonsterDefinition(index).rank;
        if (rank === MonsterRank.Boss) return;
        const freeze = rank === MonsterRank.Normal ? Math.max(0, freezeDuration) : 0;
        const ratio = rank === MonsterRank.Elite ? 1 - (1 - speedRatio) * 0.5 : speedRatio;
        const wasSlowed = this._slowedUntil[index] > this._elapsedBattleTime;
        this._frozenUntil[index] = Math.max(this._frozenUntil[index], this._elapsedBattleTime + freeze);
        this._slowedUntil[index] = Math.max(this._slowedUntil[index], this._frozenUntil[index] + Math.max(0, slowDuration));
        this._frostSpeedRatios[index] = Math.max(0.1, Math.min(1, wasSlowed
            ? Math.min(this._frostSpeedRatios[index], ratio) : ratio));
    }

    private frostSpeedRatio (index: number): number {
        if (this._frozenUntil[index] > this._elapsedBattleTime) return 0;
        return this._slowedUntil[index] > this._elapsedBattleTime ? this._frostSpeedRatios[index] : 1;
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

    public getCombatViewport (out: Rect): boolean {
        const viewport = this.node.getComponent(UITransform);
        if (!viewport || !this._renderTransform) return false;
        const visible = view.getVisibleSize();
        if (visible.width <= 0 || visible.height <= 0) return false;
        this._rainViewportMin.set(-visible.width * 0.5, -visible.height * 0.5, 0);
        this._rainViewportMax.set(visible.width * 0.5, visible.height * 0.5, 0);
        viewport.convertToWorldSpaceAR(this._rainViewportMin, this._rainViewportWorld);
        this._renderTransform.convertToNodeSpaceAR(this._rainViewportWorld, this._rainViewportMin);
        viewport.convertToWorldSpaceAR(this._rainViewportMax, this._rainViewportWorld);
        this._renderTransform.convertToNodeSpaceAR(this._rainViewportWorld, this._rainViewportMax);
        out.x = Math.min(this._rainViewportMin.x, this._rainViewportMax.x);
        out.y = Math.min(this._rainViewportMin.y, this._rainViewportMax.y);
        out.width = Math.abs(this._rainViewportMax.x - this._rainViewportMin.x);
        out.height = Math.abs(this._rainViewportMax.y - this._rainViewportMin.y);
        return Number.isFinite(out.x + out.y + out.width + out.height) && out.width > 0 && out.height > 0;
    }

    public queryEnemiesInRect (bounds: Rect, results: EnemyId[]): void {
        results.length = 0;
        if (!this._renderTransform || bounds.width <= 0 || bounds.height <= 0) return;
        const halfWidth = this._renderTransform.width * 0.5;
        const halfHeight = this._renderTransform.height * 0.5;
        const left = Math.max(-halfWidth, bounds.x);
        const right = Math.min(halfWidth, bounds.x + bounds.width);
        const bottom = Math.max(-halfHeight, bounds.y);
        const top = Math.min(halfHeight, bounds.y + bounds.height);
        if (left >= right || bottom >= top) return;
        const padding = this._maximumHitQueryExtent + NORMAL_HIT_RADIUS;
        this.forEachMonsterInArea(left - padding, right + padding, bottom - padding, top + padding, index => {
            const x = this._positionsX[index];
            const y = this.getMonsterHitY(index);
            const radius = this.getMonsterDefinition(index).hitRadius;
            const dx = Math.max(left - x, 0, x - right);
            const dy = Math.max(bottom - y, 0, y - top);
            if (dx * dx + dy * dy <= radius * radius) results.push(this._monsterIds[index]);
        });
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
        const cottonSkill = monster.rank === MonsterRank.Elite ? this._cottonSkills.get(enemyId) : undefined;
        if (cottonSkill && cottonSkill.phase !== 'pursue') return false;
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

    public executeEnemy (enemyId: EnemyId, sourceAbilityId: string): boolean {
        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined) return false;
        const rank = this.getMonsterDefinition(index).rank;
        // Clearing potions retain their normal-enemy payoff without bypassing chapter objectives.
        const amount = sourceAbilityId === 'potion-earth-rift' && rank !== MonsterRank.Normal
            ? this._maximumHealth[index] * (rank === MonsterRank.Boss ? 0.3 : 0.6) : this._health[index];
        return this.applyDamage(enemyId, { amount, sourceAbilityId, isPrimaryAttack: false });
    }

    public applyDamage (enemyId: EnemyId, damage: DamageInfo): boolean {
        if (this._isChoosingUpgrade && !this._castingPotion || this._battleEnded) return false;

        const index = this._monsterIndexById.get(enemyId);
        if (index === undefined || !Number.isFinite(damage.amount) || damage.amount <= 0) return false;

        const damageX = this._positionsX[index];
        const monster = this.getMonsterDefinition(index);
        const primary = damage.isPrimaryAttack !== false;
        const projectile = damage.sourceAbilityId === 'basic-attack'
            || damage.sourceAbilityId === 'piercing-arrow';
        let amount = damage.amount;
        if (damage.sourceAbilityId === 'piercing-arrow' && this._cores.has('formation')) {
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
        const researchSkill = RESEARCH_ABILITY_SKILLS[damage.sourceAbilityId];
        if (appliedDamage > 0 && researchSkill !== undefined) this._research?.recordHit(researchSkill);
        const damageY = this.getMonsterHitY(index) + Math.max(48, monster.hitRadius);
        this._health[index] -= amount;
        if (monster.prefabKey) this._prefabVisuals?.setHealth(enemyId, this._health[index]);
        this._hitFlashEndTimes[index] = this._elapsedBattleTime
            + Math.max(0, this.monsterHitFlashDuration);
        this._damageNumberRenderer?.showDamage(
            damageX,
            damageY,
            appliedDamage,
            damage.sourceAbilityId,
        );
        if (this._health[index] <= 0) {
            const deathX = this._positionsX[index];
            const deathY = this._positionsY[index];
            this.removeMonster(index);
            if (enemyId === this._focusTarget) this.clearFocus();
            this.registerKill(monster, deathX, deathY);
            if (enemyId === this._finalBossId) this._victoryPending = true;
        }
        return true;
    }

    protected start (): void {
        if (this.countLabelNode) this.countLabelNode.active = DEBUG;
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
        this._lootDrops = this.lootLayerNode?.getComponent(LootDropSystem) ?? null;
        if (!this._lootDrops) {
            console.error('[MonsterCrowdController] 请配置带有 LootDropSystem 的死亡掉落层。');
            this.enabled = false;
            return;
        }

        if (!this.groundEffectLayer || this.groundEffectLayer === this.renderLayer
            || this.groundEffectLayer.parent !== this.renderLayer.parent) {
            console.error('[MonsterCrowdController] 请配置与怪物层同级的地面特效层。');
            this.enabled = false;
            return;
        }
        // Both layers use crowd-local coordinates and follow the same scrolling ground.
        this.groundEffectLayer.setPosition(this.renderLayer.position);
        this.groundEffectLayer.setRotation(this.renderLayer.rotation);
        this.groundEffectLayer.setScale(this.renderLayer.scale);
        this.groundEffectLayer.setSiblingIndex(0);
        if (!this.skillEffectLayer || this.skillEffectLayer === this.renderLayer
            || this.skillEffectLayer === this.groundEffectLayer
            || this.skillEffectLayer.parent !== this.renderLayer.parent) {
            console.error('[MonsterCrowdController] 请配置与怪物层同级的技能特效层。');
            this.enabled = false;
            return;
        }
        this.skillEffectLayer.setPosition(this.renderLayer.position);
        this.skillEffectLayer.setRotation(this.renderLayer.rotation);
        this.skillEffectLayer.setScale(this.renderLayer.scale);
        // Ground decals < combatants < spell flashes < damage numbers < HUD.
        this.skillEffectLayer.setSiblingIndex(-1);
        this._damageNumberRenderer?.node.setSiblingIndex(-1);
        this._lootDrops.clear();
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
        this._frozenUntil = new Float32Array(this._capacity);
        this._slowedUntil = new Float32Array(this._capacity);
        this._frostSpeedRatios = new Float32Array(this._capacity);
        this._targetSnapshotsX = new Float32Array(this._capacity);
        this._targetSnapshotsY = new Float32Array(this._capacity);
        this._targetOffsetsX = new Float32Array(this._capacity);
        this._targetOffsetsY = new Float32Array(this._capacity);
        this._targetRefreshTimers = new Float32Array(this._capacity);
        this._targetRefreshIntervals = new Float32Array(this._capacity);
        this._monsterTypeIndices = new Uint8Array(this._capacity);
        this._health = new Float32Array(this._capacity);
        this._maximumHealth = new Float32Array(this._capacity);
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
        this._prefabVisuals = new MonsterPrefabVisuals(this.renderLayer, prefabs, this.groundEffectLayer);
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
        this._elementalOptions.clear();
        this._basicAttackOptions = null;
        this._piercingArrowOptions = null;
        this._qiBladeOptions = null;
        this._swordQiOptions = null;
        this._tornadoOptions = null;

        this._initialMaximumHealth = this._characterStats?.maximumHealth ?? BASE_PLAYER_HEALTH;
        this._baseAttackPower = this._characterStats?.attackPower ?? BASE_ATTACK_POWER;
        this._baseMoveSpeed = this._characterStats?.moveSpeed ?? this._baseMoveSpeed;
        const scene = this.node.scene;
        this._uiManager = scene?.getComponentInChildren(UIManager) ?? null;
        this._hud = scene?.getComponentInChildren(PlayerHud) ?? null;
        if (this._hud) this._hud.characterNode = this.target;
        this._hud?.setController(this);
        this._characterStats?.node.on(CharacterStats.Event.Died, this.onPlayerDied, this);
        this._characterStats?.node.on(CharacterStats.Event.Damaged, this.onPlayerDamaged, this);
        this.updateCountLabel();
        this._homePanel = scene.getComponentInChildren(HomePanel);
        this._expeditionHud = scene.getComponentInChildren(ExpeditionHud);
        this._potionMenu = scene.getComponentInChildren(PotionMenu);
        this._potionMenu?.hide();
        this.setBattlePaused(true);
        if (this._hud) this._hud.node.active = false;
        if (this.countLabelNode) this.countLabelNode.active = false;
        if (this._expeditionHud) this._expeditionHud.node.active = false;
        if (!this._homePanel || !this._expeditionHud || !this._potionMenu) {
            console.error('[MonsterCrowdController] 请配置归梦小院、药水栏和药水操作面板。');
            return;
        }
        this._expeditionHud.configure(index => this.openPotion(index), () => this.openReturnHome());
        this._homePanel.configure(this.getStartingSkills(), this.getStartingPotions(), loadout => this.beginExpedition(loadout));
        this._homePanel.node.active = true;
        game.on(Game.EVENT_HIDE, this._saveResearch, this);
    }

    protected lateUpdate (dt: number): void {
        // Audio keeps playing while upgrade choices pause the battle simulation.
        this._monsterDeathSoundCooldown = Math.max(
            0, this._monsterDeathSoundCooldown - Math.max(0, dt),
        );
        if (this._batches.length === 0 || !this._renderTransform || !this.target) return;
        if (this._homeOpen || this._battleEnded || this._isChoosingUpgrade) return;
        this.processGrowthQueue();
        if (this._isChoosingUpgrade) return;

        const frameDt = Math.min(Math.max(dt, 0), 0.1);
        this._potionGap = Math.max(0, this._potionGap - frameDt);
        this._lootNoticeTime = Math.max(0, this._lootNoticeTime - frameDt);
        const simulationDt = Math.min(frameDt, 1 / 30);
        this._prefabVisuals?.advance(frameDt);
        this._elapsedBattleTime += frameDt;
        this.updateCoreTimers(frameDt);
        this._renderTransform.convertToNodeSpaceAR(
            this.target.worldPosition,
            this._targetLocal,
        );
        this.spawnMonsters(frameDt);
        this.updateSupplyDrops();
        this.updateManualSupply();

        if (this._count > 0) {
            this.updateBossAttacks(frameDt);
            if (this._battleEnded) return;
            this.ensureGrid();
            const moveSpeedMultiplier = getMonsterMoveSpeedMultiplier(this._elapsedBattleTime);
            this.calculateVelocities(
                this._targetLocal.x,
                this._targetLocal.y,
                simulationDt,
                moveSpeedMultiplier,
            );
            this.limitCrowdMovement(simulationDt, moveSpeedMultiplier);
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
        this._potionEffects?.advance(frameDt, this._abilityFrameContext);
        this._projectileSystem?.update(simulationDt);
        this.flushMonsterDeathSound();
        this._research?.advance(frameDt);
        this.updateMasteredSkills();

        if (this._victoryPending) {
            this.syncRenderData();
            this.finishBattle(true);
            return;
        }

        this._lootCollectedThisFrame = false;
        this._lootDrops?.advance(frameDt, this.target.worldPosition, this._collectLoot, this._canCollectLoot);
        if (this._lootEquipmentChanged) {
            this._lootEquipmentChanged = false;
            this.syncProgression();
        } else if (this._lootCollectedThisFrame) this.refreshProgressionUI();

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
        game.off(Game.EVENT_HIDE, this._saveResearch, this);
        this._research?.flush();
        this._battleEnded = true;
        this._potionEffects?.destroy();
        // During scene reload, the player's component may outlive its already-destroyed node.
        this._characterStats?.node?.off(CharacterStats.Event.Died, this.onPlayerDied, this);
        this._characterStats?.node?.off(CharacterStats.Event.Damaged, this.onPlayerDamaged, this);
        this._uiManager?.closePopup('UI/CheatPanel');
        this._prefabVisuals?.clear();
        this._bossAttacks.clear();
        this._bossNextAttackTimes.clear();
        this._cottonSkills.clear();
        this._summonedMonsters.clear();
        this._targetMover?.resetHitFeedback();
        this._projectileSystem?.clear();
        this._abilityController?.clear();
        if (this._lootDrops?.isValid) this._lootDrops.clear();
    }

    private hasSkillAsset (skill: GameSkill): boolean {
        switch (skill) {
        case GameSkill.BasicAttack: return Boolean(this.bulletPrefab);
        case GameSkill.PiercingArrow: return Boolean(this.arrowPrefab);
        case GameSkill.QiBlade: return Boolean(this.qiBladePrefab);
        case GameSkill.Tornado: return Boolean(this.tornadoPrefab);
        case GameSkill.Thunder: return Boolean(this.thunderPrefab);
        case GameSkill.ChainLightning: return Boolean(this.chainLightningPrefab);
        case GameSkill.FrostPulse: return Boolean(this.frostPulsePrefab);
        case GameSkill.SwordQi: return Boolean(this.swordQiPrefab);
        default: return false;
        }
    }

    private getSkillDamage (skill: GameSkill): number {
        const multiplier = skill === GameSkill.BasicAttack ? this.bulletDamage
            : skill === GameSkill.PiercingArrow ? this.arrowDamage
                : skill === GameSkill.QiBlade ? this.qiBladeDamage
                    : skill === GameSkill.Tornado ? this.tornadoDamage : 1;
        return Math.max(0, multiplier) * calculateSkillDamage(SKILL_DAMAGE_PROFILES[skill],
            this._baseAttackPower * (1 + this._growthDamageBonus), this._progression.getSkillDamageRank(skill));
    }

    private addSkill (skill: GameSkill): boolean {
        if (this._learnedSkills.has(skill)
            || !this._abilityController
            || !this._projectileSystem
            || !this.renderLayer) return false;

        const getDamage = (): number => this.getSkillDamage(skill);
        switch (skill) {
        case GameSkill.SwordQi: {
            if (!this.swordQiPrefab || !this.skillEffectLayer) return false;
            const options: SwordQiAbilityOptions = { prefab: this.swordQiPrefab,
                visualParent: this.skillEffectLayer, level: 1, evolved: false, getDamage };
            this._swordQiOptions = options;
            this._abilityController.addAbility(new SwordQiAbility(this, options));
            break;
        }
        case GameSkill.Thunder:
        case GameSkill.ChainLightning:
        case GameSkill.FrostPulse: {
            const prefab = skill === GameSkill.Thunder ? this.thunderPrefab
                : skill === GameSkill.ChainLightning ? this.chainLightningPrefab : this.frostPulsePrefab;
            if (!prefab || !this.skillEffectLayer || !this.groundEffectLayer) return false;
            const options: ElementalAbilityOptions = { kind: ABILITY_IDS[skill] as ElementalKind,
                prefab, visualParent: this.skillEffectLayer, groundParent: this.groundEffectLayer,
                level: 1, evolved: false, getDamage,
                playSound: (kind, echo) => this.elementalAudio?.play(kind, echo) };
            this._elementalOptions.set(skill, options);
            this._abilityController.addAbility(new ElementalAbility(this, options));
            break;
        }
        case GameSkill.BasicAttack: {
            if (!this.bulletPrefab) return false;
            const options: BasicAttackAbilityOptions = {
                prefab: this.bulletPrefab,
                visualParent: this.renderLayer,
                interval: this.fireInterval,
                projectilesPerShot: Math.min(MAX_BASIC_ATTACK_PROJECTILES, Math.max(1, this.bulletsPerShot | 0)),
                spreadAngle: 6,
                attackRange: this.bulletAttackRange,
                projectileSpeed: this.bulletSpeed,
                projectileLifetime: this.bulletLifetime,
                hitRadius: this.bulletHitRadius,
                damage: this.bulletDamage,
                getDamage,
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
                getDamage,
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
                orbitRadius: this.qiBladeOrbitRadius,
                hitRadius: this.qiBladeHitRadius,
                damageInterval: this.qiBladeDamageInterval,
                rotationSpeed: this.qiBladeRotationSpeed,
                selfRotationSpeed: this.qiBladeSelfRotationSpeed,
                bladeCount: 1,
                damage: this.qiBladeDamage,
                getDamage,
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
                getDamage,
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
        this._cottonSkills.delete(removedId);
        this._summonedMonsters.delete(removedId);
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
            this._frozenUntil[index] = this._frozenUntil[lastIndex];
            this._slowedUntil[index] = this._slowedUntil[lastIndex];
            this._frostSpeedRatios[index] = this._frostSpeedRatios[lastIndex];
            this._targetSnapshotsX[index] = this._targetSnapshotsX[lastIndex];
            this._targetSnapshotsY[index] = this._targetSnapshotsY[lastIndex];
            this._targetOffsetsX[index] = this._targetOffsetsX[lastIndex];
            this._targetOffsetsY[index] = this._targetOffsetsY[lastIndex];
            this._targetRefreshTimers[index] = this._targetRefreshTimers[lastIndex];
            this._targetRefreshIntervals[index] = this._targetRefreshIntervals[lastIndex];
            this._monsterTypeIndices[index] = this._monsterTypeIndices[lastIndex];
            this._health[index] = this._health[lastIndex];
            this._maximumHealth[index] = this._maximumHealth[lastIndex];
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

    private registerKill (monster: MonsterDefinition, x: number, y: number): void {
        this._totalKillCount++;
        if (this._cores.has('kill_reserve') && !this._reserveReady) {
            this._reserveKills++;
            if (this._reserveKills >= 8) {
                this._reserveReady = true;
                this._reserveKills = 0;
            }
        }
        let evolution = false;
        if (monster.rank === MonsterRank.Elite) {
            if (!this._eliteRewarded) {
                this._eliteRewarded = true;
                evolution = true;
            }
        } else if (monster.rank === MonsterRank.Normal) {
            this._pendingMonsterDeathSound = true;
        }
        const experience = monster.rank === MonsterRank.Elite ? this.eliteDropExperience
            : monster.rank === MonsterRank.Boss ? this.bossDropExperience : this.normalDropExperience;
        this.spawnLootAt(x, y, {
            experience: Math.max(0, Math.floor(experience)), evolution, tier: monster.rank,
        });
        const multiplier = monster.rank === MonsterRank.Boss ? this.bossRareDropMultiplier
            : monster.rank === MonsterRank.Elite ? this.eliteRareDropMultiplier : 1;
        if (this._rewardRandom() < this.rareDropProbability(this.chestDropChance, multiplier)) {
            this.spawnLootAt(x - 42, y + 18, { kind: 'chest', experience: 0, evolution: false, tier: monster.rank });
        }
        if (monster.rank === MonsterRank.Elite || this._rewardRandom() < this.rareDropProbability(this.equipmentDropChance, multiplier)) {
            this.spawnLootAt(x + 42, y + 18, { kind: 'equipment', experience: 0, evolution: false, tier: monster.rank });
        }
        const elite = monster.rank === MonsterRank.Elite;
        const boss = monster.rank === MonsterRank.Boss;
        if (this._rewardRandom() < (boss ? 0.5 : elite ? 0.2 : 0.012)) {
            const roll = this._rewardRandom();
            this.spawnLootAt(x - 28, y - 30, { kind: 'potion', potion: roll < 0.4 ? 'healing'
                : roll < 0.55 ? 'storm' : roll < 0.7 ? 'frost' : roll < 0.85 ? 'earth-rift' : 'rain',
                experience: 0, evolution: false, tier: monster.rank });
        }
        if (!boss && this._rewardRandom() < (elite ? 0.5 : 0.05)) {
            this.spawnLootAt(x + 28, y - 30, { kind: 'sand', stacks: boss ? 15 : elite ? 5 : 1,
                experience: 0, evolution: false, tier: monster.rank });
        }
        // Kill effects happen immediately; growth rewards only enter the queue on pickup.
        this.updateCountLabel();
    }

    private rareDropProbability (percent: number, multiplier: number): number {
        const value = percent * multiplier / 100;
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    }

    private researchProgress (skill: GameSkill): string {
        const mastery = SkillMastery.instance;
        return mastery.owns(skill) ? '已掌握'
            : `研习 ${mastery.points(skill) + (this._research?.pending(skill) ?? 0)}/${mastery.goal(skill)}`;
    }

    private researchSummary (): string {
        const session = this._research;
        if (!session) return '';
        const lines = RESEARCH_SKILLS.filter(skill => session.earned(skill) > 0)
            .map(skill => `${SKILL_NAMES[skill]} +${session.earned(skill)} · ${this.researchProgress(skill)}`);
        if (lines.length === 0) return '';
        return `\n${lines.join('\n')}`;
    }

    private updateMasteredSkills (): void {
        const unlocked = this._research?.unlocked;
        if (!unlocked || unlocked.length === this._noticedMasteries) return;
        this._progression.setMasteredSkills(this._researchSkills.filter(skill => SkillMastery.instance.owns(skill)));
        this._lootNotice = `永久掌握：${unlocked.slice(this._noticedMasteries).map(skill => SKILL_NAMES[skill]).join('、')} · 下局可选本命`;
        this._lootNoticeTime = 6;
        this._noticedMasteries = unlocked.length;
    }

    private collectManual (reward: LootReward): number {
        const skill = reward.skill;
        if (skill === undefined || !this._research || !RESEARCH_SKILLS.includes(skill)
            || !this._researchSkills.includes(skill)) return 0;
        const learned = this._progression.getSkillLevel(skill) > 0;
        const canLearn = this._progression.canLearnTrial(skill);
        if (!this._research.collectManual(skill, learned || canLearn)) {
            this._manualRetryTime = this._elapsedBattleTime + 5;
            this._lootNotice = SkillMastery.instance.error;
            this._lootNoticeTime = 5;
            return 0;
        }
        if (canLearn) this._progression.learnTrial(skill);
        this._lootEquipmentChanged = true;
        this._lootCollectedThisFrame = true;
        this._lootNotice = `${canLearn ? '本局领悟' : '拾取秘籍'}：${SKILL_NAMES[skill]} · ${this.researchProgress(skill)}`
            + (!learned && !canLearn ? '（技能槽已满，仅增加研习）' : ' · 命中敌人继续研习');
        this._lootNoticeTime = 6;
        this.updateMasteredSkills();
        return 1;
    }

    private updateManualSupply (): void {
        const time = MANUAL_SUPPLY_TIMES[this._nextManualSupply];
        if (time === undefined || this._elapsedBattleTime < time) return;
        this._nextManualSupply++;
        const skill = SkillMastery.instance.chooseManual(this._researchSkills);
        if (skill === null) return;
        this.spawnLootAt(this._targetLocal.x + 90, this._targetLocal.y + 50,
            { kind: 'manual', skill, experience: 0, evolution: false, tier: 'normal' });
        this._lootNotice = `秘籍现世：${SKILL_NAMES[skill]} · 拾取青色宝匣，本局体验并积累研习`;
        this._lootNoticeTime = 6;
    }

    private updateSupplyDrops (): void {
        const supply = this._supplies[this._nextSupply];
        if (!supply || this._elapsedBattleTime < supply.time) return;
        this._nextSupply++;
        this.spawnLootAt(this._targetLocal.x + 130, this._targetLocal.y,
            { kind: supply.kind, potion: supply.potion, experience: 0, evolution: false, tier: 'normal' });
        this._lootNotice = '补给抵达 · ' + (supply.potion ? POTIONS[supply.potion].name
            : supply.kind === 'equipment' ? '拾取装备获得一次强化' : '拾取宝箱获得恢复或经验');
        this._lootNoticeTime = 5;
    }

    private spawnLootAt (x: number, y: number, reward: LootReward): void {
        // Edge kills must leave reachable loot inside the playable area.
        const halfWidth = Math.max(0, this._renderTransform!.width * 0.5 - 24);
        const halfHeight = Math.max(0, this._renderTransform!.height * 0.5 - 24);
        this._lootPosition.set(Math.max(-halfWidth, Math.min(halfWidth, x)),
            Math.max(-halfHeight, Math.min(halfHeight, y)), 0);
        this._renderTransform!.convertToWorldSpaceAR(this._lootPosition, this._lootWorldPosition);
        this._lootDrops?.spawn(this._lootWorldPosition, reward);
    }

    private collectRareLoot (reward: LootReward): void {
        const stats = this._characterStats;
        let experience = 0;
        let healing = 0;
        let strengthened = 0;
        let shield = 0;
        let lastStrengthening = '';
        const stacks = Math.max(1, Math.floor(reward.stacks ?? 1));
        for (let i = 0; i < stacks; i++) {
            if (reward.kind === 'equipment') {
                const effect = this._progression.grantEquipmentReward(this.getGrowthHealth(),
                    value => this.applyGrowthEffect(value));
                if (effect) {
                    strengthened++;
                    lastStrengthening = effect.type === 'damage' ? `攻击力 +${ATTACK_BONUS_PER_RANK * 100}%`
                        : effect.type === 'skill-damage' ? `${SKILL_NAMES[effect.skill!]} 伤害${effect.damageRank}阶`
                        : effect.type === 'maximum-health' ? `最大生命 +${formatCombatNumber(Math.ceil(effect.amount ?? 0))}`
                            : `${SKILL_NAMES[effect.skill!]} Lv.${effect.level}`;
                    this._lootEquipmentChanged = true;
                } else {
                    shield += (stats?.maximumHealth ?? BASE_PLAYER_HEALTH) * 0.15;
                }
            } else {
                const health = this.getGrowthHealth();
                if (stats && health.current < health.maximum && Math.random() < 0.5) {
                    healing += stats.heal(stats.maximumHealth * 0.25);
                } else if (this._progression.canEarnExperience) {
                    experience += 20;
                    this._progression.addExperience(20);
                } else {
                    shield += (stats?.maximumHealth ?? BASE_PLAYER_HEALTH) * 0.15;
                }
            }
        }
        const requestedShield = shield;
        if (shield > 0) shield = stats?.addShield('rare_loot', shield, 0.15) ?? 0;
        const details: string[] = [];
        if (experience > 0) details.push(`经验 +${experience}`);
        if (healing > 0) details.push(`恢复 ${formatCombatNumber(Math.ceil(healing))} 生命`);
        if (strengthened > 0) details.push(strengthened === 1 ? lastStrengthening : `获得 ${strengthened} 次强化`);
        if (shield > 0) details.push(`护盾 +${formatCombatNumber(Math.ceil(shield))}`);
        else if (requestedShield > 0) details.push('护盾已满');
        this._lootNotice = `${reward.kind === 'chest' ? '宝箱' : '装备'}：${details.join('，')}`;
        this._lootNoticeTime = 4;
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
            this.spawnOne(command, undefined, i);
        }
    }

    private spawnOne (command: MonsterSpawnBatchCommand, exactPosition?: Vec2, ordinal = 0): void {
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
        const slot = command.firstMonsterIndex + ordinal;
        const groupSize = Math.max(1, command.batchSize);
        const lane = (slot + 0.5) / groupSize - 0.5;
        const jitter = (this._spawnRandom() - 0.5) * entrance.span / groupSize * 0.25;
        const normalizedCoordinate = Math.max(-0.96, Math.min(0.96,
            entrance.coordinate + lane * entrance.span + jitter));
        const depthStep = Math.max(monster.size * 0.65, this.separationDistance * 0.75);
        const depth = (isStaggered ? slot % 2 : 0) * depthStep + this._spawnRandom() * depthStep * 0.35;
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

        if (exactPosition) {
            // Summon positions were clamped and telegraphed before the cast resolved.
            x = exactPosition.x;
            y = exactPosition.y;
        }

        this._positionsX[this._count] = x;
        this._positionsY[this._count] = y;
        this._velocitiesX[this._count] = 0;
        this._velocitiesY[this._count] = 0;
        this._bypassSides[this._count] = 0;
        this._bypassBlockerIds[this._count] = 0;
        this._moveSpeedMultipliers[this._count] = entrance.moveSpeedMultiplier;
        this._frozenUntil[this._count] = 0;
        this._slowedUntil[this._count] = 0;
        this._frostSpeedRatios[this._count] = 1;
        this._monsterTypeIndices[this._count] = command.monsterTypeIndex;
        this._health[this._count] = command.maximumHealth ?? monster.maximumHealth;
        this._maximumHealth[this._count] = this._health[this._count];
        this._hitFlashEndTimes[this._count] = 0;
        const monsterId = this._nextMonsterId++;
        if (monster.prefabKey
            && !this._prefabVisuals?.spawn(
                monsterId, monster.prefabKey, x, y, monster.deathAnimationDuration,
                this._health[this._count],
                monster.rank !== MonsterRank.Elite,
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
        if (command.objective) this._finalBossId = monsterId;
        this._gridValid = false;
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

    private calculateVelocities (
        targetX: number, targetY: number, dt: number, moveSpeedMultiplier: number,
    ): void {
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
            const cottonSkill = monster.rank === MonsterRank.Elite
                ? this._cottonSkills.get(this._monsterIds[i]) : undefined;
            if (cottonSkill && cottonSkill.phase !== 'pursue') {
                this._velocitiesX[i] = 0;
                this._velocitiesY[i] = 0;
                this._bypassBlockerIds[i] = 0;
                this._bypassSides[i] = 0;
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
            const speed = monster.moveSpeed * moveSpeedMultiplier
                * this._moveSpeedMultipliers[i] * this.frostSpeedRatio(i);
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

    private limitCrowdMovement (dt: number, moveSpeedMultiplier: number): void {
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
                    const speed = this.getMonsterDefinition(i).moveSpeed * moveSpeedMultiplier
                        * this._moveSpeedMultipliers[i] * this.frostSpeedRatio(i);
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

    private updateBossAttacks (dt: number): void {
        for (let index = 0; index < this._count; index++) {
            const monster = this.getMonsterDefinition(index);
            if (monster.prefabKey === 'cotton-king-simple') {
                this.updateCottonSkills(index, dt);
                if (this._battleEnded) return;
                continue;
            }
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
                () => { state.completed = true; }, Math.max(1, this.bossImpactRadius));
            if (!started) {
                this._bossAttacks.delete(enemyId);
                this._bossNextAttackTimes.set(enemyId, this._elapsedBattleTime + 1);
                continue;
            }
            this._velocitiesX[index] = 0;
            this._velocitiesY[index] = 0;
        }
    }

    private updateCottonSkills (index: number, dt: number): void {
        const id = this._monsterIds[index];
        let state = this._cottonSkills.get(id);
        if (!state) {
            if (!this.isMonsterInsideCombatBounds(index)) return;
            state = {
                phase: 'enter', remaining: 1.5, nextSummon: true, summonedTotal: 0,
                summonCount: 0, summonResolved: false,
                points: Array.from({ length: COTTON_SUMMON_BATCH }, () => new Vec2()),
                startX: 0, startY: 0, endX: 0, endY: 0, hitRadius: 0, damageApplied: false,
            };
            this._cottonSkills.set(id, state);
            this._prefabVisuals?.playSkill(id, 'enter');
            this._prefabVisuals?.playSkillEffect(id, 'RecoverDust');
            return;
        }
        state.remaining = Math.max(0, state.remaining - dt);
        if (state.phase === 'charge') {
            this._prefabVisuals?.updateRollWarning(id, 1 - state.remaining / 1.5);
        }
        if (state.phase === 'roll') {
            const previousX = this._positionsX[index];
            const previousY = this._positionsY[index];
            const progress = 1 - state.remaining / COTTON_ROLL_DURATION;
            const x = state.startX + (state.endX - state.startX) * progress;
            const y = state.startY + (state.endY - state.startY) * progress;
            this._positionsX[index] = x;
            this._positionsY[index] = y;
            this._gridValid = false;
            const sx = x - previousX;
            const sy = y - previousY;
            const lengthSquared = sx * sx + sy * sy;
            const t = lengthSquared > 0.000001 ? Math.max(0, Math.min(1,
                ((this._targetLocal.x - previousX) * sx + (this._targetLocal.y - previousY) * sy)
                    / lengthSquared)) : 0;
            const dx = this._targetLocal.x - previousX - sx * t;
            const dy = this._targetLocal.y - previousY - sy * t;
            if (!state.damageApplied && dx * dx + dy * dy <= state.hitRadius * state.hitRadius) {
                state.damageApplied = this.applyPlayerHit(index, true);
            }
        } else if (state.phase === 'summon' && !state.summonResolved && state.remaining <= 0.3) {
            state.summonResolved = true;
            for (let i = 0; i < state.summonCount; i++) {
                const point = state.points[i];
                const dx = point.x - this._targetLocal.x;
                const dy = point.y - this._targetLocal.y;
                const previousCount = this._count;
                // Recheck at resolution: a player who moved into a marker is never body-spawned on.
                if (this._summonedMonsters.size < COTTON_SUMMON_LIMIT && dx * dx + dy * dy >= 120 * 120) {
                    this.spawnOne(this._summonCommand, point);
                }
                const spawned = this._count > previousCount;
                if (spawned) {
                    this._summonedMonsters.add(this._monsterIds[this._count - 1]);
                    state.summonedTotal++;
                }
                this._prefabVisuals?.emitSummonPoint(id, i, spawned);
            }
        }
        if (state.remaining > 0 || this._battleEnded) return;
        switch (state.phase) {
        case 'enter':
        case 'recover':
            state.phase = 'pursue';
            state.remaining = state.nextSummon && state.summonedTotal === 0 ? 0.4 : 2;
            this._prefabVisuals?.finishSkill(id);
            this._targetRefreshTimers[index] = 0;
            break;
        case 'pursue': {
            const dx = this._targetLocal.x - this._positionsX[index];
            const dy = this._targetLocal.y - this._positionsY[index];
            if (!this.isMonsterInsideCombatBounds(index) || dx * dx + dy * dy > 850 * 850) break;
            if (state.nextSummon && this.prepareCottonSummon(index, state)) {
                state.phase = 'summon';
                state.remaining = 1;
                state.nextSummon = false;
                this._prefabVisuals?.playSkill(id, 'summon', dx);
                this._prefabVisuals?.playSkillEffect(id, 'SummonAura');
                this._prefabVisuals?.showSummonPoints(id, state.points, state.summonCount,
                    this._positionsX[index], this._positionsY[index]);
            } else {
                this.prepareCottonRoll(index, state, dx, dy);
            }
            break;
        }
        case 'summon':
            this._prefabVisuals?.stopSkillEffect(id, 'SummonAura');
            state.phase = 'recover';
            state.remaining = 1;
            this._prefabVisuals?.playSkill(id, 'recover');
            break;
        case 'charge':
            state.phase = 'roll';
            state.remaining = COTTON_ROLL_DURATION;
            this._prefabVisuals?.hideRollWarning(id);
            this._prefabVisuals?.stopSkillEffect(id, 'Charge');
            this._prefabVisuals?.playSkill(id, 'roll');
            this._prefabVisuals?.playSkillEffect(id, 'RollDust');
            break;
        case 'roll':
            state.phase = 'recover';
            state.remaining = 3;
            state.nextSummon = true;
            this._prefabVisuals?.stopSkillEffect(id, 'RollDust');
            this._prefabVisuals?.playSkillEffect(id, 'RecoverDust');
            this._prefabVisuals?.playSkill(id, 'recover');
            break;
        }
    }

    private prepareCottonSummon (index: number, state: CottonSkillState): boolean {
        const available = Math.min(COTTON_SUMMON_BATCH, this._capacity - this._count,
            COTTON_SUMMON_LIMIT - this._summonedMonsters.size,
            COTTON_SUMMON_LIMIT - state.summonedTotal);
        state.summonCount = 0;
        state.summonResolved = false;
        if (available <= 0) return false;
        const x = this._positionsX[index];
        const y = this._positionsY[index];
        const away = Math.atan2(y - this._targetLocal.y, x - this._targetLocal.x);
        for (let attempt = 0; attempt < 12 && state.summonCount < available; attempt++) {
            const angle = away + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * Math.PI / 6;
            const point = state.points[state.summonCount];
            point.set(x + Math.cos(angle) * 210, y + Math.sin(angle) * 210);
            this.clampAbilityPosition(point, 60);
            if ((point.x - this._targetLocal.x) ** 2 + (point.y - this._targetLocal.y) ** 2 < 180 ** 2) continue;
            let overlapping = false;
            for (let i = 0; i < state.summonCount; i++) {
                if ((point.x - state.points[i].x) ** 2 + (point.y - state.points[i].y) ** 2 < 80 ** 2) {
                    overlapping = true;
                    break;
                }
            }
            if (!overlapping) state.summonCount++;
        }
        return state.summonCount > 0;
    }

    private prepareCottonRoll (index: number, state: CottonSkillState, dx: number, dy: number): void {
        const id = this._monsterIds[index];
        const distance = Math.sqrt(dx * dx + dy * dy);
        const length = Math.min(520, Math.max(260, distance + 120));
        state.startX = this._positionsX[index];
        state.startY = this._positionsY[index];
        this._skillPosition.set(state.startX + (distance > 0.001 ? dx / distance : 1) * length,
            state.startY + (distance > 0.001 ? dy / distance : 0) * length);
        this.clampAbilityPosition(this._skillPosition, this.getMonsterDefinition(index).bodyRadius);
        state.endX = this._skillPosition.x;
        state.endY = this._skillPosition.y;
        state.hitRadius = Math.max(1, this.playerContactRadius)
            + Math.max(0, this.getMonsterDefinition(index).bodyRadius - NORMAL_BODY_RADIUS);
        state.damageApplied = false;
        state.phase = 'charge';
        state.remaining = 1.5;
        this._prefabVisuals?.playSkill(id, 'charge', state.endX - state.startX);
        this._prefabVisuals?.playSkillEffect(id, 'Charge');
        this._prefabVisuals?.showRollWarning(id,
            state.endX - state.startX, state.endY - state.startY, state.hitRadius);
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
            // The roll uses swept, once-per-action damage. Windup, summon and recovery are safe windows.
            if (this._frozenUntil[index] > this._elapsedBattleTime) continue;
            const cottonSkill = monster.rank === MonsterRank.Elite
                ? this._cottonSkills.get(this._monsterIds[index]) : undefined;
            if (cottonSkill && cottonSkill.phase !== 'pursue') continue;
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

    private applyPlayerHit (sourceIndex: number, heavy: boolean): boolean {
        if (!this.target || !this._characterStats?.isAlive
            || this._elapsedBattleTime < this._nextPlayerDamageTime) return false;

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
        if (appliedDamage <= 0) return false;
        const attack = this._bossAttacks.get(this._monsterIds[sourceIndex]);
        if (attack) attack.damageApplied = true;
        this._nextPlayerDamageTime = this._elapsedBattleTime
            + Math.max(0.05, this.playerDamageInterval);

        this._damageNumberRenderer?.showPlayerDamage(
            this._targetLocal.x,
            this._targetLocal.y + 72,
            appliedDamage,
        );
        return true;
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
                this._frozenUntil[index] > this._elapsedBattleTime ? 2
                    : this._slowedUntil[index] > this._elapsedBattleTime ? 1 : 0,
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
