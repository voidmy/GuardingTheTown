import { _decorator, Component, Sprite } from 'cc';

const { ccclass, menu, property } = _decorator;

export interface CharacterHealthSnapshot {
    current: number;
    maximum: number;
    ratio: number;
    shield: number;
}

export interface PlayerHitContext {
    /** Push direction in the player's parent space, independent of sprite facing. */
    directionX: number;
    directionY: number;
    heavy: boolean;
    elite?: boolean;
}

interface ShieldEntry {
    source: string;
    amount: number;
    limitRatio: number;
}

@ccclass('CharacterStats')
@menu('Gameplay/Character Stats')
export class CharacterStats extends Component {
    public static readonly Event = {
        HealthChanged: 'character-health-changed',
        Died: 'character-died',
        Damaged: 'character-damaged',
    } as const;

    @property({ min: 0 })
    public attackPower = 1;

    @property({ min: 1 })
    public maximumHealth = 100;

    @property({ min: 1 })
    public moveSpeed = 260;

    @property({ displayName: '测试：零血量不死亡', tooltip: '开启后血量仍可降到0，但角色继续行动、战斗、受击反馈和恢复生命。' })
    public debugPreventDeath = true;

    @property({ min: 0, tooltip: '有效受击后的保护时间，暂停时停止计时。' })
    public damageInvulnerabilityDuration = 0.5;

    @property({ min: 0 })
    public hitFlashDuration = 0.18;

    private _currentHealth = 0;
    private _healthMaterial: ReturnType<Sprite['getMaterialInstance']> = null;
    private readonly _shields: ShieldEntry[] = [];
    private _combatPaused = false;
    private _invulnerabilityRemaining = 0;
    private _hitFlashRemaining = 0;

    public get shield (): number {
        return this._shields.reduce((total, entry) => total + entry.amount, 0);
    }

    public addShield (source: string, amount: number, limitRatio: number): number {
        if (!this.isAlive || !Number.isFinite(amount) || amount <= 0) return 0;
        const ratio = Math.max(0, Math.min(0.25, limitRatio));
        const owned = this._shields.reduce((total, entry) => total
            + (entry.source === source ? entry.amount : 0), 0);
        const added = Math.max(0, Math.min(amount,
            this.maximumHealth * ratio - owned,
            this.maximumHealth * 0.25 - this.shield));
        if (added > 0) {
            this._shields.push({ source, amount: added, limitRatio: ratio });
            this.emitHealthChanged();
        }
        return added;
    }

    public removeShieldSource (source: string): void {
        for (let index = this._shields.length - 1; index >= 0; index--) {
            if (this._shields[index].source === source) this._shields.splice(index, 1);
        }
        this.emitHealthChanged();
    }

    public get currentHealth (): number {
        return this._currentHealth;
    }

    public get isAlive (): boolean {
        return this.debugPreventDeath || this._currentHealth > 0;
    }

    public get healthRatio (): number {
        return this.maximumHealth > 0
            ? Math.max(0, Math.min(1, this._currentHealth / this.maximumHealth))
            : 0;
    }

    protected onLoad (): void {
        this.attackPower = Math.max(0, this.attackPower);
        this.maximumHealth = Math.max(1, this.maximumHealth);
        this.moveSpeed = Math.max(1, this.moveSpeed);
        this._currentHealth = this.maximumHealth;
        this._healthMaterial = this.getComponent(Sprite)?.getMaterialInstance(0) ?? null;
        this.updateHealthVisual();
    }

    protected update (dt: number): void {
        if (this._combatPaused) return;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        this._invulnerabilityRemaining = Math.max(0, this._invulnerabilityRemaining - step);
        if (this._hitFlashRemaining > 0) {
            this._hitFlashRemaining = Math.max(0, this._hitFlashRemaining - step);
            this.updateHealthVisual();
        }
    }

    protected onDisable (): void {
        this.resetHitFeedback();
    }

    public setCombatPaused (paused: boolean): void {
        this._combatPaused = paused;
    }

    public resetHitFeedback (): void {
        this._invulnerabilityRemaining = 0;
        this._hitFlashRemaining = 0;
        this.updateHealthVisual();
    }

