import { _decorator, RenderData, Texture2D, UIRenderer } from 'cc';
import { lootBatchAssembler } from './LootBatchAssembler';
import { MAX_LOOT_DROPS } from './LootDropModel';

const { ccclass, menu } = _decorator;
const QUAD_STRIDE = 20;

@ccclass('LootBatchRenderer')
@menu('Rendering/Loot Batch Renderer')
export class LootBatchRenderer extends UIRenderer {
    public texture: Texture2D | null = null;
    public count = 0;
    // Four local XY positions, four UV pairs, then RGBA.
    public readonly quadData = new Float32Array(MAX_LOOT_DROPS * QUAD_STRIDE);

    public begin (): void { this.count = 0; }

    public setTexture (texture: Texture2D | null): void {
        if (this.texture === texture) return;
        this.texture = texture;
        if (this.renderData) this.renderData.textureDirty = true;
    }

    public addQuad (
        x: number, y: number, scale: number, corners: Float32Array,
        uv: readonly number[], red: number, green: number, blue: number, alpha: number,
    ): void {
        if (this.count >= MAX_LOOT_DROPS) return;
        const offset = this.count++ * QUAD_STRIDE;
        const data = this.quadData;
        for (let vertex = 0; vertex < 4; vertex++) {
            const pair = vertex * 2;
            data[offset + pair] = x + corners[pair] * scale;
            data[offset + pair + 1] = y + corners[pair + 1] * scale;
            data[offset + 8 + pair] = uv[pair];
            data[offset + 9 + pair] = uv[pair + 1];
        }
        data[offset + 16] = red;
        data[offset + 17] = green;
        data[offset + 18] = blue;
        data[offset + 19] = alpha;
    }

    public commit (): void { this.markForUpdateRenderData(); }

    protected _flushAssembler (): void {
        if (this._assembler !== lootBatchAssembler) {
            this.destroyRenderData();
            this._assembler = lootBatchAssembler;
        }
        if (!this._renderData) {
            this._renderData = lootBatchAssembler.createData!(this) as RenderData;
            this._renderData.material = this.getRenderMaterial(0);
        }
    }

    protected _render (render: any): void {
        render.commitComp(this, this._renderData, this.texture, this._assembler, null);
    }

    protected _canRender (): boolean {
        return this.count > 0 && !!this.texture && super._canRender();
    }
}
