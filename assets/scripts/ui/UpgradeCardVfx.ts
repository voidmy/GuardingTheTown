import { _decorator, Color, Component, Node, Sprite, UIOpacity } from 'cc';
import type { UpgradeRarity } from '../progression/UpgradePresentation';

const { ccclass, menu } = _decorator;
const TINTS = [new Color(137, 235, 207), new Color(213, 151, 255), new Color(255, 215, 117)];
interface Mote { node: Node; opacity: UIOpacity; sprite: Sprite; }

/** All particles are authored in the prefab. No allocations, spawning or queries per frame. */
@ccclass('UpgradeCardVfx')
@menu('Gameplay/Upgrade Card VFX')
export class UpgradeCardVfx extends Component {
    private _flow: Mote[] = [];
    private _sparks: Mote[] = [];
    private _burst: Mote | null = null;
    private _tier = 0;
    private _time = 0;
    private _burstTime = 1;
    private _streams = 1;
    private _running = false;

    public play (rarity: UpgradeRarity, delay = 0, compact = false): void {
        this.bind();
        this._tier = rarity === 'legendary' ? 2 : rarity === 'rare' ? 1 : 0;
        this._streams = this._tier === 0 ? 0 : compact ? Math.min(2, this._tier + 1) : this._tier + 1;
        this._time = -delay;
        this._burstTime = -delay;
        this._running = true;
        const tint = TINTS[this._tier];
        for (let i = 0; i < this._flow.length; i++) {
            const mote = this._flow[i];
            mote.node.active = i < this._streams * 4;
            mote.sprite.color = tint;
            mote.opacity.opacity = 0;
        }
        for (let i = 0; i < this._sparks.length; i++) {
            const mote = this._sparks[i];
            mote.node.active = this._tier > 0 && i < (this._tier === 2 && !compact ? 6 : 3);
            mote.sprite.color = tint;
            mote.opacity.opacity = 0;
        }
        if (this._burst) {
            this._burst.sprite.color = tint;
            this._burst.opacity.opacity = 0;
        }
    }

    public celebrate (): void { this._burstTime = 0; }

    public stop (): void {
        this._running = false;
        for (const mote of this._flow) mote.opacity.opacity = 0;
        for (const mote of this._sparks) mote.opacity.opacity = 0;
        if (this._burst) this._burst.opacity.opacity = 0;
    }

    protected onDisable (): void { this.stop(); }

    protected update (dt: number): void {
        if (!this._running) return;
        // Clamp background-resume deltas; the panel animates only while visible.
        const step = Math.min(dt, 0.05);
        this._time += step;
        this._burstTime += step;
        if (this._time < 0) return;
        const fade = Math.min(1, this._time * 5);
        const speed = 105 + this._tier * 65;
        for (let i = 0; i < this._streams * 4 && i < this._flow.length; i++) {
            const mote = this._flow[i];
            const tail = i % 4;
            const distance = this._time * speed + Math.floor(i / 4) * 2176 / this._streams - tail * 18;
            this.placeOnBorder(mote.node, distance);
            const size = (1 - tail * 0.17) * (this._tier === 2 ? 1.18 : 0.9);
            mote.node.setScale(size, size, 1);
            mote.opacity.opacity = Math.round((this._tier === 0 ? 145 : 245) * (1 - tail * 0.23) * fade);
        }
        for (let i = 0; i < this._sparks.length; i++) {
            const mote = this._sparks[i];
            if (!mote.node.active) continue;
            const phase = (this._time * (0.28 + i * 0.018) + i * 0.173) % 1;
            const side = i % 2 === 0 ? -1 : 1;
            mote.node.setPosition(side * (220 + Math.sin(phase * Math.PI) * 12), -280 + phase * 570, 0);
            const pulse = Math.sin(phase * Math.PI);
            mote.node.setScale(0.3 + pulse * 0.65, 0.3 + pulse * 0.65, 1);
            mote.opacity.opacity = Math.round(pulse * (this._tier === 2 ? 215 : 135) * fade);
        }
        if (this._burst && this._burstTime >= 0 && this._burstTime <= 0.6) {
            const progress = this._burstTime / 0.6;
            const scale = 0.45 + progress * 1.1;
            this._burst.node.setScale(scale, scale, 1);
            this._burst.opacity.opacity = Math.round((1 - progress) * (this._tier === 2 ? 235 : 120));
        } else if (this._burst) this._burst.opacity.opacity = 0;
    }

    private placeOnBorder (node: Node, distance: number): void {
        // Clockwise rounded rectangle, aligned to the artwork's inner metal rim.
        let d = ((distance % 2176) + 2176) % 2176;
        if (d < 388) { node.setPosition(-194 + d, 324, 0); return; }
        d -= 388;
        if (d < 40) { const a = Math.PI / 2 - d / 40 * Math.PI / 2; node.setPosition(194 + 26 * Math.cos(a), 298 + 26 * Math.sin(a), 0); return; }
        d -= 40;
        if (d < 620) { node.setPosition(220, 298 - d, 0); return; }
        d -= 620;
        if (d < 40) { const a = -d / 40 * Math.PI / 2; node.setPosition(194 + 26 * Math.cos(a), -322 + 26 * Math.sin(a), 0); return; }
        d -= 40;
        if (d < 388) { node.setPosition(194 - d, -348, 0); return; }
        d -= 388;
        if (d < 40) { const a = -Math.PI / 2 - d / 40 * Math.PI / 2; node.setPosition(-194 + 26 * Math.cos(a), -322 + 26 * Math.sin(a), 0); return; }
        d -= 40;
        if (d < 620) { node.setPosition(-220, -322 + d, 0); return; }
        d -= 620;
        const a = Math.PI - d / 40 * Math.PI / 2;
        node.setPosition(-194 + 26 * Math.cos(a), 298 + 26 * Math.sin(a), 0);
    }

    private bind (): void {
        if (this._flow.length > 0) return;
        const read = (node: Node): Mote => ({ node, sprite: node.getComponent(Sprite)!, opacity: node.getComponent(UIOpacity)! });
        this._flow = (this.node.getChildByName('Flow')?.children ?? []).map(read);
        this._sparks = (this.node.getChildByName('Sparks')?.children ?? []).map(read);
        const burst = this.node.getChildByName('Reveal');
        this._burst = burst ? read(burst) : null;
    }
}
