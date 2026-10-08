import {
    _decorator,
    director,
    JsonAsset,
    RenderData,
    Texture2D,
    UIRenderer,
} from 'cc';
import { damageNumberBatchAssembler } from './DamageNumberBatchAssembler';
import { formatCombatNumber } from '../combat/CombatNumbers';

const { ccclass, menu, property } = _decorator;

const GLYPH_DATA_STRIDE = 12;
const DEFAULT_MAX_ACTIVE = 40;
const MAX_GLYPHS_PER_NUMBER = 8;

interface FontGlyph {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    xoffset: number;
    yoffset: number;
    xadvance: number;
}

interface FontLayout {
    chars: FontGlyph[];
    common: { lineHeight: number; scaleW: number; scaleH: number };
}

interface DamageNumberEntry {
    active: boolean;
    amount: number;
    text: string;
    textDirty: boolean;
    x: number;
    y: number;
    age: number;
    duration: number;
    mergeKey: string;
    red: number;
    green: number;
    blue: number;
    jitterX: number;
    priority: boolean;
}

function createEntry (): DamageNumberEntry {
    return {
        active: false,
        amount: 0,
        text: '',
        textDirty: false,
        x: 0,
        y: 0,
        age: 0,
        duration: 0,
        mergeKey: '',
        red: 255,
        green: 255,
        blue: 255,
        jitterX: 0,
        priority: false,
    };
}

@ccclass('DamageNumberBatchRenderer')
@menu('Rendering/Damage Number Batch Renderer')
export class DamageNumberBatchRenderer extends UIRenderer {
    @property(Texture2D)
    public atlas: Texture2D | null = null;

    @property(JsonAsset)
    public fontLayout: JsonAsset | null = null;

    @property({ min: 1, max: DEFAULT_MAX_ACTIVE, step: 1 })
    public maxActive = DEFAULT_MAX_ACTIVE;

    @property({ min: 1, max: DEFAULT_MAX_ACTIVE, step: 1 })
    public maxNewPerFrame = 12;

    @property({ min: 0, max: 0.5, step: 0.01 })
    public mergeWindow = 0.18;

    @property({ min: 16, step: 1 })
    public mergeCellSize = 96;

    @property({ min: 0.1, step: 0.05 })
    public displayDuration = 0.8;

    @property({ min: 1, step: 1 })
    public riseDistance = 72;

    @property({ min: 8, step: 1 })
    public glyphHeight = 42;

    private readonly _entries: DamageNumberEntry[] = Array.from(
        { length: DEFAULT_MAX_ACTIVE },
        createEntry,
    );
    private _glyphCount = 0;
    private _glyphData = new Float32Array(
        DEFAULT_MAX_ACTIVE * MAX_GLYPHS_PER_NUMBER * 2 * GLYPH_DATA_STRIDE,
    );
    private _loadedFont: JsonAsset | null = null;
    private _font: FontLayout | null = null;
    private readonly _glyphs: Record<string, FontGlyph> = Object.create(null);
    private _spawnFrame = -1;
    private _spawnedThisFrame = 0;

    public get glyphCount (): number {
        return this._glyphCount;
    }

    public get glyphData (): Float32Array {
        return this._glyphData;
    }

    public showDamage (
        x: number,
        y: number,
        amount: number,
        sourceAbilityId: string,
    ): void {
        this.showNumber(
            x,
            y,
            Math.abs(amount),
            sourceAbilityId,
            255,
            238,
            128,
            false,
        );
    }

    public showPlayerDamage (x: number, y: number, amount: number): void {
        this.showNumber(
            x,
            y,
            -Math.abs(amount),
            'player-damage',
            255,
            105,
            105,
            true,
        );
    }

    public clear (): void {
        for (const entry of this._entries) entry.active = false;
        this._glyphCount = 0;
        this.commit();
    }

    public lateUpdate (dt: number): void {
        const frameDt = Math.min(Math.max(dt, 0), 0.1);
        let hasActiveEntries = false;
        for (const entry of this._entries) {
            if (!entry.active) continue;
            entry.age += frameDt;
            if (entry.age >= entry.duration) {
                entry.active = false;
                continue;
            }
            hasActiveEntries = true;
        }

        if (hasActiveEntries || this._glyphCount > 0) {
            this.rebuildGlyphData();
            this.commit();
        }
    }

    public setAtlas (atlas: Texture2D | null): void {
        if (this.atlas === atlas) return;
        this.atlas = atlas;
        if (this.renderData) this.renderData.textureDirty = true;
        this.commit();
    }

    protected _flushAssembler (): void {
        if (this._assembler !== damageNumberBatchAssembler) {
            this.destroyRenderData();
            this._assembler = damageNumberBatchAssembler;
        }

        if (!this._renderData) {
            this._renderData = damageNumberBatchAssembler.createData!(this) as RenderData;
            this._renderData.material = this.getRenderMaterial(0);
        }
    }

    protected _render (render: any): void {
        render.commitComp(this, this._renderData, this.atlas, this._assembler, this.node);
    }

    protected _canRender (): boolean {
        return this._glyphCount > 0 && !!this.atlas && super._canRender();
    }

