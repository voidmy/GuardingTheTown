import { GameSkill } from '../GameSettings';
import { ATTACK_BONUS_PER_RANK, formatCombatNumber, getSkillIntrinsicDamage, MAX_SKILL_DAMAGE_RANK } from '../combat/CombatNumbers';
import {
    ALL_SKILLS, CORE_DEFINITIONS, CORE_IDS, EVOLUTIONS,
    SKILL_LEVEL_DESCRIPTIONS, SKILL_NAMES, SKILL_TAGS, SKILL_DAMAGE_PROFILES,
} from './UpgradeDefinitions';
import type { CoreId } from './UpgradeDefinitions';
import { describeUpgrade } from './UpgradePresentation';
import type { UpgradePresentation } from './UpgradePresentation';

export type { CoreId } from './UpgradeDefinitions';
export { CORE_DEFINITIONS, CORE_IDS, EVOLUTIONS, SKILL_NAMES } from './UpgradeDefinitions';

export type UpgradeOfferKind = 'ordinary' | 'core' | 'evolution';

export interface UpgradeOption extends UpgradePresentation {
    id: string;
    name: string;
    description: string;
}

export interface UpgradeHealthInfo {
    current: number;
    maximum: number;
    initialMaximum?: number;
}

export interface UpgradeOffer {
    kind: UpgradeOfferKind;
    options: UpgradeOption[];
    canRefresh: boolean;
    refreshesRemaining: number;
}

export interface UpgradeEffect {
    type: 'learn' | 'skill-level' | 'skill-damage' | 'damage' | 'maximum-health' | 'heal'
        | 'core' | 'evolution' | 'empty';
    skill?: GameSkill;
    level?: number;
    damageRank?: number;
    coreId?: CoreId;
    amount?: number;
}

export interface RunSkillSnapshot {
    skill: GameSkill;
    level: number;
    damageRank: number;
    evolved: boolean;
}

export interface RunProgressionSnapshot {
    skills: RunSkillSnapshot[];
    coreIds: CoreId[];
    playerLevel: number;
    experience: number;
    nextLevelExperience: number;
    ordinaryPending: number;
    corePending: number;
    refreshesRemaining: number;
    evolutionAvailable: boolean;
    evolutionGranted: boolean;
    evolutionUsed: boolean;
    initialSkill: GameSkill;
    damageBonus: number;
    moveSpeedBonus: number;
    healthRanks: number;
}

interface Candidate extends UpgradeOption {
    effect: UpgradeEffect;
    tags: readonly string[];
    direction?: string;
}

interface ActiveOffer {
    kind: UpgradeOfferKind;
    options: Candidate[];
    health: UpgradeHealthInfo;
    majorSkill: GameSkill | null;
    forceMajor: boolean;
    forceNew: boolean;
    shownIds: Set<string>;
    shownNew: boolean;
}

/** Early choices establish the build; later thresholds follow chapter experience budgets. */
export const RUN_EXPERIENCE_THRESHOLDS: readonly number[] = [6, 10, 16, 24, 34, 46, 58, 70, 82, 94, 106, 118, 130];
const MAX_ORDINARY_REWARDS = RUN_EXPERIENCE_THRESHOLDS.length;
export const MAX_SKILL_SLOTS = 3;
const MAX_SKILL_LEVEL = 5;
const MAX_CORE_SLOTS = 2;
const MOVE_SPEED_BONUS_PER_LEVEL = 0.01;
const MAX_MOVE_SPEED_BONUS = 0.15;

