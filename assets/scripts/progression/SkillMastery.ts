import { sys } from 'cc';
import { GameSkill } from '../GameSettings';

export const STARTER_SKILLS: readonly GameSkill[] = [GameSkill.BasicAttack, GameSkill.QiBlade];
export const RESEARCH_SKILLS: readonly GameSkill[] = [
    GameSkill.SwordQi, GameSkill.Thunder, GameSkill.PiercingArrow, GameSkill.ChainLightning,
];
export const MANUAL_RESEARCH_POINTS = 20;
export const FIRST_RESEARCH_GOAL = 60;
export const RESEARCH_GOAL = 180;
export const RESEARCH_HIT_INTERVAL = 2;
export const MANUAL_SUPPLY_TIMES: readonly number[] = [60, 180];
const STORAGE_KEY = 'guarding-town:skill-mastery:v1';
const SKILL_COUNT = 8;

interface MasteryProfile {
    version: 1;
    points: number[];
    firstSkill: GameSkill | null;
    focus: GameSkill;
}

/** Independent save: introducing research never rewrites currency, charms or loadout. */
export class SkillMastery {
    private static _instance: SkillMastery | null = null;
    public static get instance (): SkillMastery { return this._instance ??= new SkillMastery(); }
    private _profile: MasteryProfile = {
        version: 1, points: new Array(SKILL_COUNT).fill(0), firstSkill: null, focus: GameSkill.SwordQi,
    };
    private _readError = false;
    public error = '';

    private constructor () {
        try {
            const raw = sys.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data?.version !== 1 || !Array.isArray(data.points) || data.points.length !== SKILL_COUNT
                || !data.points.every((point: unknown) => Number.isSafeInteger(point) && Number(point) >= 0)
                || (data.firstSkill !== null && !RESEARCH_SKILLS.includes(data.firstSkill))
                || !RESEARCH_SKILLS.includes(data.focus)
                || (data.firstSkill === null && data.points.some((point: number) => point > 0))) {
                throw new Error('Invalid research save');
            }
            this._profile = { version: 1, firstSkill: data.firstSkill, focus: data.focus,
                points: data.points.map((point: number, skill: number) =>
                    Math.min(point, skill === data.firstSkill ? FIRST_RESEARCH_GOAL : RESEARCH_GOAL)) };
        } catch {
            this._readError = true;
            this.error = '研习存档暂时无法读取，原存档已保留；基础技能仍可出战。';
        }
    }

    public get focus (): GameSkill { return this._profile.focus; }
    public get canResearch (): boolean { return !this._readError; }
    public points (skill: GameSkill): number { return this._profile.points[skill] ?? 0; }
    public goal (skill: GameSkill): number {
        return this._profile.firstSkill === null || this._profile.firstSkill === skill
            ? FIRST_RESEARCH_GOAL : RESEARCH_GOAL;
    }
    public owns (skill: GameSkill): boolean {
        return STARTER_SKILLS.includes(skill)
            || RESEARCH_SKILLS.includes(skill) && this.points(skill) >= this.goal(skill);
    }
    public setFocus (skill: GameSkill): boolean {
        if (!RESEARCH_SKILLS.includes(skill) || this.owns(skill)) return false;
        return this.save({ ...this._profile, focus: skill });
    }
    public chooseManual (available: readonly GameSkill[]): GameSkill | null {
        if (!this.canResearch) return null;
        if (available.includes(this.focus) && !this.owns(this.focus)) return this.focus;
        return RESEARCH_SKILLS.find(skill => available.includes(skill) && !this.owns(skill)) ?? null;
    }

    /** Publish changes only after one atomic localStorage write succeeds. */
    public addProgress (amounts: readonly number[], discovered?: GameSkill): boolean {
        if (!this.canResearch || (discovered !== undefined && !RESEARCH_SKILLS.includes(discovered))) return false;
        const firstSkill = this._profile.firstSkill ?? discovered ?? null;
        if (firstSkill === null) return false;
        const points = this._profile.points.slice();
        for (const skill of RESEARCH_SKILLS) {
            const amount = amounts[skill] ?? 0;
            if (!Number.isSafeInteger(amount) || amount < 0) return false;
            points[skill] = Math.min(skill === firstSkill ? FIRST_RESEARCH_GOAL : RESEARCH_GOAL, points[skill] + amount);
        }
        return this.save({ ...this._profile, firstSkill, points });
    }

    private save (next: MasteryProfile): boolean {
        if (this._readError) return false;
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            this._profile = next;
            this.error = '';
            return true;
        } catch {
            this.error = '研习进度暂未保存，请稍后重试；本局进度仍在。';
            return false;
        }
    }
}

