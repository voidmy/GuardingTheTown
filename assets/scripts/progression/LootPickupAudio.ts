import { _decorator, AudioClip, AudioSource, Component } from 'cc';
import { LootReward } from './LootDropModel';

const { ccclass, menu, property, requireComponent } = _decorator;

// Higher values get the first beat when several kinds arrive together.
const NORMAL = 0;
const ELITE = 1;
const BOSS = 2;
const EQUIPMENT = 3;
const CHEST = 4;
const SOUND_COUNT = 5;
const REPEAT_GAPS = [0.075, 0.16, 0.5, 0.32, 0.42];
const PENDING_LIFETIMES = [0.15, 0.3, 0.75, 0.75, 0.75];
const VOLUMES = [0.58, 0.72, 0.94, 0.86, 0.94];

@ccclass('LootPickupAudio')
@menu('Gameplay/Loot Pickup Audio')
@requireComponent(AudioSource)
export class LootPickupAudio extends Component {
    @property({ type: AudioClip, displayName: '普通经验音效 A' })
    public normalClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '普通经验音效 B' })
    public normalAltClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '普通经验音效 C' })
    public normalHighClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '精英经验音效' })
    public eliteClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: 'Boss 经验音效' })
    public bossClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '宝箱拾取音效' })
    public chestClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '装备拾取音效' })
    public equipmentClip: AudioClip | null = null;

    @property({ range: [0, 1, 0.01], displayName: '拾取音量', tooltip: '设为 0 关闭拾取音效。' })
    public volume = 0.8;

    private _source: AudioSource | null = null;
    private _pending = 0;
    private readonly _ages = new Float32Array(SOUND_COUNT);
    private readonly _cooldowns = new Float32Array(SOUND_COUNT);
    private _beatGap = 0;
    private _rareDuckTime = 0;
    private _chainTime = 0;
    private _chainStep = 0;

    protected onLoad (): void {
        this._source = this.getComponent(AudioSource);
    }

    // Real audio time continues during an upgrade pause, allowing the other rare
    // kinds collected on that frame to finish their short, bounded sequence.
    protected update (dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        this._beatGap = Math.max(0, this._beatGap - dt);
        this._rareDuckTime = Math.max(0, this._rareDuckTime - dt);
        this._chainTime = Math.max(0, this._chainTime - dt);
        if (this._chainTime === 0) this._chainStep = 0;
        for (let kind = 0; kind < SOUND_COUNT; kind++) {
            this._cooldowns[kind] = Math.max(0, this._cooldowns[kind] - dt);
            if (!(this._pending & (1 << kind))) continue;
            this._ages[kind] += dt;
            if (this._ages[kind] > PENDING_LIFETIMES[kind]) this._pending &= ~(1 << kind);
        }
        this.flush();
    }

    public queuePickup (reward: LootReward): void {
        if (!this.enabledInHierarchy || this.volume <= 0) return;
        const kind = reward.kind === 'chest' || reward.kind === 'manual' ? CHEST : reward.kind === 'equipment' ? EQUIPMENT
            : reward.tier === 'boss' ? BOSS : reward.tier === 'elite' ? ELITE : NORMAL;
        // Copy only the category: LootDropModel immediately recycles the reward.
        // One pending bit per kind coalesces even hundreds of simultaneous drops.
        this._pending |= 1 << kind;
        this._ages[kind] = 0;
    }

    /** Called after the whole pickup batch so rare rewards win the first beat. */
    public flush (): void {
        if (!this.enabledInHierarchy || !this._source || this.volume <= 0) {
            this._pending = 0;
            return;
        }
        if (this._beatGap > 0) return;
        for (let kind = CHEST; kind >= NORMAL; kind--) {
            if (!(this._pending & (1 << kind)) || this._cooldowns[kind] > 0) continue;
            this._pending &= ~(1 << kind);
            const clip = this.clipFor(kind);
            if (!clip) continue;
            const duck = kind <= ELITE && this._rareDuckTime > 0 ? 0.45 : 1;
            this._source.playOneShot(clip, Math.min(1, this.volume) * VOLUMES[kind] * duck);
            this._cooldowns[kind] = REPEAT_GAPS[kind];
            // At most one new voice per beat, independent of frame rate or stacks.
            this._beatGap = kind >= BOSS ? 0.13 : 0.075;
            if (kind >= BOSS) this._rareDuckTime = 0.5;
            if (kind === NORMAL) {
                this._chainStep = (this._chainStep + 1) % 4;
                this._chainTime = 0.4;
            }
            return;
        }
    }

    public clear (): void {
        this._pending = 0;
        this._ages.fill(0);
        this._cooldowns.fill(0);
        this._beatGap = 0;
        this._rareDuckTime = 0;
        this._chainTime = 0;
        this._chainStep = 0;
    }

    protected onDisable (): void {
        this.clear();
    }

    private clipFor (kind: number): AudioClip | null {
        if (kind === CHEST) return this.chestClip;
        if (kind === EQUIPMENT) return this.equipmentClip;
        if (kind === BOSS) return this.bossClip;
        if (kind === ELITE) return this.eliteClip;
        if (this._chainStep === 2) return this.normalHighClip ?? this.normalClip;
        if (this._chainStep === 1 || this._chainStep === 3) return this.normalAltClip ?? this.normalClip;
        return this.normalClip;
    }
}