/** Run-only progression. The caller applies combat effects before a reward is consumed. */
export class RunProgression {
    private _initialSkill = GameSkill.QiBlade;
    private readonly _skills = new Map<GameSkill, number>();
    private readonly _skillDamageRanks = new Map<GameSkill, number>();
    private readonly _cores = new Set<CoreId>();
    private _availableSkills: GameSkill[] = [];
    private readonly _masteredSkills = new Set<GameSkill>();
    private _availableCoreIds = new Set<CoreId>(CORE_IDS);
    private _experience = 0;
    private _ordinaryEarned = 0;
    private _ordinaryClaimed = 0;
    private _corePending = 0;
    private _refreshesRemaining = 3;
    private _damageRanks = 0;
    private _healthRanks = 0;
    private _evolutionGranted = false;
    private _evolutionUsed = false;
    private _evolvedSkill: GameSkill | null = null;
    private _evolutionPrompted = false;
    private _majorSkill: GameSkill | null = null;
    private _majorMisses = 0;
    private _newSkillMisses = 0;
    private _lastStrengthened: GameSkill | null = null;
    private _offer: ActiveOffer | null = null;
    private _committing = false;

    constructor (private readonly _random: () => number = Math.random) {}

    public reset (initialSkill: GameSkill, availableSkills: readonly GameSkill[], masteredSkills = availableSkills): void {
        this._availableSkills = ALL_SKILLS.filter((skill) => availableSkills.includes(skill));
        this.setMasteredSkills(masteredSkills);
        this._initialSkill = this._availableSkills.includes(initialSkill)
            ? initialSkill : this._availableSkills[0] ?? initialSkill;
        this._skills.clear();
        this._skillDamageRanks.clear();
        if (this._availableSkills.includes(this._initialSkill)) {
            this._skills.set(this._initialSkill, 1);
        }
        this._cores.clear();
        this._experience = 0;
        this._ordinaryEarned = 0;
        this._ordinaryClaimed = 0;
        this._corePending = 0;
        this._refreshesRemaining = 3;
        this._damageRanks = 0;
        this._healthRanks = 0;
        this._evolutionGranted = false;
        this._evolutionUsed = false;
        this._evolvedSkill = null;
        this._evolutionPrompted = false;
        this._majorSkill = this.findMajorSkill();
        this._majorMisses = 0;
        this._newSkillMisses = 0;
        this._lastStrengthened = null;
        this._offer = null;
        this._committing = false;
    }

    public get ordinaryPending (): number {
        return this._ordinaryEarned - this._ordinaryClaimed;
    }

    public get corePending (): number { return this._corePending; }

    public get canEarnExperience (): boolean { return this._ordinaryEarned < MAX_ORDINARY_REWARDS; }

    public get damageBonus (): number { return this._damageRanks * ATTACK_BONUS_PER_RANK; }

    /** Flat bonus per completed player level; pending rewards and skill levels do not count. */
    public get moveSpeedBonus (): number {
        return Math.min(MAX_MOVE_SPEED_BONUS, this._ordinaryClaimed * MOVE_SPEED_BONUS_PER_LEVEL);
    }

    public get evolutionAvailable (): boolean {
        return this._evolutionGranted && !this._evolutionUsed
            && Array.from(this._skills.values()).some((level) => level === MAX_SKILL_LEVEL);
    }

    public get shouldPromptEvolution (): boolean {
        return this.evolutionAvailable && !this._evolutionPrompted;
    }

    public getSkillLevel (skill: GameSkill): number { return this._skills.get(skill) ?? 0; }

    public getSkillDamageRank (skill: GameSkill): number { return this._skillDamageRanks.get(skill) ?? 0; }

    public setMasteredSkills (skills: readonly GameSkill[]): void {
        this._masteredSkills.clear();
        for (const skill of skills) if (this._availableSkills.includes(skill)) this._masteredSkills.add(skill);
    }

    public canLearnTrial (skill: GameSkill): boolean {
        return !this._offer && !this._committing && this._availableSkills.includes(skill)
            && this.getSkillLevel(skill) === 0 && this._skills.size < MAX_SKILL_SLOTS;
    }

    /** An authored manual encounter grants Lv.1; subsequent levels still use ordinary choices. */
    public learnTrial (skill: GameSkill): boolean {
        if (!this.canLearnTrial(skill)) return false;
        this._skills.set(skill, 1);
        this.updateMajorSkill();
        return true;
    }

    public getCoreIds (): CoreId[] { return Array.from(this._cores); }