    private showNumber (
        x: number,
        y: number,
        amount: number,
        sourceId: string,
        red: number,
        green: number,
        blue: number,
        priority: boolean,
    ): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)
            || !Number.isFinite(amount) || amount === 0) return;

        const cellSize = Math.max(16, this.mergeCellSize);
        const mergeKey = `${sourceId}:${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
        const mergeLimit = Math.max(0, this.mergeWindow);
        for (const entry of this._entries) {
            if (!entry.active || entry.mergeKey !== mergeKey || entry.age > mergeLimit) continue;
            entry.amount += amount;
            entry.textDirty = true;
            entry.x = entry.x * 0.75 + x * 0.25;
            entry.y = entry.y * 0.75 + y * 0.25;
            return;
        }

        const frame = director.getTotalFrames();
        if (frame !== this._spawnFrame) {
            this._spawnFrame = frame;
            this._spawnedThisFrame = 0;
        }
        if (!priority
            && this._spawnedThisFrame >= Math.max(1, this.maxNewPerFrame | 0)) return;

        const activeLimit = Math.min(
            this._entries.length,
            Math.max(1, this.maxActive | 0),
        );
        let target: DamageNumberEntry | null = null;
        for (let i = 0; i < activeLimit; i++) {
            if (!this._entries[i].active) {
                target = this._entries[i];
                break;
            }
        }
        if (!target && priority) {
            for (let i = 0; i < activeLimit; i++) {
                const candidate = this._entries[i];
                if (candidate.priority) continue;
                if (!target || candidate.age > target.age) target = candidate;
            }
        }
        if (!target) return;

        this._spawnedThisFrame++;
        target.active = true;
        target.amount = amount;
        target.textDirty = true;
        target.x = x;
        target.y = y;
        target.age = 0;
        target.duration = Math.max(0.1, this.displayDuration);
        target.mergeKey = mergeKey;
        target.red = red;
        target.green = green;
        target.blue = blue;
        target.priority = priority;
        target.jitterX = ((frame * 17 + this._spawnedThisFrame * 31) % 17 - 8) * 1.5;
    }

    private rebuildGlyphData (): void {
        this._glyphCount = 0;
        if (!this.fontLayout) return;
        if (this._loadedFont !== this.fontLayout) {
            this._loadedFont = this.fontLayout;
            this._font = this.fontLayout.json as FontLayout;
            for (const key of Object.keys(this._glyphs)) delete this._glyphs[key];
            for (const glyph of this._font.chars) this._glyphs[String.fromCharCode(glyph.id)] = glyph;
        }
        const font = this._font!;
        for (const entry of this._entries) {
            if (!entry.active) continue;

            // Many hits can merge into one entry in a frame; format that total only once.
            if (entry.textDirty) {
                entry.text = formatCombatNumber(entry.amount);
                entry.textDirty = false;
            }
            const text = entry.text;
            const progress = Math.min(1, entry.age / Math.max(0.001, entry.duration));
            const scale = 0.78 + Math.min(1, entry.age / 0.08) * 0.22;
            const height = Math.max(8, this.glyphHeight) * scale;
            const fontScale = height / Math.max(1, this._glyphs['0'].height);
            const alpha = progress <= 0.62
                ? 1
                : Math.max(0, 1 - (progress - 0.62) / 0.38);
            const y = entry.y + this.riseDistance * (1 - (1 - progress) ** 2);
            let totalWidth = 0;
            for (const character of text) totalWidth += (this._glyphs[character]?.xadvance ?? 0) * fontScale;
            // One shadow and one foreground quad share the same static atlas and draw call.
            for (let pass = 0; pass < 2; pass++) {
                const shadow = pass === 0;
                let cursorX = entry.x + entry.jitterX - totalWidth * 0.5;
                for (const character of text) {
                    const glyph = this._glyphs[character];
                    if (!glyph) continue;
                    this.writeGlyph(
                        cursorX + (glyph.xoffset + glyph.width * 0.5) * fontScale + (shadow ? 2 * scale : 0),
                        y + (font.common.lineHeight * 0.5 - glyph.yoffset - glyph.height * 0.5) * fontScale - (shadow ? 2 * scale : 0),
                        glyph.width * fontScale,
                        glyph.height * fontScale,
                        glyph,
                        shadow ? 20 : entry.red,
                        shadow ? 22 : entry.green,
                        shadow ? 30 : entry.blue,
                        Math.round(alpha * 255),
                    );
                    cursorX += glyph.xadvance * fontScale;
                }
            }
        }
    }

    private writeGlyph (
        x: number,
        y: number,
        width: number,
        height: number,
        glyph: FontGlyph,
        red: number,
        green: number,
        blue: number,
        alpha: number,
    ): void {
        this.ensureGlyphCapacity(this._glyphCount + 1);
        const offset = this._glyphCount * GLYPH_DATA_STRIDE;
        const data = this._glyphData;
        data[offset] = x;
        data[offset + 1] = y;
        data[offset + 2] = width;
        data[offset + 3] = height;
        data[offset + 4] = glyph.x / this._font!.common.scaleW;
        data[offset + 5] = glyph.y / this._font!.common.scaleH;
        data[offset + 6] = (glyph.x + glyph.width) / this._font!.common.scaleW;
        data[offset + 7] = (glyph.y + glyph.height) / this._font!.common.scaleH;
        data[offset + 8] = red;
        data[offset + 9] = green;
        data[offset + 10] = blue;
        data[offset + 11] = alpha;
        this._glyphCount++;
    }

    private ensureGlyphCapacity (count: number): void {
        const capacity = this._glyphData.length / GLYPH_DATA_STRIDE;
        if (count <= capacity) return;

        const next = new Float32Array(Math.max(count, capacity * 2) * GLYPH_DATA_STRIDE);
        next.set(this._glyphData);
        this._glyphData = next;
    }

    private commit (): void {
        this.markForUpdateRenderData();
    }
}