    public takeDamage (amount: number, hit?: PlayerHitContext): number {
        const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
        if (safeAmount <= 0 || !this.isAlive || this._combatPaused
            || this._invulnerabilityRemaining > 0) return 0;

        let remaining = safeAmount;
        while (remaining > 0 && this._shields.length > 0) {
            const entry = this._shields[0];
            const absorbed = Math.min(remaining, entry.amount);
            entry.amount -= absorbed;
            remaining -= absorbed;
            if (entry.amount <= 0) this._shields.shift();
        }
        const previousHealth = this._currentHealth;
        this._currentHealth = Math.max(0, previousHealth - remaining);
        const appliedDamage = safeAmount - remaining + previousHealth - this._currentHealth;
        // At zero HP, development immortality still accepts hits for feedback,
        // protection timers and Boss swing deduplication without making HP negative.
        const feedbackDamage = appliedDamage > 0
            ? appliedDamage : this.debugPreventDeath ? safeAmount : 0;
        if (feedbackDamage <= 0) return 0;

        this._invulnerabilityRemaining = Math.max(0, this.damageInvulnerabilityDuration);
        this._hitFlashRemaining = Math.max(0, this.hitFlashDuration);
        this.emitHealthChanged();
        this.node.emit(CharacterStats.Event.Damaged, feedbackDamage, hit);
        if (!this.isAlive) {
            this.resetHitFeedback();
            this.node.emit(CharacterStats.Event.Died, this);
        }
        return feedbackDamage;
    }

    public heal (amount: number): number {
        const safeAmount = Math.max(0, amount);
        if (safeAmount <= 0 || !this.isAlive) return 0;

        const previousHealth = this._currentHealth;
        this._currentHealth = Math.min(
            Math.max(1, this.maximumHealth),
            previousHealth + safeAmount,
        );
        const restoredHealth = this._currentHealth - previousHealth;
        if (restoredHealth > 0) this.emitHealthChanged();
        return restoredHealth;
    }

    public setMaximumHealth (value: number, preserveRatio = false): void {
        const previousMaximum = Math.max(1, this.maximumHealth);
        const previousRatio = this._currentHealth / previousMaximum;
        this.maximumHealth = Math.max(1, value);
        this._currentHealth = preserveRatio
            ? this.maximumHealth * Math.max(0, Math.min(1, previousRatio))
            : Math.min(this._currentHealth, this.maximumHealth);
        this.clampShields();
        this.emitHealthChanged();
    }

    public revive (): void {
        this._shields.length = 0;
        this._currentHealth = Math.max(1, this.maximumHealth);
        this._combatPaused = false;
        this.resetHitFeedback();
        this.emitHealthChanged();
    }

    public getHealthSnapshot (): CharacterHealthSnapshot {
        return {
            current: this._currentHealth,
            maximum: Math.max(1, this.maximumHealth),
            ratio: this.healthRatio,
            shield: this.shield,
        };
    }

    private clampShields (): void {
        const sources = new Map<string, number>();
        let total = 0;
        for (const entry of this._shields) {
            const owned = sources.get(entry.source) ?? 0;
            entry.amount = Math.max(0, Math.min(entry.amount,
                this.maximumHealth * entry.limitRatio - owned,
                this.maximumHealth * 0.25 - total));
            sources.set(entry.source, owned + entry.amount);
            total += entry.amount;
        }
        for (let index = this._shields.length - 1; index >= 0; index--) {
            if (this._shields[index].amount <= 0) this._shields.splice(index, 1);
        }
    }

    private emitHealthChanged (): void {
        this.updateHealthVisual();
        this.node.emit(
            CharacterStats.Event.HealthChanged,
            this.getHealthSnapshot(),
        );
    }

    private updateHealthVisual (): void {
        if (!this._healthMaterial) {
            this._healthMaterial = this.getComponent(Sprite)?.getMaterialInstance(0) ?? null;
        }
        this._healthMaterial?.setProperty('healthRatio', this.healthRatio);
        const duration = Math.max(0.001, this.hitFlashDuration);
        const remaining = Math.min(duration, this._hitFlashRemaining);
        const elapsed = duration - remaining;
        const whiteDuration = Math.min(0.035, duration * 0.25);
        const flash = remaining > 0
            ? Math.min(1, remaining / Math.max(0.001, duration - whiteDuration)) * 0.88
            : 0;
        this._healthMaterial?.setProperty('hitFlash', flash);
        this._healthMaterial?.setProperty('hitFlashWhite', remaining > 0
            ? Math.max(0, 1 - elapsed / Math.max(0.001, whiteDuration))
            : 0);
    }
}