    public getSnapshot (): RunProgressionSnapshot {
        return {
            skills: Array.from(this._skills).map(([skill, level]) => ({
                skill, level, damageRank: this.getSkillDamageRank(skill), evolved: skill === this._evolvedSkill,
            })),
            coreIds: this.getCoreIds(),
            playerLevel: this._ordinaryClaimed + 1,
            experience: this._experience,
            nextLevelExperience: this._ordinaryEarned < MAX_ORDINARY_REWARDS
                ? RUN_EXPERIENCE_THRESHOLDS[this._ordinaryEarned] : 0,
            ordinaryPending: this.ordinaryPending,
            corePending: this._corePending,
            refreshesRemaining: this._refreshesRemaining,
            evolutionAvailable: this.evolutionAvailable,
            evolutionGranted: this._evolutionGranted,
            evolutionUsed: this._evolutionUsed,
            initialSkill: this._initialSkill,
            damageBonus: this.damageBonus,
            moveSpeedBonus: this.moveSpeedBonus,
            healthRanks: this._healthRanks,
        };
    }

    public addExperience (amount: number): number {
        if (!Number.isFinite(amount) || amount <= 0
            || this._ordinaryEarned >= MAX_ORDINARY_REWARDS) return 0;
        this._experience += amount;
        const before = this._ordinaryEarned;
        while (this._ordinaryEarned < MAX_ORDINARY_REWARDS) {
            const required = RUN_EXPERIENCE_THRESHOLDS[this._ordinaryEarned];
            if (this._experience < required) break;
            this._experience -= required;
            this._ordinaryEarned++;
        }
        if (this._ordinaryEarned === MAX_ORDINARY_REWARDS) this._experience = 0;
        return this._ordinaryEarned - before;
    }

    /** Rare equipment immediately strengthens an owned skill or a capped base stat. */
    public grantEquipmentReward (
        health: UpgradeHealthInfo, applyEffect: (effect: UpgradeEffect) => boolean,
    ): UpgradeEffect | null {
        if (this._committing || this._offer) return null;
        const candidates = this.buildCandidates('ordinary', health).filter(candidate =>
            candidate.effect.type === 'damage' || candidate.effect.type === 'maximum-health'
            || candidate.effect.type === 'skill-level' || candidate.effect.type === 'skill-damage');
        if (candidates.length === 0) return null;
        const candidate = candidates[Math.min(candidates.length - 1,
            Math.max(0, Math.floor(this._random() * candidates.length)))];
        const effect = { ...candidate.effect };
        this._committing = true;
        try {
            if (!applyEffect(effect)) return null;
            this.applyState(effect);
            return effect;
        } finally {
            this._committing = false;
        }
    }

    public grantCoreReward (): boolean {
        if (this._cores.size + this._corePending >= MAX_CORE_SLOTS) return false;
        this._corePending++;
        return true;
    }

    public grantEvolution (): boolean {
        if (this._evolutionUsed || this._evolutionGranted) return false;
        this._evolutionGranted = true;
        return true;
    }

    public setAvailableCoreIds (ids: readonly CoreId[]): void {
        this._availableCoreIds = new Set(CORE_IDS.filter((id) => ids.includes(id)));
    }

    public openOffer (kind: UpgradeOfferKind, health: UpgradeHealthInfo): UpgradeOffer | null {
        if (this._offer) return this._offer.kind === kind ? this.offerSnapshot() : null;
        if (kind === 'ordinary' && this.ordinaryPending <= 0
            || kind === 'core' && this._corePending <= 0
            || kind === 'evolution' && !this.evolutionAvailable) return null;
        this.updateMajorSkill();
        const offer: ActiveOffer = {
            kind, options: [], health: { ...health },
            majorSkill: kind === 'ordinary' && this._ordinaryClaimed < 3 ? this._initialSkill : this._majorSkill,
            forceMajor: kind === 'ordinary' && (this._ordinaryClaimed < 3 || this._majorMisses >= 1),
            forceNew: kind === 'ordinary' && (this._ordinaryClaimed < 3 || this._newSkillMisses >= 1),
            shownIds: new Set<string>(), shownNew: false,
        };
        this._offer = offer;
        const combinations = this.buildCombinations(offer);
        offer.options = this.chooseCombination(combinations, offer.kind === 'ordinary');
        this.recordShown(offer);
        return this.offerSnapshot();
    }

