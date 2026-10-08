import { GameSkill } from '../GameSettings';
import {
    formatBaseDamage, BASIC_ATTACK_DAMAGE, PIERCING_ARROW_DAMAGE, QI_BLADE_DAMAGE,
    TORNADO_DAMAGE, SWORD_QI_DAMAGE, THUNDER_DAMAGE, THUNDER_SPLASH_RATIO,
    CHAIN_LIGHTNING_DAMAGE, FROST_PULSE_DAMAGE, SkillDamageProfile,
} from '../combat/CombatNumbers';

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
    [GameSkill.BasicAttack]: ['projectile', 'area', 'burst'],
    [GameSkill.PiercingArrow]: ['projectile', 'area'],
    [GameSkill.QiBlade]: ['melee', 'survival', 'area'],
    [GameSkill.Tornado]: ['control', 'synergy', 'area'],
    [GameSkill.Thunder]: ['single', 'burst', 'area'],
    [GameSkill.ChainLightning]: ['area', 'burst'],
    [GameSkill.FrostPulse]: ['control', 'survival', 'area'],
    [GameSkill.SwordQi]: ['projectile', 'area', 'burst'],
};

export const SKILL_DAMAGE_PROFILES: Record<GameSkill, SkillDamageProfile> = {
    [GameSkill.BasicAttack]: BASIC_ATTACK_DAMAGE,
    [GameSkill.PiercingArrow]: PIERCING_ARROW_DAMAGE,
    [GameSkill.QiBlade]: QI_BLADE_DAMAGE,
    [GameSkill.Tornado]: TORNADO_DAMAGE,
    [GameSkill.SwordQi]: SWORD_QI_DAMAGE,
    [GameSkill.Thunder]: THUNDER_DAMAGE,
    [GameSkill.ChainLightning]: CHAIN_LIGHTNING_DAMAGE,
    [GameSkill.FrostPulse]: FROST_PULSE_DAMAGE,
};

/** Level cards change mechanics only. Damage ranks are separate ordinary choices. */
export const SKILL_LEVEL_DESCRIPTIONS: Record<GameSkill, readonly string[]> = {
    [GameSkill.BasicAttack]: [
        '', `每1.5秒自动瞄准发射1颗子弹，初始单弹伤害${formatBaseDamage(BASIC_ATTACK_DAMAGE)}（含20攻击力）；命中即消失。`,
        '每轮弹数：1 → 2颗，同时扇形发射；单弹伤害不变。',
        '每轮弹数：2 → 3颗，同时扇形发射；单弹伤害不变。',
        '每轮弹数：3 → 4颗，同时扇形发射；单弹伤害不变。',
        '每轮弹数：4 → 5颗，同时扇形发射；单弹伤害与1.5秒间隔不变。',
    ],
    [GameSkill.PiercingArrow]: [
        '', `每秒自动瞄准发射穿透箭，贯穿沿途敌人，初始每目标伤害${formatBaseDamage(PIERCING_ARROW_DAMAGE)}（含20攻击力）；无目标时沿角色朝向发射。`,
        '轮次间隔：1秒 → 0.9秒；每个目标伤害不变。',
        '保留中心路线，增加1条交替侧路；同轮对同一敌人只结算一次，单次伤害不变。',
        '轮次间隔：0.9秒 → 0.8秒；每个目标伤害不变。',
        '轮次间隔：0.8秒 → 0.7秒；每个目标伤害不变。',
    ],
    [GameSkill.QiBlade]: [
        '', `召唤1把环绕气刃，初始接触伤害${formatBaseDamage(QI_BLADE_DAMAGE)}（含20攻击力）；每0.2秒对同一敌人最多结算一次。`,
        '气刃数量：1 → 2；环绕距离增加；单次伤害不变。',
        '气刃数量：2 → 3；环绕距离增加；单次伤害不变。',
        '气刃数量：3 → 4；环绕距离增加；单次伤害不变。',
        '气刃数量：4 → 5；环绕距离增加；单次伤害与0.2秒周期不变。',
    ],
    [GameSkill.SwordQi]: [
        '', `每5秒挥出两道相反刀气，间隔0.22秒、向前飞行360，每刀对同一敌人命中一次。初始首刀伤害${formatBaseDamage(SWORD_QI_DAMAGE)}（含20攻击力）；回斩伤害+35%、范围+20%。`,
        '释放间隔：5秒 → 4.5秒；每刀伤害不变。',
        '获得20%概率双重打击：第二刀之后追加一轮双斩，不会再次触发；首刀半径170 → 205，每刀伤害不变。',
        '释放间隔：4.5秒 → 4秒；双重打击概率：20% → 30%；每刀伤害不变。',
        '释放间隔：4秒 → 3.5秒；双重打击概率：30% → 40%；每刀伤害不变。',
    ],
    [GameSkill.Thunder]: [
        '', `每4秒落雷，优先精英与Boss；预警0.3秒后原目标在落点内受到初始${formatBaseDamage(THUNDER_DAMAGE)}伤害（含20攻击力），周围受${THUNDER_SPLASH_RATIO * 100}%溅射。`,
        '溅射半径：90 → 105；主目标与溅射的单次伤害不变。',
        '溅射半径：105 → 120；主目标与溅射的单次伤害不变。',
        '溅射半径：120 → 135；主目标与溅射的单次伤害不变。',
        '溅射半径：135 → 150；释放间隔：4秒 → 3.2秒；单次伤害不变。',
    ],
    [GameSkill.ChainLightning]: [
        '', `每2.5秒释放群攻闪电，最多连接3个不同敌人，初始每目标伤害${formatBaseDamage(CHAIN_LIGHTNING_DAMAGE)}（含20攻击力）。`,
        '跳跃距离：200 → 225；每个目标伤害不变。',
        '最多连接目标：3 → 4；每个目标伤害不变。',
        '跳跃距离：225 → 250；每个目标伤害不变。',
        '释放间隔：2.5秒 → 2秒；每个目标伤害不变。',
    ],
    [GameSkill.FrostPulse]: [
        '', `有怪靠近时自动释放，冷却6秒。初始伤害${formatBaseDamage(FROST_PULSE_DAMAGE)}（含20攻击力）；普通怪冻结0.65秒后减速45%持续1.5秒，精英减速减半，Boss免控。`,
        '普通怪冻结：0.65秒 → 0.8秒；单次伤害不变。',
        '作用半径：240 → 280；单次伤害不变。',
        '减速持续：1.5秒 → 2秒；单次伤害不变。',
        '冷却：6秒 → 5秒；单次伤害不变。',
    ],
    [GameSkill.Tornado]: [
        '', `5秒后召唤小旋风，持续3秒，结束后冷却5秒；中心每0.5秒初始伤害${formatBaseDamage(TORNADO_DAMAGE)}（含20攻击力）。`,
        '牵引速度提高至基础的115%；每跳伤害不变。',
        '牵引半径扩大至基础的120%；中心伤害半径与每跳伤害不变。',
        '牵引速度提高至基础的130%；每跳伤害不变。',
        '结束后的冷却：5秒 → 4秒；每跳伤害不变。',
    ],
};