/** Combat only marks a bit per hit. Research/save work is bounded, never per enemy or projectile. */
export class SkillResearchSession {
    private _trialMask = 0;
    private _hitMask = 0;
    private _interval = 0;
    private _saveTime = 0;
    private readonly _pending = new Array<number>(SKILL_COUNT).fill(0);
    private readonly _earned = new Array<number>(SKILL_COUNT).fill(0);
    private readonly _unlocked: GameSkill[] = [];

    public constructor (private readonly _mastery: SkillMastery) {}
    public isTrial (skill: GameSkill): boolean { return (this._trialMask & (1 << skill)) !== 0; }
    public pending (skill: GameSkill): number { return this._pending[skill] ?? 0; }
    public earned (skill: GameSkill): number { return this._earned[skill] ?? 0; }
    public get unlocked (): readonly GameSkill[] { return this._unlocked; }
    public get hasPending (): boolean { return this._pending.some(value => value > 0); }

    public recordHit (skill: GameSkill): void {
        if (this.isTrial(skill) && !this._mastery.owns(skill)) this._hitMask |= 1 << skill;
    }

    /** Pickup persists before it is consumed. At full slots it still awards research, without a trial. */
    public collectManual (skill: GameSkill, trial: boolean): boolean {
        if (!RESEARCH_SKILLS.includes(skill)) return false;
        const amounts = this._pending.slice();
        amounts[skill] += MANUAL_RESEARCH_POINTS;
        const before = RESEARCH_SKILLS.map(value => this._mastery.points(value));
        if (!this._mastery.addProgress(amounts, skill)) return false;
        for (let index = 0; index < RESEARCH_SKILLS.length; index++) {
            const current = RESEARCH_SKILLS[index];
            const added = this._mastery.points(current) - before[index];
            // Usage was counted when earned; count only this book's accepted points here.
            if (current === skill) this._earned[current] += Math.max(0, added - this._pending[current]);
            if (added > 0 && this._mastery.owns(current) && !this._unlocked.includes(current)) this._unlocked.push(current);
        }
        this._pending.fill(0);
        if (trial) this._trialMask |= 1 << skill;
        return true;
    }

    public advance (dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        this._interval += dt;
        this._saveTime += dt;
        if (this._interval >= RESEARCH_HIT_INTERVAL) {
            this._interval %= RESEARCH_HIT_INTERVAL;
            for (const skill of RESEARCH_SKILLS) {
                if (!(this._hitMask & (1 << skill)) || this._mastery.owns(skill)
                    || this._mastery.points(skill) + this._pending[skill] >= this._mastery.goal(skill)) continue;
                this._pending[skill]++;
                this._earned[skill]++;
            }
            this._hitMask = 0;
        }
        if (this._saveTime >= 10) { this._saveTime = 0; this.flush(); }
    }

    public flush (): boolean {
        if (!this.hasPending) return true;
        const studying = RESEARCH_SKILLS.filter(skill => this._pending[skill] > 0 && !this._mastery.owns(skill));
        if (!this._mastery.addProgress(this._pending)) return false;
        this._pending.fill(0);
        for (const skill of studying) {
            if (this._mastery.owns(skill) && !this._unlocked.includes(skill)) this._unlocked.push(skill);
        }
        return true;
    }
}
