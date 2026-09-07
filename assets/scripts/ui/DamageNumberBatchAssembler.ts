import { Color, RenderData, UIRenderer } from 'cc';
import type { IAssembler } from 'cc';
import type { DamageNumberBatchRenderer } from './DamageNumberBatchRenderer';

const VERTICES_PER_GLYPH = 4;
const INDICES_PER_GLYPH = 6;
const GLYPH_DATA_STRIDE = 12;

function createIndices (count: number): Uint16Array {
    const indices = new Uint16Array(count * INDICES_PER_GLYPH);
    for (let i = 0; i < count; i++) {
        const vertex = i * VERTICES_PER_GLYPH;
        const offset = i * INDICES_PER_GLYPH;
        indices.set([
            vertex, vertex + 1, vertex + 2,
            vertex + 1, vertex + 3, vertex + 2,
        ], offset);
    }
    return indices;
}

export const damageNumberBatchAssembler: IAssembler = {
    createData (component: UIRenderer): RenderData {
        return component.requestRenderData();
    },

    updateRenderData (component: UIRenderer): void {
        const batch = component as DamageNumberBatchRenderer;
        const renderData = batch.renderData;
        const texture = batch.atlas;
        if (!renderData || !texture) return;

        const count = batch.glyphCount;
        const vertexCount = count * VERTICES_PER_GLYPH;
        const indexCount = count * INDICES_PER_GLYPH;
        if (renderData.vertexCount !== vertexCount) {
            renderData.dataLength = vertexCount;
            renderData.resize(vertexCount, indexCount);
            renderData.chunk.setIndexBuffer(createIndices(count));
        }

        const source = batch.glyphData;
        const vertices = renderData.data;
        for (let i = 0; i < count; i++) {
            const sourceOffset = i * GLYPH_DATA_STRIDE;
            const vertexOffset = i * VERTICES_PER_GLYPH;
            const x = source[sourceOffset];
            const y = source[sourceOffset + 1];
            const halfWidth = source[sourceOffset + 2] * 0.5;
            const halfHeight = source[sourceOffset + 3] * 0.5;
            const u0 = source[sourceOffset + 4];
            const v0 = source[sourceOffset + 5];
            const u1 = source[sourceOffset + 6];
            const v1 = source[sourceOffset + 7];
            const red = source[sourceOffset + 8];
            const green = source[sourceOffset + 9];
            const blue = source[sourceOffset + 10];
            const alpha = source[sourceOffset + 11];

            writeVertex(vertices[vertexOffset], x - halfWidth, y - halfHeight,
                u0, v1, red, green, blue, alpha);
            writeVertex(vertices[vertexOffset + 1], x + halfWidth, y - halfHeight,
                u1, v1, red, green, blue, alpha);
            writeVertex(vertices[vertexOffset + 2], x - halfWidth, y + halfHeight,
                u0, v0, red, green, blue, alpha);
            writeVertex(vertices[vertexOffset + 3], x + halfWidth, y + halfHeight,
                u1, v0, red, green, blue, alpha);
        }

        renderData.vertDirty = true;
        renderData.updateRenderData(batch, texture);
    },

    fillBuffers (component: UIRenderer): void {
        const renderData = component.renderData;
        if (!renderData) return;

        const chunk = renderData.chunk;
        const vertexBuffer = chunk.vb;
        const vertices = renderData.data;
        const stride = renderData.floatStride;
        for (let i = 0; i < vertices.length; i++) {
            const offset = i * stride;
            const vertex = vertices[i];
            vertexBuffer[offset] = vertex.x;
            vertexBuffer[offset + 1] = vertex.y;
            vertexBuffer[offset + 2] = 0;
            vertexBuffer[offset + 3] = vertex.u;
            vertexBuffer[offset + 4] = vertex.v;
            Color.toArray(vertexBuffer, vertex.color, offset + 5);
        }

        const meshBuffer = chunk.meshBuffer;
        const indexBuffer = meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        const firstVertex = chunk.vertexOffset;
        const count = renderData.vertexCount / VERTICES_PER_GLYPH;
        for (let i = 0; i < count; i++) {
            const vertex = firstVertex + i * VERTICES_PER_GLYPH;
            indexBuffer[indexOffset++] = vertex;
            indexBuffer[indexOffset++] = vertex + 1;
            indexBuffer[indexOffset++] = vertex + 2;
            indexBuffer[indexOffset++] = vertex + 1;
            indexBuffer[indexOffset++] = vertex + 3;
            indexBuffer[indexOffset++] = vertex + 2;
        }

        meshBuffer.indexOffset += renderData.indexCount;
        meshBuffer.setDirty();
        renderData.vertDirty = false;
    },
};

function writeVertex (
    vertex: RenderData['data'][number],
    x: number,
    y: number,
    u: number,
    v: number,
    red: number,
    green: number,
    blue: number,
    alpha: number,
): void {
    vertex.x = x;
    vertex.y = y;
    vertex.z = 0;
    vertex.u = u;
    vertex.v = v;
    vertex.color.set(red, green, blue, alpha);
}