    public refreshOffer (health?: UpgradeHealthInfo): UpgradeOffer | null {
        const offer = this._offer;
        if (!offer || offer.kind === 'evolution' || this._refreshesRemaining <= 0) return null;
        if (health) offer.health = { ...health };
        const key = this.combinationKey(offer.options);
        const alternatives = this.buildCombinations(offer)
            .filter((combination) => this.combinationKey(combination) !== key);
        if (alternatives.length === 0) return null;
        offer.options = this.chooseCombination(alternatives, offer.kind === 'ordinary');
        this._refreshesRemaining--;
        this.recordShown(offer);
        return this.offerSnapshot();
    }

    public commitOption (
        id: string,
        health: UpgradeHealthInfo,
        applyEffect: (effect: UpgradeEffect) => boolean,
    ): UpgradeEffect | null {
        const offer = this._offer;
        if (!offer || this._committing || !offer.options.some((option) => option.id === id)) {
            return null;
        }
        const candidate = this.buildCandidates(offer.kind, health).find((option) => option.id === id);
        if (!candidate) return null;
        const effect = { ...candidate.effect };
        this._committing = true;
        try {
            if (!applyEffect({ ...effect })) return null;
            this.applyState(effect);
            if (offer.kind === 'ordinary') {
                this._ordinaryClaimed++;
                this.recordCompletedOrdinary(offer);
            } else if (offer.kind === 'core') {
                this._corePending = Math.max(0, this._corePending - 1);
            }
            this._offer = null;
            return effect;
        } finally {
            this._committing = false;
        }
    }

    public deferEvolution (): boolean {
        if (this._offer?.kind !== 'evolution') return false;
        this._evolutionPrompted = true;
        this._offer = null;
        return true;
    }

    public cancelPendingRewards (): void {
        this._offer = null;
        this._ordinaryEarned = this._ordinaryClaimed;
        this._corePending = 0;
        this._evolutionGranted = false;
        this._experience = 0;
    }

    public debugSetSkillLevel (skill: GameSkill, level: number, ignoreSlotLimit = true): boolean {
        // Debug may compare potion-era wind/frost with the former automatic skills.
        if (!ALL_SKILLS.includes(skill) || !Number.isInteger(level)
            || level < 0 || level > MAX_SKILL_LEVEL) return false;
        if (level === 0) {
            if (skill === this._initialSkill) return false;
            this._skills.delete(skill);
            this._skillDamageRanks.delete(skill);
        } else {
            if (!this._skills.has(skill) && !ignoreSlotLimit
                && this._skills.size >= MAX_SKILL_SLOTS) return false;
            this._skills.set(skill, level);
        }
        if (this._evolvedSkill === skill && level < MAX_SKILL_LEVEL) this._evolvedSkill = null;
        for (const core of CORE_DEFINITIONS) {
            if (core.requiredSkills.length > 0
                && !core.requiredSkills.some((required) => this._skills.has(required))) {
                this._cores.delete(core.id);
            }
        }
        this._offer = null;
        this.updateMajorSkill();
        return true;
    }

    public debugSetCore (id: CoreId, enabled: boolean): boolean {
        if (!CORE_IDS.includes(id)) return false;
        if (!enabled) {
            this._cores.delete(id);
            this._offer = null;
            return true;
        }
        if (this._cores.has(id)) return true;
        if (!this.buildCoreCandidates().some((candidate) => candidate.effect.coreId === id)) return false;
        this._cores.add(id);
        this._corePending = Math.min(this._corePending, MAX_CORE_SLOTS - this._cores.size);
        this._offer = null;
        return true;
    }

