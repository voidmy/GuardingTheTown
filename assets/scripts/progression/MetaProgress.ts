import { sys } from 'cc';
import { CHARMS, CharmId } from './ExpeditionDefinitions';

interface Profile { version: 1; sand: number; owned: CharmId[]; equipped: CharmId | null; }
const STORAGE_KEY = 'guarding-town:expedition:v1';
const MAX_SAND = 99999999;

/** Purchases persist balance and ownership together before publishing the change. */
export class MetaProgress {
    private static _instance: MetaProgress | null = null;
    public static get instance (): MetaProgress { return this._instance ??= new MetaProgress(); }
    private _profile: Profile = { version: 1, sand: 0, owned: [], equipped: null };
    public error = '';

    private constructor () {
        try {
            const raw = sys.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data?.version !== 1) { this.error = '存档版本无法读取，请保留当前存档。'; return; }
            const owned = CHARMS.filter(charm => Array.isArray(data.owned) && data.owned.includes(charm.id)).map(charm => charm.id);
            this._profile = { version: 1, sand: Number.isFinite(data.sand) ? Math.min(MAX_SAND, Math.max(0, Math.floor(data.sand))) : 0,
                owned, equipped: owned.includes(data.equipped) ? data.equipped : null };
        } catch { this.error = '存档暂时无法读取，购买与梦砂入账已暂停。'; }
    }
    public get sand (): number { return this._profile.sand; }
    public get equipped (): CharmId | null { return this._profile.equipped; }
    public owns (id: CharmId): boolean { return this._profile.owned.includes(id); }
    public purchase (id: CharmId): string {
        const charm = CHARMS.find(value => value.id === id);
        if (!charm) return '灵契不存在。';
        if (this.owns(id)) return '已永久解锁，无需重复购买。';
        if (this.sand < charm.price) return `还需要 ${charm.price - this.sand} 梦砂。`;
        return this.save({ ...this._profile, sand: this.sand - charm.price, owned: [...this._profile.owned, id] })
            ? `已解锁${charm.name}，点击携带即可装备。` : this.error;
    }
    public equip (id: CharmId | null): boolean {
        if (id !== null && !this.owns(id)) return false;
        return this.save({ ...this._profile, equipped: id });
    }
    public addSand (amount: number): boolean {
        if (!Number.isSafeInteger(amount) || amount <= 0) return false;
        return this.save({ ...this._profile, sand: Math.min(MAX_SAND, this.sand + amount) });
    }
    private save (next: Profile): boolean {
        if (this.error) return false;
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            this._profile = next;
            return true;
        } catch { this.error = '存档写入失败，本次操作未扣款、未入账。'; return false; }
    }
}
