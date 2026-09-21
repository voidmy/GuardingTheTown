import { GameSkill } from '../GameSettings';

export type CoreId = 'formation' | 'focus' | 'blade_guard' | 'wind_eye'
    | 'kill_reserve' | 'steady_guard';

export const ALL_SKILLS: readonly GameSkill[] = [
    GameSkill.BasicAttack, GameSkill.PiercingArrow, GameSkill.QiBlade, GameSkill.Tornado,
    GameSkill.Thunder, GameSkill.ChainLightning, GameSkill.FrostPulse, GameSkill.SwordQi,
];

export const SKILL_NAMES: Record<GameSkill, string> = {
    [GameSkill.BasicAttack]: '基础射击',
    [GameSkill.PiercingArrow]: '穿透箭',
    [GameSkill.QiBlade]: '气刃环',
    [GameSkill.Tornado]: '小旋风',
    [GameSkill.Thunder]: '自动落雷',
    [GameSkill.ChainLightning]: '连锁闪电',
    [GameSkill.FrostPulse]: '寒霜脉冲',
    [GameSkill.SwordQi]: '刀气起',
};

export const SKILL_TAGS: Record<GameSkill, readonly string[]> = {
    [GameSkill.BasicAttack]: ['projectile', 'single', 'burst'],
    [GameSkill.PiercingArrow]: ['projectile', 'area'],
    [GameSkill.QiBlade]: ['melee', 'survival', 'area'],
    [GameSkill.Tornado]: ['control', 'synergy', 'area'],
    [GameSkill.Thunder]: ['single', 'burst', 'area'],
    [GameSkill.ChainLightning]: ['area', 'burst'],
    [GameSkill.FrostPulse]: ['control', 'survival', 'area'],
    [GameSkill.SwordQi]: ['projectile', 'area', 'burst'],
};

export const SKILL_LEVEL_DESCRIPTIONS: Record<GameSkill, readonly string[]> = {
    [GameSkill.SwordQi]: [
        '', '每3秒挥出两道相反刀气，间隔0.22秒、向前飞行360，沿途群伤且每刀对同一敌人命中一次。首刀伤害2；回斩伤害+35%、范围+20%。',
        '释放间隔：3秒 → 2.6秒；首刀基础伤害：2 → 2.6。',
        '获得20%概率双重打击：本轮第二刀之后立即追加一轮双斩，不等待冷却；追加不会再次触发。首刀半径：170 → 205。',
        '释放间隔：2.6秒 → 2.2秒；双重打击概率：20% → 30%；首刀基础伤害：2.6 → 3.4。',
        '释放间隔：2.2秒 → 1.8秒；双重打击概率：30% → 40%；首刀基础伤害：3.4 → 4.2。',
    ],
    [GameSkill.Thunder]: [
        '', '每4秒自动落雷，优先精英与Boss；预警0.3秒后对小范围造成6点基础伤害。',
        '落雷基础伤害：6 → 7.5。', '落雷半径：90 → 115。',
        '落雷基础伤害：7.5 → 10。', '落雷基础伤害：10 → 12；间隔：4秒 → 3.2秒。',
    ],
    [GameSkill.ChainLightning]: [
        '', '每2.5秒自动释放闪电，最多连接3个不同敌人，每个目标受到2点基础伤害。',
        '每个目标的基础伤害：2 → 2.5。', '最多连接目标：3 → 4。',
        '每个目标的基础伤害：2.5 → 3.2。', '基础伤害：3.2 → 3.8；间隔：2.5秒 → 2秒。',
    ],
    [GameSkill.FrostPulse]: [
        '', '有怪靠近时自动释放，冷却6秒。造成1点基础伤害，普通怪冻结0.65秒后减速45%持续1.5秒；精英减速减半，Boss免控。',
        '脉冲基础伤害：1 → 1.4。', '作用半径：240 → 280。',
        '基础伤害：1.4 → 1.8；减速持续：1.5秒 → 2秒。',
        '基础伤害：1.8 → 2.2；冷却：6秒 → 5秒。',
    ],
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
        '气刃数量：1 → 2；环绕距离增加；单目标每周期伤害保持不变。',
        '气刃数量：2 → 3；环绕距离增加；单次伤害提高至基础伤害的 115%。',
        '环绕距离增加；单次伤害：基础伤害的 115% → 140%。',
        '环绕距离增加；单次伤害提高至基础伤害的 160%；伤害周期间隔降至基础的 90%。',
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
    [GameSkill.SwordQi]: { name: '惊鸿双斩', description: '双重打击概率40% → 60%；刀气飞行360 → 440，首刀半径205 → 235，伤害再提高35%。追加双斩不连锁，消耗本局唯一进化资格。' },
    [GameSkill.Thunder]: { name: '双重天雷', description: '保留满级落雷，在首次命中0.3秒后原地追加60%伤害的余雷。替换原槽，消耗本局唯一进化资格。' },
    [GameSkill.ChainLightning]: { name: '雷霆连锁', description: '最多连接5个不同敌人，跳跃距离200 → 250；每个目标基础伤害3.8。替换原槽，消耗本局唯一进化资格。' },
    [GameSkill.FrostPulse]: { name: '极寒领域', description: '半径280 → 320，普通怪冻结0.65秒 → 1秒；保留2秒减速与5秒冷却。替换原槽，消耗本局唯一进化资格。' },
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