    public debugEvolveSkill (skill: GameSkill): boolean {
        if (!this._evolutionGranted || this._evolutionUsed
            || this.getSkillLevel(skill) !== MAX_SKILL_LEVEL) return false;
        this.applyState({ type: 'evolution', skill });
        this._offer = null;
        return true;
    }

    private applyState (effect: UpgradeEffect): void {
        switch (effect.type) {
        case 'learn':
            this._skills.set(effect.skill!, 1);
            break;
        case 'skill-level':
            this._skills.set(effect.skill!, effect.level!);
            this._lastStrengthened = effect.skill!;
            break;
        case 'skill-damage':
            this._skillDamageRanks.set(effect.skill!, effect.damageRank!);
            break;
        case 'damage': this._damageRanks++; break;
        case 'maximum-health': this._healthRanks++; break;
        case 'core': this._cores.add(effect.coreId!); break;
        case 'evolution':
            this._evolvedSkill = effect.skill!;
            this._evolutionUsed = true;
            this._evolutionGranted = false;
            this._evolutionPrompted = true;
            break;
        }
    }

    private buildCandidates (kind: UpgradeOfferKind, health: UpgradeHealthInfo): Candidate[] {
        if (kind === 'core') {
            const cores = this.buildCoreCandidates();
            return cores.length > 0 ? cores : [this.emptyCandidate('核心暂无可用强化，继续战斗')];
        }
        if (kind === 'evolution') {
            if (!this.evolutionAvailable) return [];
            return Array.from(this._skills).filter(([, level]) => level === MAX_SKILL_LEVEL)
                .map(([skill]) => ({
                    id: `evolve:${skill}`, name: EVOLUTIONS[skill].name,
                    description: EVOLUTIONS[skill].description,
                    effect: { type: 'evolution' as const, skill, level: MAX_SKILL_LEVEL },
                    tags: SKILL_TAGS[skill],
                }));
        }
        const candidates: Candidate[] = [];
        for (const skill of this._availableSkills) {
            const level = this.getSkillLevel(skill);
            const damageRank = this.getSkillDamageRank(skill);
            if (level > 0 && damageRank < MAX_SKILL_DAMAGE_RANK) {
                const profile = SKILL_DAMAGE_PROFILES[skill];
                candidates.push({
                    id: `skill-damage:${skill}`, name: `${SKILL_NAMES[skill]}·伤害 ${damageRank + 1}/${MAX_SKILL_DAMAGE_RANK}`,
                    description: `技能自身伤害：${formatCombatNumber(getSkillIntrinsicDamage(profile, damageRank))} → ${formatCombatNumber(getSkillIntrinsicDamage(profile, damageRank + 1))}。`
                        + `\n单次伤害 = 技能自身伤害 + 攻击力 × ${profile.attackRatio}。仅强化此技能，不改变技能等级。`,
                    effect: { type: 'skill-damage', skill, damageRank: damageRank + 1 }, tags: SKILL_TAGS[skill],
                });
            }
            if (level >= MAX_SKILL_LEVEL) continue;
            if (level === 0 && !this._masteredSkills.has(skill)) continue;
            if (level === 0 && this._skills.size >= MAX_SKILL_SLOTS) continue;
            const nextLevel = level + 1;
            candidates.push({
                id: level === 0 ? `learn:${skill}` : `skill:${skill}`,
                name: level === 0 ? `学习·${SKILL_NAMES[skill]}`
                    : `${SKILL_NAMES[skill]} Lv.${level} → ${nextLevel}`,
                description: SKILL_LEVEL_DESCRIPTIONS[skill][nextLevel]
                    + (level === 0 ? (this._skills.size === MAX_SKILL_SLOTS - 1
                        ? '\n占用最后一个技能槽，本局不可替换。' : '\n占用 1 个技能槽，本局不可替换。') : ''),
                effect: { type: level === 0 ? 'learn' : 'skill-level', skill, level: nextLevel },
                tags: SKILL_TAGS[skill],
            });
        }
        // A small mastered pool must still offer meaningful early choices.
        const allowStats = this._ordinaryClaimed >= 3 || candidates.filter(item => item.effect.type !== 'skill-damage').length < 3;
        if (allowStats && this._damageRanks < 3) candidates.push({
            id: 'stat:damage', name: `火力 ${this._damageRanks + 1}/3`,
            description: `角色攻击力加成 +${ATTACK_BONUS_PER_RANK * 100} 个百分点（${this._damageRanks * ATTACK_BONUS_PER_RANK * 100}% → ${Math.round((this._damageRanks + 1) * ATTACK_BONUS_PER_RANK * 100)}%）。提高所有技能的攻击力贡献，不改变技能自身伤害与等级。`,
            effect: { type: 'damage', amount: ATTACK_BONUS_PER_RANK }, tags: ['single', 'area', 'burst'],
        });
        const initialMaximum = health.initialMaximum
            ?? health.maximum / (1 + this._healthRanks * 0.15);
        if (allowStats && this._healthRanks < 3 && Number.isFinite(initialMaximum) && initialMaximum > 0) {
            const amount = initialMaximum * 0.15;
            candidates.push({
                id: 'stat:health', name: `强健 ${this._healthRanks + 1}/3`,
                description: `最大生命 +${this.formatNumber(amount)}（初始最大生命的 15%），同时恢复 ${this.formatNumber(amount)} 点生命。`,
                effect: { type: 'maximum-health', amount }, tags: ['survival'],
            });
        }
        if (Number.isFinite(health.current) && Number.isFinite(health.maximum)
            && health.current > 0 && health.current < health.maximum
            && (this._ordinaryClaimed >= 3 || health.current / health.maximum < 0.35)) candidates.push({
            id: 'stat:heal', name: '应急恢复',
            description: `恢复当前最大生命的 25%（最多 ${this.formatNumber(health.maximum * 0.25)} 点），不增加生命上限。`,
            effect: { type: 'heal', amount: health.maximum * 0.25 }, tags: ['survival'],
        });
        return candidates.length > 0 ? candidates : [this.emptyCandidate('强化已满，继续战斗')];
    }

