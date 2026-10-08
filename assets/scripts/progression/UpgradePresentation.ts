import type { GameSkill } from '../GameSettings';
import type { UpgradeEffect } from './RunProgression';

export type UpgradeRarity = 'common' | 'rare' | 'legendary';

export interface UpgradePresentation {
    rarity?: UpgradeRarity;
    skill?: GameSkill;
    level?: number;
    damageRank?: number;
    category?: string;
}

/** Visual tiers describe the existing reward; they do not change rolls or combat values. */
export function describeUpgrade (effect: UpgradeEffect): UpgradePresentation {
    switch (effect.type) {
    case 'evolution': return { rarity: 'legendary', skill: effect.skill, category: '终极进化', level: 5 };
    case 'core': return { rarity: 'rare', category: '流派核心' };
    case 'learn': return { rarity: 'rare', skill: effect.skill, category: '领悟新技能', level: 1 };
    case 'skill-level': return {
        rarity: effect.level === 3 || effect.level === 5 ? 'rare' : 'common',
        skill: effect.skill, level: effect.level,
        category: effect.level === 5 ? '满级突破' : effect.level === 3 ? '关键强化' : '技能强化',
    };
    case 'skill-damage': return { rarity: 'common', skill: effect.skill, damageRank: effect.damageRank, category: '技能伤害' };
    case 'damage': return { rarity: 'common', category: '攻击力强化' };
    case 'maximum-health': return { rarity: 'common', category: '体魄强化' };
    case 'heal': return { rarity: 'common', category: '应急恢复' };
    default: return { rarity: 'common', category: '继续战斗' };
    }
}
