import { Color, RenderData, UIRenderer } from 'cc';
import type { IAssembler } from 'cc';
import type { MonsterBatchRenderer } from './MonsterBatchRenderer';

const VERTICES_PER_MONSTER = 4;
const INDICES_PER_MONSTER = 6;
const DATA_STRIDE = 7;

function createIndices (count: number): Uint16Array {
    const indices = new Uint16Array(count * INDICES_PER_MONSTER);
    for (let i = 0; i < count; i++) {
        const vertex = i * VERTICES_PER_MONSTER;
        const offset = i * INDICES_PER_MONSTER;
        indices.set([
            vertex, vertex + 1, vertex + 2,
            vertex + 1, vertex + 3, vertex + 2,
        ], offset);
    }
    return indices;
}

export const monsterBatchAssembler: IAssembler = {
    createData (component: UIRenderer): RenderData {
        return component.requestRenderData();
    },

    updateRenderData (component: UIRenderer): void {
        const batch = component as MonsterBatchRenderer;
        const renderData = batch.renderData;
        const texture = batch.texture;
        if (!renderData || !texture) return;

        const count = batch.count;
        const vertexCount = count * VERTICES_PER_MONSTER;
        const indexCount = count * INDICES_PER_MONSTER;

        if (renderData.vertexCount !== vertexCount) {
            renderData.dataLength = vertexCount;
            renderData.resize(vertexCount, indexCount);
            renderData.chunk.setIndexBuffer(createIndices(count));
        }

        const source = batch.displayData;
        const vertices = renderData.data;
        for (let i = 0; i < count; i++) {
            const sourceOffset = i * DATA_STRIDE;
            const vertexOffset = i * VERTICES_PER_MONSTER;
            const x = source[sourceOffset];
            const y = source[sourceOffset + 1];
            const halfWidth = source[sourceOffset + 2] * 0.5;
            const halfHeight = source[sourceOffset + 3] * 0.5;
            const phase = Math.min(255, source[sourceOffset + 4]);
            const flip = source[sourceOffset + 5] > 0 ? 255 : 0;
            const hitFlash = Math.round(source[sourceOffset + 6] * 255);

            writeVertex(
                vertices[vertexOffset],
                x - halfWidth,
                y - halfHeight,
                0,
                1,
                phase,
                flip,
                hitFlash,
            );
            writeVertex(
                vertices[vertexOffset + 1],
                x + halfWidth,
                y - halfHeight,
                1,
                1,
                phase,
                flip,
                hitFlash,
            );
            writeVertex(
                vertices[vertexOffset + 2],
                x - halfWidth,
                y + halfHeight,
                0,
                0,
                phase,
                flip,
                hitFlash,
            );
            writeVertex(
                vertices[vertexOffset + 3],
                x + halfWidth,
                y + halfHeight,
                1,
                0,
                phase,
                flip,
                hitFlash,
            );
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
        const count = renderData.vertexCount / VERTICES_PER_MONSTER;

        for (let i = 0; i < count; i++) {
            const vertex = firstVertex + i * VERTICES_PER_MONSTER;
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
    phase: number,
    flip: number,
    hitFlash: number,
): void {
    vertex.x = x;
    vertex.y = y;
    vertex.z = 0;
    vertex.u = u;
    vertex.v = v;
    vertex.color.set(phase, flip, hitFlash, 255);
}
