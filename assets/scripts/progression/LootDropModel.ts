import { PotionId } from './ExpeditionDefinitions';
export type LootTier = 'normal' | 'elite' | 'boss';
export type LootKind = 'experience' | 'chest' | 'equipment' | 'potion' | 'sand';
export const MAX_LOOT_DROPS = 512;

export interface LootReward {
    kind?: LootKind;
    stacks?: number;
    potion?: PotionId;
    experience: number;
    evolution: boolean;
    tier: LootTier;
}

export interface LootDrop extends LootReward {
    x: number;
    y: number;
    age: number;
    attracted: boolean;
    speed: number;
}

export interface LootPickupOptions {
    attractionRadius: number;
    pickupRadius: number;
    attractionSpeed: number;
    settleDuration: number;
}

/** Coordinates are local to the authored loot layer. Only advance() can award loot. */
export class LootDropModel {
    public readonly drops: LootDrop[] = [];
    private readonly _pool: LootDrop[] = [];
    private readonly _capacity: number;

    constructor (capacity = MAX_LOOT_DROPS) {
        // Leave room for all kind/tier/evolution/attraction combinations.
        this._capacity = Math.max(128, Math.floor(capacity));
    }

    public spawn (x: number, y: number, reward: LootReward): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)
            || !Number.isFinite(reward.experience) || reward.experience < 0) return;
        const kind = reward.kind ?? 'experience';
        if (reward.experience === 0 && !reward.evolution && kind === 'experience') return;
        if (this.drops.length >= this._capacity) this.mergeOldDrops();
        const drop = this._pool.pop() ?? {} as LootDrop;
        Object.assign(drop, { potion: undefined }, reward, { kind, stacks: Math.max(1, Math.floor(reward.stacks ?? 1)),
            x, y, age: 0, attracted: false, speed: 0 });
        this.drops.push(drop);
    }

    public advance (
        dt: number, targetX: number, targetY: number, options: LootPickupOptions,
        collect: (reward: LootReward) => number | void,
        canCollect?: (reward: LootReward) => boolean,
    ): void {
        if (!Number.isFinite(dt) || dt <= 0
            || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
        const step = Math.min(dt, 0.1);
        const pickupRadius = Math.max(1, options.pickupRadius);
        const attractionRadius = Math.max(pickupRadius, options.attractionRadius);
        const baseSpeed = Math.max(1, options.attractionSpeed);
        for (let index = this.drops.length - 1; index >= 0; index--) {
            const drop = this.drops[index];
            drop.age += step;
            if (canCollect && !canCollect(drop)) {
                drop.attracted = false;
                drop.speed = 0;
                continue;
            }
            if (drop.age < Math.max(0, options.settleDuration)) continue;
            const dx = targetX - drop.x;
            const dy = targetY - drop.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (!drop.attracted && distance <= attractionRadius) {
                drop.attracted = true;
                drop.speed = baseSpeed;
            }
            if (!drop.attracted) continue;
            drop.speed = Math.min(baseSpeed * 2.5, drop.speed + baseSpeed * 3 * step);
            const travel = drop.speed * step;
            if (distance <= pickupRadius + travel) {
                // Remove before the callback: the same reward can never be picked up twice.
                this.remove(index);
                const stacks = drop.stacks ?? 1;
                const accepted = collect(drop);
                const consumed = typeof accepted !== 'number' ? stacks
                    : Number.isFinite(accepted) ? Math.max(0, Math.min(stacks, Math.floor(accepted))) : 0;
                if (consumed < stacks) {
                    drop.stacks = stacks - consumed;
                    drop.attracted = false;
                    drop.speed = 0;
                    this.drops.push(drop);
                } else this._pool.push(drop);
            } else {
                drop.x += dx / distance * travel;
                drop.y += dy / distance * travel;
            }
        }
    }

    public clear (): void {
        this._pool.push(...this.drops);
        this.drops.length = 0;
    }

    private remove (index: number): void {
        const last = this.drops.pop()!;
        if (index < this.drops.length) this.drops[index] = last;
    }

    private mergeOldDrops (): void {
        // Compact existing rewards, never the new drop: even at capacity a fresh kill
        // still leaves its reward at its own position and cannot feed a distant pickup.
        for (let index = 0; index < this.drops.length - 1; index++) {
            const anchor = this.drops[index];
            let nearest = -1;
            let distanceSquared = Infinity;
            for (let other = index + 1; other < this.drops.length; other++) {
                const candidate = this.drops[other];
                if (candidate.kind !== anchor.kind || candidate.potion !== anchor.potion || candidate.tier !== anchor.tier || candidate.evolution !== anchor.evolution
                    || candidate.attracted !== anchor.attracted) continue;
                const distance = (candidate.x - anchor.x) ** 2 + (candidate.y - anchor.y) ** 2;
                if (distance < distanceSquared) {
                    distanceSquared = distance;
                    nearest = other;
                }
            }
            if (nearest < 0) continue;
            const merged = this.drops[nearest];
            anchor.experience += merged.experience;
            anchor.stacks = (anchor.stacks ?? 1) + (merged.stacks ?? 1);
            this.remove(nearest);
            this._pool.push(merged);
            return;
        }
    }
}
