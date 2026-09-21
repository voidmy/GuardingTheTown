import { instantiate, Node, Prefab, UIOpacity, UITransform, Vec2 } from 'cc';
import { Ability, AbilityFrameContext, createCombatActionId, EnemyCombatWorld, EnemyId } from './CombatTypes';

export type ElementalKind = 'thunder' | 'chain-lightning' | 'frost-pulse';
export interface ElementalAbilityOptions {
    kind: ElementalKind;
    prefab: Prefab;
    visualParent: Node;
    groundParent: Node;
    level: number;
    evolved: boolean;
    cooldownMultiplier?: number;
    getAttackPower: () => number;
    playSound?: (kind: ElementalKind, echo: boolean) => void;
}
interface SpellVisual {
    node: Node;
    opacity: UIOpacity | null;
    transform: UITransform | null;
    bolt: Node | null;
    mark: Node | null;
    markOpacity: UIOpacity | null;
    thickness: number;
    life: number;
    duration: number;
    diameter: number;
}

/** Three bounded automatic spells. All visual nodes are pooled on acquisition. */
export class ElementalAbility implements Ability {
    public readonly id: ElementalKind;
    private readonly _visuals: SpellVisual[] = [];
    private readonly _results: EnemyId[] = [];
    private readonly _chain: EnemyId[] = [];
    private readonly _chainX = new Float32Array(5);
    private readonly _chainY = new Float32Array(5);
    private readonly _position = new Vec2();
    private _cooldown = 1;
    private _strikeWait = -1;
    private _echoWait = -1;
    private _strikeX = 0;
    private _strikeY = 0;
    private _strikeRadius = 90;
    private _strikeDamage = 0;
    private _strikeEvolved = false;

    constructor (private readonly _world: EnemyCombatWorld, private readonly _options: ElementalAbilityOptions) {
        this.id = _options.kind;
        const count = this.id === 'chain-lightning' ? 5 : 1;
        for (let i = 0; i < count; i++) {
            const node = instantiate(_options.prefab);
            node.setParent(this.id === 'frost-pulse' ? _options.groundParent : _options.visualParent);
            node.active = false;
            const transform = node.getComponent(UITransform);
            const mark = node.getChildByName('Mark');
            // Detach the authored ground decal once; the bolt stays above combatants.
            if (mark) { mark.setParent(_options.groundParent); mark.active = false; }
            this._visuals.push({ node, opacity: node.getComponent(UIOpacity),
                transform, bolt: node.getChildByName('Bolt'), mark,
                markOpacity: mark?.getComponent(UIOpacity) ?? null, thickness: transform?.height ?? 100,
                life: 0, duration: 1, diameter: 1 });
        }
    }

    public updateAbility (dt: number, context: AbilityFrameContext): void {
        const step = Math.max(0, dt);
        this.updateVisuals(step);
        // Resolve the existing echo before scheduling a new one, so a frame's dt is not used twice.
        if (this._echoWait >= 0) {
            this._echoWait -= step;
            if (this._echoWait <= 0) { this._echoWait = -1; this.strike(true); }
        }
        if (this._strikeWait >= 0) {
            this._strikeWait -= step;
            if (this._strikeWait <= 0) {
                this._strikeWait = -1;
                this.strike(false);
                if (this._strikeEvolved) this._echoWait = 0.3;
            }
        }
        this._cooldown = Math.max(0, this._cooldown - step);
        if (this._cooldown > 0) return;
        // No catch-up volleys after stalls and no per-frame search while waiting for a target.
        this._cooldown = 0.2;
        if (!this._world.hasEnemies) return;
        const level = Math.max(1, Math.min(5, this._options.level | 0));
        if (this.id === 'thunder') this.castThunder(context, level);
        else if (this.id === 'chain-lightning') this.castChain(context, level);
        else this.castFrost(context, level);
    }

    private castThunder (context: AbilityFrameContext, level: number): void {
        const target = this._world.findPriorityEnemy
            ? this._world.findPriorityEnemy(context.originX, context.originY, 620)
            : this._world.findNearestEnemy(context.originX, context.originY, 620, true);
        if (target === null || !this._world.getEnemyPosition(target, this._position)) return;
        this._strikeX = this._position.x;
        this._strikeY = this._position.y;
        this._strikeRadius = level >= 3 ? 115 : 90;
        this._strikeDamage = [0, 6, 7.5, 7.5, 10, 12][level] * this.attackPower;
        this._strikeEvolved = this._options.evolved;
        this._strikeWait = 0.3;
        this._cooldown = (level >= 5 ? 3.2 : 4) * (this._options.cooldownMultiplier ?? 1);
        const visual = this.showVisual(0, this._strikeX, this._strikeY, 1.05);
        visual.node.setScale(1, 1, 1);
        visual.mark?.setScale(this._strikeRadius / 90, this._strikeRadius / 90, 1);
        if (visual.bolt) visual.bolt.active = false;
    }

    private strike (echo: boolean): void {
        const visual = this.showVisual(0, this._strikeX, this._strikeY, echo ? 0.35 : 0.65);
        if (visual.bolt) visual.bolt.active = true;
        this._options.playSound?.(this.id, echo);
        this._world.queryEnemiesInCircle(this._strikeX, this._strikeY, this._strikeRadius, this._results, true);
        const actionId = createCombatActionId();
        for (let i = 0; i < this._results.length; i++) {
            this._world.applyDamage(this._results[i], { amount: this._strikeDamage * (echo ? 0.6 : 1),
                sourceAbilityId: this.id, actionId, isPrimaryAttack: !echo, targetIndex: i });
        }
    }

