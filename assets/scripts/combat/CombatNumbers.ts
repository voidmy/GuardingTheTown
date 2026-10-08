/** Actual combat units. Counts, experience, prices, time and percentages are not scaled. */
export const COMBAT_UNIT = 20;
export const BASE_ATTACK_POWER = COMBAT_UNIT;
export const BASE_PLAYER_HEALTH = 100 * COMBAT_UNIT;
export const BASE_CONTACT_DAMAGE = 5 * COMBAT_UNIT;

/** Intrinsic damage and attack contribution are independent of skill level/evolution. */
export interface SkillDamageProfile { readonly base: number; readonly attackRatio: number; }
export const MAX_SKILL_DAMAGE_RANK = 3;
export const SKILL_DAMAGE_BONUS_PER_RANK = 1;
export const ATTACK_BONUS_PER_RANK = 0.2;
export const BASIC_ATTACK_DAMAGE: SkillDamageProfile = { base: 25, attackRatio: 1.25 };
export const PIERCING_ARROW_DAMAGE: SkillDamageProfile = { base: 7, attackRatio: 0.35 };
export const QI_BLADE_DAMAGE: SkillDamageProfile = { base: 1.5, attackRatio: 0.075 };
export const TORNADO_DAMAGE: SkillDamageProfile = { base: 3, attackRatio: 0.15 };
export const SWORD_QI_DAMAGE: SkillDamageProfile = { base: 10, attackRatio: 0.5 };
export const THUNDER_DAMAGE: SkillDamageProfile = { base: 60, attackRatio: 3 };
export const THUNDER_SPLASH_RATIO = 0.15;
export const CHAIN_LIGHTNING_DAMAGE: SkillDamageProfile = { base: 12, attackRatio: 0.6 };
export const FROST_PULSE_DAMAGE: SkillDamageProfile = { base: 4, attackRatio: 0.2 };

export function getSkillIntrinsicDamage (profile: SkillDamageProfile, damageRank = 0): number {
    return profile.base * (1 + Math.max(0, Math.min(MAX_SKILL_DAMAGE_RANK, damageRank | 0))
        * SKILL_DAMAGE_BONUS_PER_RANK);
}

/** Called once per attack/tick, never per target. Core modifiers are applied on impact. */
export function calculateSkillDamage (profile: SkillDamageProfile, attackPower: number, damageRank = 0): number {
    return getSkillIntrinsicDamage(profile, damageRank)
        + Math.max(0, Number.isFinite(attackPower) ? attackPower : 0) * profile.attackRatio;
}

const UNITS = ['', 'K', 'M', 'B', 'T'];

/** Up to two decimals, no trailing zeroes; rounding can promote to the next unit. */
export function formatCombatNumber (value: number): string {
    if (!Number.isFinite(value)) return '0';
    const negative = value < 0;
    let amount = Math.abs(value);
    let unit = 0;
    while (amount >= 1000 && unit < UNITS.length - 1) {
        amount /= 1000;
        unit++;
    }
    amount = Math.round((amount + Number.EPSILON) * 100) / 100;
    if (amount >= 1000 && unit < UNITS.length - 1) {
        amount /= 1000;
        unit++;
    }
    return (negative && amount > 0 ? '-' : '') + amount + UNITS[unit];
}

export function formatBaseDamage (profile: SkillDamageProfile): string {
    return formatCombatNumber(calculateSkillDamage(profile, BASE_ATTACK_POWER));
}