    private buildCoreCandidates (): Candidate[] {
        if (this._cores.size >= MAX_CORE_SLOTS) return [];
        return CORE_DEFINITIONS.filter((core) => this._availableCoreIds.has(core.id)
            && !this._cores.has(core.id) && (!core.excludes || !this._cores.has(core.excludes))
            && (core.requiredSkills.length === 0
                || core.requiredSkills.some((skill) => this._skills.has(skill))))
            .map((core) => ({
                id: `core:${core.id}`, name: core.name, description: core.description,
                effect: { type: 'core' as const, coreId: core.id },
                tags: core.tags, direction: core.direction,
            }));
    }

    private emptyCandidate (name: string): Candidate {
        return { id: 'empty', name, description: '领取本次奖励并继续战斗。', effect: { type: 'empty' }, tags: [] };
    }

    private buildCombinations (offer: ActiveOffer): Candidate[][] {
        const pool = this.buildCandidates(offer.kind, offer.health);
        if (offer.kind === 'evolution') return [pool];
        const count = Math.min(3, pool.length);
        const combinations: Candidate[][] = [];
        const collect = (start: number, selected: Candidate[]): void => {
            if (selected.length === count) { combinations.push([...selected]); return; }
            for (let index = start; index <= pool.length - (count - selected.length); index++) {
                selected.push(pool[index]);
                collect(index + 1, selected);
                selected.pop();
            }
        };
        collect(0, []);
        let valid = combinations;
        if (offer.kind === 'ordinary') {
            const hasUpgrades = pool.some((item) => item.effect.type === 'skill-level');
            const majorId = `skill:${offer.majorSkill}`;
            const forceMajor = offer.forceMajor && pool.some((item) => item.id === majorId);
            const forceNew = offer.forceNew && pool.some((item) => item.effect.type === 'learn');
            valid = valid.filter((items) => (!hasUpgrades || items.some((item) => item.effect.type === 'skill-level'))
                && (!forceMajor || items.some((item) => item.id === majorId))
                && (!forceNew || items.some((item) => item.effect.type === 'learn')));
            // Reserve a damage choice, but retain access to emergency healing at low health.
            const criticalHealth = offer.health.maximum > 0 && offer.health.current / offer.health.maximum < 0.35;
            const withDamage = valid.filter(items => items.some(item => item.effect.type === 'skill-damage'
                || criticalHealth && item.effect.type === 'heal'));
            if (withDamage.length > 0) valid = withDamage;
            const withExploration = valid.filter((items) => items.some((item) => item.effect.type === 'learn'
                || item.effect.type === 'maximum-health' || item.effect.type === 'heal'));
            if (withDamage.length === 0 && withExploration.length > 0) valid = withExploration;
        } else if (this._cores.size === 0) {
            const diverse = valid.filter((items) => new Set(items.map((item) => item.direction)).size >= 2);
            if (diverse.length > 0) valid = diverse;
        }
        return valid;
    }

