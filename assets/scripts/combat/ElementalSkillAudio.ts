import { _decorator, AudioClip, AudioSource, Component } from 'cc';
import type { ElementalKind } from './ElementalAbility';

const { ccclass, menu, property, requireComponent } = _decorator;
const REPEAT_GAP_MS = [220, 160, 400];
const CLIP_VOLUMES = [0.85, 0.62, 0.52];

@ccclass('ElementalSkillAudio')
@menu('Gameplay/Elemental Skill Audio')
@requireComponent(AudioSource)
export class ElementalSkillAudio extends Component {
    @property({ type: AudioClip, displayName: '落雷命中音效' })
    public thunderClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '连锁放电音效' })
    public chainClip: AudioClip | null = null;

    @property({ type: AudioClip, displayName: '寒霜脉冲音效' })
    public frostClip: AudioClip | null = null;

    @property({ range: [0, 1, 0.01], displayName: '技能音量' })
    public volume = 0.7;

    private _source: AudioSource | null = null;
    private readonly _nextAllowed = new Float64Array(3);
    private readonly _voiceEnds = new Float64Array(3);

    protected onLoad (): void {
        this._source = this.getComponent(AudioSource);
    }

    /** Fixed three-voice budget; no nodes, timers or pending sounds per hit. */
    public play (kind: ElementalKind, echo = false): void {
        if (!this.enabledInHierarchy || !this._source || this.volume <= 0) return;
        const index = kind === 'thunder' ? 0 : kind === 'chain-lightning' ? 1 : 2;
        const clip = index === 0 ? this.thunderClip : index === 1 ? this.chainClip : this.frostClip;
        if (!clip) return;
        // Audio completes in real time, including while upgrade selection pauses combat.
        const now = Date.now();
        if (now < this._nextAllowed[index]) return;
        let voice = -1;
        for (let i = 0; i < this._voiceEnds.length; i++) {
            if (this._voiceEnds[i] <= now) { voice = i; break; }
        }
        if (voice < 0) return;
        const clipDuration = clip.getDuration();
        const duration = Number.isFinite(clipDuration) && clipDuration > 0 ? clipDuration : 1;
        this._voiceEnds[voice] = now + duration * 1000;
        this._nextAllowed[index] = now + REPEAT_GAP_MS[index];
        this._source.playOneShot(clip, Math.min(1, this.volume) * CLIP_VOLUMES[index] * (echo ? 0.55 : 1));
    }
}
