import { _decorator, Component, UITransform } from 'cc';
import { MonsterBatchRenderer } from './MonsterBatchRenderer';

const { ccclass, executeInEditMode, property, requireComponent } = _decorator;

@ccclass('MonsterBatchPreview')
@executeInEditMode
@requireComponent(MonsterBatchRenderer)
export class MonsterBatchPreview extends Component {
    @property({ min: 1, max: 1000, step: 1 })
    public count = 1000;

    protected start (): void {
        const batch = this.getComponent(MonsterBatchRenderer)!;
        const area = this.getComponent(UITransform)!;
        const columns = 40;
        const rows = Math.ceil(this.count / columns);
        const stepX = area.width / columns;
        const stepY = area.height / rows;
        const size = Math.min(stepX, stepY) * 1.15;

        batch.setCount(this.count);
        for (let i = 0; i < this.count; i++) {
            const column = i % columns;
            const row = Math.floor(i / columns);
            const hash = Math.imul(i + 1, 0x45d9f3b) >>> 0;
            const jitterX = ((hash & 255) / 255 - 0.5) * stepX * 0.35;
            const jitterY = (((hash >>> 8) & 255) / 255 - 0.5) * stepY * 0.35;
            const x = -area.width * 0.5 + (column + 0.5) * stepX + jitterX;
            const y = -area.height * 0.5 + (row + 0.5) * stepY + jitterY;

            batch.setMonster(i, x, y, size, size, i & 3, (hash & 0x10000) !== 0);
        }
        batch.commit();
    }
}
