import { _decorator, RenderData, Texture2D, UIRenderer } from 'cc';
import { monsterBatchAssembler } from './MonsterBatchAssembler';

const { ccclass, menu, property } = _decorator;
export const MAX_BATCH_MONSTERS = 4000;
export const MONSTERS_PER_RENDERER = 1000;
const DATA_STRIDE = 7;

@ccclass('MonsterBatchRenderer')
@menu('Rendering/Monster Batch Renderer')
export class MonsterBatchRenderer extends UIRenderer {
    @property(Texture2D)
    public texture: Texture2D | null = null;

    @property({ min: 1, max: MONSTERS_PER_RENDERER, step: 1 })
    public initialCapacity = 1000;

    private _count = 0;
    private _displayData = new Float32Array(0);

    public get count (): number {
        return this._count;
    }

    public get displayData (): Float32Array {
        return this._displayData;
    }

    public onLoad (): void {
        super.onLoad();
        this.ensureCapacity(this.initialCapacity);
    }

    public setCount (count: number): void {
        this._count = Math.min(MONSTERS_PER_RENDERER, Math.max(0, count | 0));
        this.ensureCapacity(this._count);
    }

    public setMonster (
        index: number,
        x: number,
        y: number,
        width = 64,
        height = 64,
        phase = 0,
        flipX = false,
        hitFlash = 0,
    ): void {
        if (index < 0 || index >= MONSTERS_PER_RENDERER) return;

        this.ensureCapacity(index + 1);
        this._count = Math.max(this._count, index + 1);

        const offset = index * DATA_STRIDE;
        const data = this._displayData;
        data[offset] = x;
        data[offset + 1] = y;
        data[offset + 2] = width;
        data[offset + 3] = height;
        data[offset + 4] = Math.max(0, phase | 0);
        data[offset + 5] = flipX ? 1 : 0;
        data[offset + 6] = Math.min(1, Math.max(0, hitFlash));
    }

    /** Call once after writing the current frame's monster data. */
    public commit (): void {
        this.markForUpdateRenderData();
    }

    public clear (): void {
        this._count = 0;
        this.commit();
    }

    public setTexture (texture: Texture2D | null): void {
        if (this.texture === texture) return;
        this.texture = texture;
        if (this.renderData) this.renderData.textureDirty = true;
        this.commit();
    }

    protected _flushAssembler (): void {
        if (this._assembler !== monsterBatchAssembler) {
            this.destroyRenderData();
            this._assembler = monsterBatchAssembler;
        }

        if (!this._renderData) {
            this._renderData = monsterBatchAssembler.createData!(this) as RenderData;
            this._renderData.material = this.getRenderMaterial(0);
        }
    }

    protected _render (render: any): void {
        render.commitComp(this, this._renderData, this.texture, this._assembler, this.node);
    }

    protected _canRender (): boolean {
        return this._count > 0 && !!this.texture && super._canRender();
    }

    private ensureCapacity (count: number): void {
        const current = this._displayData.length / DATA_STRIDE;
        if (count <= current) return;

        const capacity = Math.min(MONSTERS_PER_RENDERER, Math.max(count, current * 2, 1));
        const next = new Float32Array(capacity * DATA_STRIDE);
        next.set(this._displayData);
        this._displayData = next;
    }
}
