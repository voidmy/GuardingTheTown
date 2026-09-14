import { GameSkill } from '../GameSettings';

export type CoreId = 'formation' | 'focus' | 'blade_guard' | 'wind_eye'
    | 'kill_reserve' | 'steady_guard';

export const ALL_SKILLS: readonly GameSkill[] = [
    GameSkill.BasicAttack, GameSkill.PiercingArrow, GameSkill.QiBlade, GameSkill.Tornado,
];

export const SKILL_NAMES: Record<GameSkill, string> = {
    [GameSkill.BasicAttack]: '基础射击',
    [GameSkill.PiercingArrow]: '穿透箭',
    [GameSkill.QiBlade]: '气刃环',
    [GameSkill.Tornado]: '小旋风',
};

export const SKILL_TAGS: Record<GameSkill, readonly string[]> = {
    [GameSkill.BasicAttack]: ['projectile', 'single', 'burst'],
    [GameSkill.PiercingArrow]: ['projectile', 'area'],
    [GameSkill.QiBlade]: ['melee', 'survival', 'area'],
    [GameSkill.Tornado]: ['control', 'synergy', 'area'],
};

export const SKILL_LEVEL_DESCRIPTIONS: Record<GameSkill, readonly string[]> = {
    [GameSkill.BasicAttack]: [
        '', '自动瞄准射程内目标，每轮发射 1 弹。',
        '单弹伤害：基础伤害的 100% → 120%。',
        '每轮连续 2 弹，每弹为基础伤害的 75%；同目标全中合计 150%。',
        '每轮连续 2 弹，单弹伤害：基础伤害的 75% → 90%。',
        '每轮连续 2 弹，单弹伤害提高至基础伤害的 100%；轮次间隔降至基础的 90%。',
    ],
    [GameSkill.PiercingArrow]: [
        '', '沿角色朝向发射穿透箭，可贯穿多个不同敌人。',
        '单目标伤害：基础伤害的 100% → 120%。',
        '保留中心路线，增加 1 条交替侧路；同轮对同一敌人只结算一次主伤害。',
        '每路伤害：基础伤害的 120% → 145%。',
        '每路伤害提高至基础伤害的 165%；轮次间隔降至基础的 90%。',
    ],
    [GameSkill.QiBlade]: [
        '', '召唤 1 把环绕气刃；同一伤害周期对同一敌人只结算一次。',
        '气刃数量：1 → 2，扩大近身覆盖；单目标每周期伤害保持不变。',
        '气刃数量：2 → 3；单次伤害提高至基础伤害的 115%。',
        '单次伤害：基础伤害的 115% → 140%。',
        '单次伤害提高至基础伤害的 160%；伤害周期间隔降至基础的 90%。',
    ],
    [GameSkill.Tornado]: [
        '', '5 秒后召唤小旋风，持续 3 秒，结束后冷却 5 秒；中心区域造成伤害。',
        '牵引速度与中心伤害均提高至基础的 115%。',
        '牵引半径扩大至基础的 120%；中心伤害半径保持不变。',
        '中心伤害提高至基础的 140%；牵引速度提高至基础的 130%。',
        '中心伤害提高至基础的 160%；结束后的冷却：5 秒 → 4 秒。',
    ],
};

export const EVOLUTIONS: Record<GameSkill, { name: string; description: string }> = {
    [GameSkill.BasicAttack]: {
        name: '疾风连射',
        description: '每轮连续 3 弹，每弹为基础伤害的 85%，轮次间隔为基础的 90%。消耗本局唯一进化资格。',
    },
    [GameSkill.PiercingArrow]: {
        name: '交叉箭阵',
        description: '朝正前方及左右各 30 度发射 3 路箭阵，每路为基础伤害的 190%；同轮对同一敌人只结算一次。消耗本局唯一进化资格。',
    },
    [GameSkill.QiBlade]: {
        name: '护身刃阵',
        description: '形成 6 把环绕气刃，单次伤害为基础的 185%；同周期对同一敌人只结算一次。消耗本局唯一进化资格。',
    },
    [GameSkill.Tornado]: {
        name: '聚流龙卷',
        description: '持续 4 秒、结束后冷却 4 秒；牵引半径为基础的 140%，中心伤害为 190%。消耗本局唯一进化资格。',
    },
};

export interface CoreDefinition {
    id: CoreId;
    name: string;
    description: string;
    tags: readonly string[];
    direction: string;
    requiredSkills: readonly GameSkill[];
    excludes?: CoreId;
}

export const CORE_DEFINITIONS: readonly CoreDefinition[] = [
    {
        id: 'formation', name: '破阵', direction: 'area', tags: ['area', 'projectile'],
        requiredSkills: [GameSkill.BasicAttack, GameSkill.PiercingArrow], excludes: 'focus',
        description: '射击最多命中 3 个不同敌人，穿透箭保留原穿透。弹道首目标伤害 ×0.85、后续目标 ×1.10；与专注猎杀互斥。',
    },
    {
        id: 'focus', name: '专注猎杀', direction: 'single', tags: ['single', 'projectile'],
        requiredSkills: [GameSkill.BasicAttack, GameSkill.PiercingArrow], excludes: 'formation',
        description: '弹道优先锁定精英和 Boss；连续有效主攻击命中后，后续对锁定目标的弹道伤害每层 +5%，最多 +30%。失去目标或长期未命中清空；与破阵互斥。',
    },
    {
        id: 'blade_guard', name: '护体气刃', direction: 'survival', tags: ['melee', 'survival'],
        requiredSkills: [GameSkill.QiBlade],
        description: '气刃有效命中获得最大生命 3% 的护盾，整个核心间隔 1 秒；自身护盾贡献上限 15%，共享总上限 25%。',
    },
    {
        id: 'wind_eye', name: '风眼暴露', direction: 'control', tags: ['control', 'synergy'],
        requiredSkills: [GameSkill.Tornado],
        description: '风眼中心敌人受到其他技能伤害 +15%，Boss 为 +7.5%；小旋风自身伤害 ×0.8。仅在中心区域生效。',
    },
    {
        id: 'kill_reserve', name: '余势', direction: 'burst', tags: ['area', 'burst'],
        requiredSkills: [],
        description: '每击杀 8 只真实敌人储存 1 次余势，下一次对精英或 Boss 的有效主伤害翻倍。最多储存 1 次，只增强一个目标的一次伤害。',
    },
    {
        id: 'steady_guard', name: '稳守', direction: 'survival', tags: ['survival'],
        requiredSkills: [],
        description: '连续 5 秒未受敌对有效伤害获得最大生命 10% 的护盾；护盾受击也重置计时。自身贡献上限 20%，共享总上限 25%。',
    },
];

export const CORE_IDS: readonly CoreId[] = CORE_DEFINITIONS.map((core) => core.id);
