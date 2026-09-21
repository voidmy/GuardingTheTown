import { AudioSource, instantiate, isValid, Material, Node, Prefab, Rect, Sprite, UIOpacity, UITransform, Vec4 } from 'cc';
import { createCombatActionId, DamageInfo, EnemyCombatWorld, EnemyId } from './CombatTypes';

const OPENING = 0.35;
const DURATION = 6;
const FADE = 0.45;
const INTERVAL = 0.5;
const TICKS = 12;
const SPLASH_CYCLE = 0.48;
const MAX_SPLASHES = 16;

export interface RainFeedback {
    getVolume?: () => number;
    onOpening?: () => void;
}

/** A single scrolling rain quad and an authored, fixed-size splash pool. */
export class RainPotion {
    private readonly _node: Node;
    private readonly _transform: UITransform | null;
    private readonly _material: Material | null;
    private readonly _ground: Node | null;
    private readonly _splashes: { node: Node; opacity: UIOpacity | null; cycle: number; size: number }[] = [];
    private readonly _rainAudio: AudioSource | null;
    private readonly _thunderAudio: AudioSource | null;
    private readonly _bounds = new Rect();
    private readonly _state = new Vec4();
    private readonly _size = new Vec4();
    private readonly _results: EnemyId[] = [];
    private readonly _damage: DamageInfo = { amount: 0, sourceAbilityId: 'potion-rain', isPrimaryAttack: false };
    private _age = -1;
    private _ticks = 0;
    private _paused = false;
    private _rainStarted = false;
    private _thunderStarted = false;
    private _openingPending = false;

    public constructor (private readonly _world: EnemyCombatWorld, prefab: Prefab, parent: Node, ground: Node,
        private readonly _attack: () => number, private readonly _feedback: RainFeedback = {}) {
        this._node = instantiate(prefab);
        this._node.active = false;
        this._node.setParent(parent);
        this._transform = this._node.getComponent(UITransform);
        const sprite = this._node.getComponent(Sprite);
        const source = sprite?.customMaterial;
        this._material = source && sprite.spriteFrame ? new Material() : null;
        if (this._material) {
            this._material.copy(source);
            sprite.customMaterial = this._material;
        }
        this._rainAudio = this._node.getComponent(AudioSource);
        this._thunderAudio = this._node.getChildByName('Thunder')?.getComponent(AudioSource) ?? null;
        this._ground = this._node.getChildByName('Splashes');
        if (this._ground) {
            this._ground.active = false;
            this._ground.setParent(ground);
            for (const node of this._ground.children.slice(0, MAX_SPLASHES)) {
                this._splashes.push({ node, opacity: node.getComponent(UIOpacity), cycle: -1, size: 1 });
                node.active = false;
            }
        }
    }

    public cast (): string {
        if (!isValid(this._node, true) || !isValid(this._material, true) || !this._transform
            || !this._world.getCombatViewport(this._bounds)) return '降雨特效尚未就绪。';
        if (this._age >= 0) return '暴雨仍在持续，请稍后再用。';
        const attack = this._attack();
        if (!Number.isFinite(attack) || attack <= 0) return '角色攻击尚未就绪。';
        this._damage.amount = attack * 1.5;
        this._age = 0;
        this._ticks = 0;
        this._rainStarted = false;
        this._thunderStarted = false;
        this._openingPending = true;
        for (const splash of this._splashes) { splash.cycle = -1; splash.node.active = false; }
        this.updateVisuals();
        this._node.active = true;
        if (this._ground) this._ground.active = true;
        return '';
    }

    public advance (dt: number): void {
        if (this._age < 0 || this._paused || !Number.isFinite(dt) || dt <= 0) return;
        if (!this._world.getCombatViewport(this._bounds)) { this.stop(); return; }
        // Opening feedback runs after the potion menu has closed and movement has resumed.
        if (this._openingPending) {
            this._openingPending = false;
            this._feedback.onOpening?.();
            this._thunderStarted = this.play(this._thunderAudio, 0.48);
        }
        this._age = Math.min(OPENING + DURATION + FADE, this._age + dt);
        // Integer tick count avoids both boundary rounding loss and frame-rate dependent extra hits.
        const due = Math.min(TICKS, Math.max(0, Math.floor((this._age - OPENING + 0.000001) / INTERVAL)));
        while (this._ticks < due) {
            this._ticks++;
            this._world.queryEnemiesInRect(this._bounds, this._results);
            this._damage.actionId = createCombatActionId();
            for (const id of this._results) this._world.applyDamage(id, this._damage);
            this._results.length = 0;
        }
        if (this._age >= OPENING + DURATION + FADE) { this.stop(); return; }
        this.updateVisuals();
        if (this._age >= OPENING && !this._rainStarted) this._rainStarted = this.play(this._rainAudio, 0);
        if (this._rainAudio) this._rainAudio.volume = this.volume() * 0.6 * this.envelope();
        if (this._thunderAudio) this._thunderAudio.volume = this.volume() * 0.48;
    }

