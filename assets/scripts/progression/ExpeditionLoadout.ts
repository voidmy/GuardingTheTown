import { sys } from 'cc';
import { GameSkill } from '../GameSettings';
import { CharmId, PotionId } from './ExpeditionDefinitions';

export interface ExpeditionLoadout {
    skill: GameSkill;
    charm: CharmId | null;
    potions: readonly (PotionId | null)[];
}

const STORAGE_KEY = 'guarding-town:loadout:v1';

/** Departure preferences are separate from the currency and unlock save. */
export class ExpeditionLoadoutPreferences {
    public skill: GameSkill | null = null;
    public potions: (PotionId | null)[] = [null, null, null];
    public notice = '';

    public constructor (skills: readonly GameSkill[], potions: readonly PotionId[]) {
        try {
            const raw = sys.localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data?.version !== 1) {
                this.notice = '启程配置版本已变化，请重新选择本局携带。';
                return;
            }
            this.skill = skills.includes(data.skill) ? data.skill : null;
            this.potions = [0, 1, 2].map(index => {
                const id = Array.isArray(data.potions) ? data.potions[index] : null;
                return potions.includes(id) ? id : null;
            });
        } catch {
            this.notice = '上次启程配置未能读取，请重新选择；梦砂和灵契存档不受影响。';
        }
    }

    public save (): void {
        try {
            sys.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: 1, skill: this.skill, potions: this.potions,
            }));
            this.notice = '';
        } catch {
            this.notice = '本次选择可正常出发，但暂时无法记住配置。';
        }
    }
}