    private chooseCombination (combinations: Candidate[][], applyCoreWeights: boolean): Candidate[] {
        if (combinations.length === 0) return [];
        const tags = new Set(CORE_DEFINITIONS.filter((core) => this._cores.has(core.id))
            .reduce<string[]>((all, core) => all.concat([...core.tags]), []));
        const weights = combinations.map((items) => items.reduce((weight, item) =>
            weight * (applyCoreWeights && item.tags.some((tag) => tags.has(tag)) ? 1.5 : 1), 1));
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let pick = Math.max(0, Math.min(0.999999999, this._random())) * total;
        for (let index = 0; index < combinations.length; index++) {
            pick -= weights[index];
            if (pick < 0) return [...combinations[index]];
        }
        return [...combinations[combinations.length - 1]];
    }

    private offerSnapshot (): UpgradeOffer | null {
        const offer = this._offer;
        if (!offer) return null;
        const key = this.combinationKey(offer.options);
        return {
            kind: offer.kind,
            options: offer.options.map(({ id, name, description, effect }) => ({
                id, name, description, ...describeUpgrade(effect),
            })),
            canRefresh: offer.kind !== 'evolution' && this._refreshesRemaining > 0
                && this.buildCombinations(offer).some((items) => this.combinationKey(items) !== key),
            refreshesRemaining: this._refreshesRemaining,
        };
    }

    private combinationKey (items: readonly Candidate[]): string {
        return items.map((item) => item.id).sort().join('|');
    }

    private recordShown (offer: ActiveOffer): void {
        for (const candidate of offer.options) {
            offer.shownIds.add(candidate.id);
            if (candidate.effect.type === 'learn') offer.shownNew = true;
        }
    }

    private recordCompletedOrdinary (offer: ActiveOffer): void {
        const nextMajor = this.findMajorSkill();
        this._majorMisses = nextMajor !== offer.majorSkill || nextMajor === null
            || offer.shownIds.has(`skill:${nextMajor}`) ? 0 : this._majorMisses + 1;
        this._majorSkill = nextMajor;
        const canLearn = this._skills.size < MAX_SKILL_SLOTS
            && this._availableSkills.some((skill) => !this._skills.has(skill));
        this._newSkillMisses = !canLearn || offer.shownNew ? 0 : this._newSkillMisses + 1;
    }

    private updateMajorSkill (): void {
        const major = this.findMajorSkill();
        if (major !== this._majorSkill) this._majorMisses = 0;
        this._majorSkill = major;
    }

    private findMajorSkill (): GameSkill | null {
        const eligible = Array.from(this._skills).filter(([, level]) => level < MAX_SKILL_LEVEL);
        if (eligible.length === 0) return null;
        const highest = Math.max(...eligible.map(([, level]) => level));
        const tied = eligible.filter(([, level]) => level === highest).map(([skill]) => skill);
        if (this._lastStrengthened !== null && tied.includes(this._lastStrengthened)) return this._lastStrengthened;
        return tied.includes(this._initialSkill) ? this._initialSkill : tied[0];
    }

    private formatNumber (value: number): string {
        return formatCombatNumber(value);
    }
}
