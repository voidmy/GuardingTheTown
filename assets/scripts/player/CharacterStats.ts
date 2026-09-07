import { _decorator, Component, MaterialInstance, Sprite } from 'cc';

const { ccclass, menu, property } = _decorator;

export interface CharacterHealthSnapshot {
    current: number;
    maximum: number;
    ratio: number;
}

@ccclass('CharacterStats')
@menu('Gameplay/Character Stats')
export class CharacterStats extends Component {
    public static readonly Event = {
        HealthChanged: 'character-health-changed',
        Died: 'character-died',
    } as const;

    @property({ min: 0 })
    public attackPower = 1;

    @property({ min: 1 })
    public maximumHealth = 100;

    @property({ min: 1 })
    public moveSpeed = 260;

    private _currentHealth = 0;
    private _healthMaterial: MaterialInstance | null = null;

    public get currentHealth (): number {
        return this._currentHealth;
    }

    public get isAlive (): boolean {
        return this._currentHealth > 0;
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

    public takeDamage (amount: number): number {
        const safeAmount = Math.max(0, amount);
        if (safeAmount <= 0 || !this.isAlive) return 0;

        const previousHealth = this._currentHealth;
        this._currentHealth = Math.max(0, previousHealth - safeAmount);
        const appliedDamage = previousHealth - this._currentHealth;
        this.emitHealthChanged();
        if (!this.isAlive) this.node.emit(CharacterStats.Event.Died, this);
        return appliedDamage;
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
        this.emitHealthChanged();
    }

    public revive (): void {
        this._currentHealth = Math.max(1, this.maximumHealth);
        this.emitHealthChanged();
    }

    public getHealthSnapshot (): CharacterHealthSnapshot {
        return {
            current: this._currentHealth,
            maximum: Math.max(1, this.maximumHealth),
            ratio: this.healthRatio,
        };
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
    }
}