export const EVOLUTIONS: Record<GameSkill, { name: string; description: string }> = {
    [GameSkill.BasicAttack]: { name: '疾风散弹', description: '每轮弹数：5 → 6颗，同时发射；单弹伤害与1.5秒间隔不变，命中即消失。消耗本局唯一进化资格。' },
    [GameSkill.PiercingArrow]: { name: '交叉箭阵', description: '朝正前方及左右各30度发射3路箭阵；同轮对同一敌人只结算一次，单次伤害不变。消耗本局唯一进化资格。' },
    [GameSkill.QiBlade]: { name: '护身刃阵', description: '气刃数量：5 → 6；同周期对同一敌人只结算一次，单次伤害不变。消耗本局唯一进化资格。' },
    [GameSkill.SwordQi]: { name: '惊鸿双斩', description: '双重打击概率40% → 60%；刀气飞行360 → 440，首刀半径205 → 235，每刀伤害不变。追加双斩不连锁，消耗本局唯一进化资格。' },
    [GameSkill.Thunder]: { name: '双重天雷', description: `首次落雷0.3秒后原地追加60%伤害余雷；主雷伤害不变，完整伤害仍仅给原目标，周围受${THUNDER_SPLASH_RATIO * 100}%溅射。消耗本局唯一进化资格。` },
    [GameSkill.ChainLightning]: { name: '雷霆连锁', description: '最多连接4 → 5个不同敌人，跳跃距离250 → 300；每目标伤害不变。消耗本局唯一进化资格。' },
    [GameSkill.FrostPulse]: { name: '极寒领域', description: '半径280 → 320，普通怪冻结0.8秒 → 1秒；单次伤害不变，保留2秒减速与5秒冷却。消耗本局唯一进化资格。' },
    [GameSkill.Tornado]: { name: '聚流龙卷', description: '持续3 → 4秒，结束后冷却4秒；牵引半径为基础的140%，每跳伤害不变。消耗本局唯一进化资格。' },
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
        requiredSkills: [GameSkill.PiercingArrow], excludes: 'focus',
        description: '仅强化穿透箭，保留原穿透；首目标伤害 ×0.85、后续目标 ×1.10。散弹始终不穿透；与专注猎杀互斥。',
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
