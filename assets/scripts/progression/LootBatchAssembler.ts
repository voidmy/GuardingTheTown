import { RenderData, UIRenderer } from 'cc';
import type { IAssembler } from 'cc';
import type { LootBatchRenderer } from './LootBatchRenderer';
import { MAX_LOOT_DROPS } from './LootDropModel';

const MAX_QUADS = MAX_LOOT_DROPS;
const QUAD_STRIDE = 20;
const INDICES = new Uint16Array(MAX_QUADS * 6);
for (let i = 0; i < MAX_QUADS; i++) {
    const vertex = i * 4;
    INDICES.set([vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2], i * 6);
}

export const lootBatchAssembler: IAssembler = {
    createData (component: UIRenderer): RenderData {
        const data = component.requestRenderData();
        // Reserve once. Unused quads collapse to zero area, so count changes do not
        // reallocate the shared vertex buffer in Creator 3.8.7.
        data.dataLength = MAX_QUADS * 4;
        data.resize(MAX_QUADS * 4, MAX_QUADS * 6);
        data.chunk.setIndexBuffer(INDICES);
        return data;
    },

    updateRenderData (component: UIRenderer): void {
        const batch = component as LootBatchRenderer;
        if (!batch.renderData || !batch.texture) return;
        batch.renderData.updateRenderData(batch, batch.texture);
    },

    fillBuffers (component: UIRenderer): void {
        const batch = component as LootBatchRenderer;
        const data = batch.renderData;
        if (!data) return;
        const chunk = data.chunk;
        const buffer = chunk.vb;
        const source = batch.quadData;
        const stride = data.floatStride;
        // The default Sprite material consumes world positions, including moving parents.
        const matrix = batch.node.worldMatrix;
        const opacity = batch.node._uiProps.opacity;
        for (let quad = 0; quad < batch.count; quad++) {
            const input = quad * QUAD_STRIDE;
            for (let vertex = 0; vertex < 4; vertex++) {
                const pair = vertex * 2;
                const x = source[input + pair];
                const y = source[input + pair + 1];
                const output = (quad * 4 + vertex) * stride;
                buffer[output] = matrix.m00 * x + matrix.m04 * y + matrix.m12;
                buffer[output + 1] = matrix.m01 * x + matrix.m05 * y + matrix.m13;
                buffer[output + 2] = matrix.m02 * x + matrix.m06 * y + matrix.m14;
                buffer[output + 3] = source[input + 8 + pair];
                buffer[output + 4] = source[input + 9 + pair];
                buffer[output + 5] = source[input + 16];
                buffer[output + 6] = source[input + 17];
                buffer[output + 7] = source[input + 18];
                buffer[output + 8] = source[input + 19] * opacity;
            }
        }
        // Erase the previous tail when drops are collected; zero-area transparent
        // quads also keep the fixed index range valid on native renderers.
        buffer.fill(0, batch.count * 4 * stride);
        const mesh = chunk.meshBuffer;
        const indices = mesh.iData;
        const first = chunk.vertexOffset;
        const offset = mesh.indexOffset;
        for (let i = 0; i < data.indexCount; i++) indices[offset + i] = first + INDICES[i];
        mesh.indexOffset += data.indexCount;
        mesh.setDirty();
        data.vertDirty = false;
    },
};
