export type CharmId = 'wind' | 'satchel' | 'echo';
export type PotionId = 'storm' | 'frost' | 'healing' | 'earth-rift' | 'rain';

export const CHARMS: readonly { id: CharmId; name: string; price: number; description: string; flavor: string }[] = [
    { id: 'wind', name: '逐风灵契', price: 60, description: '移动速度 +12%', flavor: '踏风而行，进退自如。' },
    { id: 'satchel', name: '藏露灵契', price: 80, description: '药水栏位 2 → 3', flavor: '多藏一瓶，便多一分从容。' },
    { id: 'echo', name: '回响灵契', price: 100, description: '常驻技能冷却 -10%', flavor: '灵息回转，余音不绝。' },
];

export const POTIONS: Readonly<Record<PotionId, { name: string; description: string; color: readonly number[] }>> = {
    storm: { name: '风涡灵露', description: '前方召出持续5秒的龙卷风，聚拢普通怪并持续造成伤害。Boss不受牵引，同屏最多一个。', color: [128, 238, 207] },
    frost: { name: '凝霜灵露', description: '冻结周围普通怪1.5秒，再减速45%持续2秒；精英仅减速，Boss免控。', color: [140, 207, 255] },
    healing: { name: '回春灵露', description: '立即恢复最大生命的30%。生命已满时无法使用，可以丢弃腾出栏位。', color: [255, 156, 176] },
    'earth-rift': { name: '地裂灵露', description: '自动瞄准附近怪群，撕开长2000、宽480的巨型地裂；无目标时沿角色朝向释放。0.48秒后秒杀范围内怪物（含精英与Boss）。同屏最多一道，残留裂缝不再造成伤害。', color: [255, 183, 83] },
    rain: { name: '唤雨灵露', description: '唤来持续6秒的全屏暴雨，每0.5秒对视野内敌人造成150%攻击伤害。雨幕随视野移动，可边走边打；精英与Boss同样受伤，同屏最多一场雨。', color: [65, 170, 235] },
};
export const POTION_IDS: readonly PotionId[] = ['storm', 'frost', 'healing', 'earth-rift', 'rain'];
export const POTION_USE_GAP = 1;

/** One bottle per slot. Ground pickups never replace a held bottle. */
export class PotionInventory {
    public readonly slots: (PotionId | null)[];
    public revision = 0;
    public constructor (extraSlot = false) { this.slots = Array(extraSlot ? 3 : 2).fill(null); }
    public get hasSpace (): boolean { return this.slots.includes(null); }
    public pickup (id: PotionId): boolean {
        if (!POTION_IDS.includes(id)) return false;
        const index = this.slots.indexOf(null);
        if (index < 0) return false;
        this.slots[index] = id;
        this.revision++;
        return true;
    }
    public remove (index: number): PotionId | null {
        if (!Number.isInteger(index) || index < 0 || index >= this.slots.length) return null;
        const id = this.slots[index];
        if (id) { this.slots[index] = null; this.revision++; }
        return id;
    }
}