    public setPaused (paused: boolean): void {
        if (this._paused === paused) return;
        this._paused = paused;
        if (this._age < 0) return;
        if (paused) {
            if (this._rainStarted) this._rainAudio?.pause();
            if (this._thunderStarted) this._thunderAudio?.pause();
        } else {
            if (this._rainStarted) this._rainAudio?.play();
            // Do not restart a thunder clip that finished before the pause.
            if (this._thunderStarted && this._thunderAudio?.clip
                && this._age < this._thunderAudio.duration) this._thunderAudio.play();
        }
    }

    public stop (): void {
        this._age = -1;
        this._results.length = 0;
        this._openingPending = false;
        this._rainStarted = false;
        this._thunderStarted = false;
        if (isValid(this._rainAudio, true)) this._rainAudio.stop();
        if (isValid(this._thunderAudio, true)) this._thunderAudio.stop();
        if (isValid(this._node, true)) this._node.active = false;
        if (isValid(this._ground, true)) this._ground.active = false;
    }

    public destroy (): void {
        this.stop();
        if (isValid(this._node, true)) this._node.destroy();
        if (isValid(this._ground, true)) this._ground.destroy();
        if (isValid(this._material, true)) this._material.destroy();
        this._splashes.length = 0;
    }

    private envelope (): number {
        return Math.min(1, Math.max(0, (this._age - OPENING) / 0.18))
            * Math.min(1, Math.max(0, (OPENING + DURATION + FADE - this._age) / FADE));
    }

    private updateVisuals (): void {
        const bounds = this._bounds;
        this._node.setPosition(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5, 0);
        if (this._transform.width !== bounds.width || this._transform.height !== bounds.height) {
            this._transform.setContentSize(bounds.width, bounds.height);
        }
        const fade = Math.min(1, Math.max(0, (OPENING + DURATION + FADE - this._age) / FADE));
        const rain = this.envelope();
        this._state.set(this._age, rain, Math.min(1, this._age / OPENING) * fade, this._ticks === TICKS ? fade : 0);
        // The authored tile contains many short streaks. Use fewer, larger tiles so
        // each raindrop remains readable on a phone instead of turning into fine noise.
        this._size.set(bounds.width / 700, bounds.height / 700, 0, 0);
        this._material?.setProperty('rainState', this._state);
        this._material?.setProperty('rainSize', this._size);
        const elapsed = this._age - OPENING;
        for (let i = 0; i < this._splashes.length; i++) {
            const splash = this._splashes[i];
            const time = elapsed - i * SPLASH_CYCLE / MAX_SPLASHES;
            if (time < 0) { splash.node.active = false; continue; }
            const cycle = Math.floor(time / SPLASH_CYCLE);
            const phase = time / SPLASH_CYCLE - cycle;
            if (splash.cycle !== cycle) {
                if (elapsed >= DURATION) { splash.node.active = false; continue; }
                splash.cycle = cycle;
                // Fixed pool distributed over the viewport; no per-enemy visual allocations.
                splash.node.setPosition(bounds.x + (0.06 + Math.random() * 0.88) * bounds.width,
                    bounds.y + (0.08 + Math.random() * 0.84) * bounds.height, 0);
                splash.size = 0.7 + Math.random() * 0.65;
            }
            splash.node.active = rain > 0;
            const scale = splash.size * (0.45 + phase * 0.75);
            splash.node.setScale(scale, scale, 1);
            if (splash.opacity) splash.opacity.opacity = Math.round(200 * (1 - phase) * rain);
        }
    }

    private volume (): number {
        const volume = this._feedback.getVolume?.() ?? 0.7;
        return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
    }

    private play (source: AudioSource | null, gain: number): boolean {
        if (!source?.clip) return false;
        source.volume = this.volume() * gain;
        source.play();
        return true;
    }
}