    private castChain (context: AbilityFrameContext, level: number): void {
        let target = this._world.findNearestEnemy(context.originX, context.originY, 520, true);
        if (target === null) return;
        const count = this._options.evolved ? 5 : level >= 3 ? 4 : 3;
        const jumpRange = this._options.evolved ? 250 : 200;
        this._chain.length = 0;
        // Capture the whole bounded route before damage can compact the enemy storage.
        for (let hop = 0; hop < count && target !== null; hop++) {
            if (!this._world.getEnemyPosition(target, this._position)) break;
            this._chain.push(target);
            const x = this._chainX[hop] = this._position.x;
            const y = this._chainY[hop] = this._position.y;
            if (hop === count - 1) break;
            this._world.queryEnemiesInCircle(x, y, jumpRange, this._results, true);
            let best: EnemyId | null = null;
            let bestDistance = jumpRange * jumpRange;
            for (const candidate of this._results) {
                if (this._chain.includes(candidate) || !this._world.getEnemyPosition(candidate, this._position)) continue;
                const distance = (this._position.x - x) ** 2 + (this._position.y - y) ** 2;
                if (distance < bestDistance || distance === bestDistance && (best === null || candidate < best)) {
                    best = candidate; bestDistance = distance;
                }
            }
            target = best;
        }
        const actionId = createCombatActionId();
        const damage = (this._options.evolved ? 3.8 : [0, 2, 2.5, 2.5, 3.2, 3.8][level]) * this.attackPower;
        let fromX = context.originX;
        let fromY = context.originY;
        for (let i = 0; i < this._chain.length; i++) {
            const x = this._chainX[i]; const y = this._chainY[i];
            const visual = this.showVisual(i, (fromX + x) / 2, (fromY + y) / 2, 0.38);
            visual.transform?.setContentSize(Math.max(1, Math.hypot(x - fromX, y - fromY)),
                visual.thickness * (this._options.evolved ? 1.2 : 1));
            visual.node.setRotationFromEuler(0, 0, Math.atan2(y - fromY, x - fromX) * 180 / Math.PI);
            this._world.applyDamage(this._chain[i], { amount: damage, sourceAbilityId: this.id,
                actionId, isPrimaryAttack: true, targetIndex: i });
            fromX = x; fromY = y;
        }
        // One electrical burst for the whole route, independent of hop count.
        if (this._chain.length > 0) this._options.playSound?.(this.id, false);
        this._cooldown = (level >= 5 ? 2 : 2.5) * (this._options.cooldownMultiplier ?? 1);
    }

    private castFrost (context: AbilityFrameContext, level: number): void {
        const radius = this._options.evolved ? 320 : level >= 3 ? 280 : 240;
        this._world.queryEnemiesInCircle(context.originX, context.originY, radius, this._results, true);
        if (this._results.length === 0) return;
        const freeze = this._options.evolved ? 1 : 0.65;
        const slow = level >= 4 ? 2 : 1.5;
        const damage = [0, 1, 1.4, 1.4, 1.8, 2.2][level] * this.attackPower;
        const actionId = createCombatActionId();
        for (let i = 0; i < this._results.length; i++) {
            const id = this._results[i];
            this._world.applyFrost?.(id, freeze, slow, 0.55);
            this._world.applyDamage(id, { amount: damage, sourceAbilityId: this.id,
                actionId, isPrimaryAttack: true, targetIndex: i });
        }
        const visual = this.showVisual(0, context.originX, context.originY, 0.55);
        visual.diameter = radius * 2;
        visual.node.setScale(0.3, 0.3, 1);
        this._options.playSound?.(this.id, false);
        this._cooldown = (level >= 5 ? 5 : 6) * (this._options.cooldownMultiplier ?? 1);
    }

    private get attackPower (): number { return Math.max(0, this._options.getAttackPower()); }

    private showVisual (index: number, x: number, y: number, duration: number): SpellVisual {
        const visual = this._visuals[index];
        visual.node.active = true;
        visual.node.setPosition(x, y, 0);
        if (visual.mark) { visual.mark.setPosition(x, y, 0); visual.mark.active = true; }
        visual.life = visual.duration = duration;
        if (visual.opacity) visual.opacity.opacity = 255;
        if (visual.markOpacity) visual.markOpacity.opacity = 255;
        return visual;
    }

    private updateVisuals (dt: number): void {
        for (const visual of this._visuals) {
            if (visual.life <= 0) continue;
            visual.life = Math.max(0, visual.life - dt);
            if (visual.life === 0) {
                visual.node.active = false;
                if (visual.mark) visual.mark.active = false;
                continue;
            }
            const progress = 1 - visual.life / visual.duration;
            if (this.id === 'frost-pulse') {
                const scale = visual.diameter / 256 * (0.25 + 0.75 * Math.min(1, progress * 2.5));
                visual.node.setScale(scale, scale, 1);
            }
            const opacity = Math.round(255 * Math.min(1, visual.life / 0.2));
            if (visual.opacity) visual.opacity.opacity = opacity;
            if (visual.markOpacity) visual.markOpacity.opacity = opacity;
        }
    }

    public destroyAbility (): void {
        this._strikeWait = this._echoWait = -1;
        for (const visual of this._visuals) { visual.mark?.destroy(); visual.node.destroy(); }
        this._visuals.length = 0;
    }
}
