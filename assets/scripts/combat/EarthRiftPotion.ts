import { AudioSource, instantiate, isValid, Material, Node, Prefab, Sprite, UITransform, Vec2, Vec4 } from 'cc';
import { AbilityFrameContext, EnemyCombatWorld, EnemyId } from './CombatTypes';

const RIFT_LENGTH = 2000;
const RIFT_WIDTH = 480;
const RIFT_PADDING_X = 200;
const RIFT_PADDING_Y = 280;
const OPENING_TIME = 0.48;
const LIFETIME = 2.8;
const START_DISTANCE = 32;
const AIM_DIRECTION_BUCKETS = 32;

export interface EarthRiftFeedback {
    onImpact?: () => void;
    getVolume?: () => number;
}

/** One pooled quad/material; query once to aim and once to resolve the impact. */
export class EarthRiftPotion {
    private readonly _node: Node;
    private readonly _material: Material | null;
    private readonly _tearAudio: AudioSource | null;
    private readonly _impactAudio: AudioSource | null;
    private readonly _state = new Vec4(0, LIFETIME, OPENING_TIME, 0);
    private readonly _results: EnemyId[] = [];
    private readonly _aimPosition = new Vec2();
    private readonly _aimDirection = new Vec2(1, 0);
    private readonly _aimOffsets: number[] = [];
    private readonly _aimCandidates = new Int32Array(AIM_DIRECTION_BUCKETS);
    private _age = -1;
    private _struck = false;
    private _startX = 0;
    private _startY = 0;
    private _endX = 0;
    private _endY = 0;

    public constructor (private readonly _world: EnemyCombatWorld, prefab: Prefab, ground: Node,
        private readonly _feedback: EarthRiftFeedback = {}) {
        this._node = instantiate(prefab);
        this._node.active = false;
        this._node.setParent(ground);
        this._tearAudio = this._node.getChildByName('TearSound')?.getComponent(AudioSource) ?? null;
        this._impactAudio = this._node.getComponent(AudioSource);
        const sprite = this._node.getComponent(Sprite);
        const sourceMaterial = sprite?.customMaterial;
        this._material = sourceMaterial && sprite.spriteFrame ? new Material() : null;
        if (this._material) {
            // A hidden Sprite has no render material yet, and onDisable clears its instances.
            // Own a copy of the authored material so every activation binds the same live shader.
            this._material.copy(sourceMaterial);
            sprite.customMaterial = this._material;
        }
        this._node.getComponent(UITransform)?.setContentSize(
            RIFT_LENGTH + RIFT_PADDING_X, RIFT_WIDTH + RIFT_PADDING_Y);
        this._material?.setProperty('riftSize', new Vec4(RIFT_LENGTH, RIFT_WIDTH,
            RIFT_LENGTH + RIFT_PADDING_X, RIFT_WIDTH + RIFT_PADDING_Y));
    }

    public cast (context: AbilityFrameContext): string {
        if (!isValid(this._node, true) || !isValid(this._material, true)) return '地裂特效尚未就绪，请检查预制体材质。';
        if (this._age >= 0) return '地裂仍在持续，请稍后再用。';
        this.aimAtEnemies(context);
        const dx = this._aimDirection.x;
        const dy = this._aimDirection.y;
        const radius = RIFT_WIDTH * 0.5;
        // The capsule covers the main fissure and broken banks; thin side cracks are decorative.
        this._startX = context.originX + dx * (START_DISTANCE + radius);
        this._startY = context.originY + dy * (START_DISTANCE + radius);
        this._endX = context.originX + dx * (START_DISTANCE + RIFT_LENGTH - radius);
        this._endY = context.originY + dy * (START_DISTANCE + RIFT_LENGTH - radius);
        this._node.setPosition(context.originX + dx * (START_DISTANCE + RIFT_LENGTH * 0.5),
            context.originY + dy * (START_DISTANCE + RIFT_LENGTH * 0.5), 0);
        this._node.setRotationFromEuler(0, 0, Math.atan2(dy, dx) * 180 / Math.PI);
        this._age = 0;
        this._struck = false;
        this._state.x = 0;
        this._state.w = Math.random() * 64;
        this._material.setProperty('riftState', this._state);
        this._node.active = true;
        this.playSound(this._tearAudio, 0.72);
        return '';
    }

    private aimAtEnemies (context: AbilityFrameContext): void {
        const facingLength = Math.hypot(context.facingX, context.facingY);
        this._aimDirection.set(facingLength > 0.001 ? context.facingX / facingLength : 1,
            facingLength > 0.001 ? context.facingY / facingLength : 0);
        this._world.queryEnemiesInCircle(context.originX, context.originY,
            START_DISTANCE + RIFT_LENGTH, this._results, true);
        const offsets = this._aimOffsets;
        const candidates = this._aimCandidates;
        offsets.length = 0;
        candidates.fill(-1);
        for (const enemyId of this._results) {
            if (!this._world.getEnemyPosition(enemyId, this._aimPosition)) continue;
            const x = this._aimPosition.x - context.originX;
            const y = this._aimPosition.y - context.originY;
            const distanceSquared = x * x + y * y;
            if (!Number.isFinite(distanceSquared) || distanceSquared <= 0.000001) continue;
            const index = offsets.length;
            offsets.push(x, y);
            // Sample an actual enemy heading per sector, never snap the shot to a fixed angle.
            const sector = Math.floor((Math.atan2(y, x) + Math.PI)
                * AIM_DIRECTION_BUCKETS / (2 * Math.PI)) % AIM_DIRECTION_BUCKETS;
            const previous = candidates[sector];
            if (previous < 0 || distanceSquared < offsets[previous] * offsets[previous]
                + offsets[previous + 1] * offsets[previous + 1]) candidates[sector] = index;
        }
        this._results.length = 0;

        const radius = RIFT_WIDTH * 0.5;
        const start = START_DISTANCE + radius;
        const end = START_DISTANCE + RIFT_LENGTH - radius;
        let bestCount = -1;
        let bestDistanceSquared = Infinity;
        // At most 32 passes over a reusable position snapshot, only when casting.
        // Center coverage estimates density; the impact query still handles enemy body radii.
        for (const candidate of candidates) {
            if (candidate < 0) continue;
            const x = offsets[candidate];
            const y = offsets[candidate + 1];
            const distanceSquared = x * x + y * y;
            const length = Math.sqrt(distanceSquared);
            const dx = x / length;
            const dy = y / length;
            let count = 0;
            for (let index = 0; index < offsets.length; index += 2) {
                const projection = Math.max(start, Math.min(end,
                    offsets[index] * dx + offsets[index + 1] * dy));
                const deltaX = offsets[index] - projection * dx;
                const deltaY = offsets[index + 1] - projection * dy;
                if (deltaX * deltaX + deltaY * deltaY <= radius * radius) count++;
            }
            if (count > bestCount || count === bestCount && distanceSquared < bestDistanceSquared) {
                bestCount = count;
                bestDistanceSquared = distanceSquared;
                this._aimDirection.set(dx, dy);
            }
        }
        offsets.length = 0;
    }

    public advance (dt: number): void {
        if (this._age < 0 || !Number.isFinite(dt) || dt <= 0) return;
        this._age = Math.min(LIFETIME, this._age + dt);
        this._state.x = this._age;
        this._material?.setProperty('riftState', this._state);
        if (!this._struck && this._age >= OPENING_TIME) {
            this._struck = true;
            this.playSound(this._impactAudio, 1);
            this._feedback.onImpact?.();
            this._world.queryEnemiesAlongSegment(this._startX, this._startY, this._endX, this._endY,
                RIFT_WIDTH * 0.5, this._results, true);
            // Stable IDs survive the crowd controller's swap-removal during a mass kill.
            for (const enemyId of this._results) this._world.executeEnemy(enemyId, 'potion-earth-rift');
            this._results.length = 0;
        }
        if (this._age >= LIFETIME) {
            this._age = -1;
            this._node.active = false;
        }
    }

    private playSound (source: AudioSource | null, gain: number): void {
        if (!source?.clip) return;
        const volume = this._feedback.getVolume?.() ?? 0.7;
        if (!Number.isFinite(volume) || volume <= 0) return;
        source.volume = Math.min(1, volume) * gain;
        source.play();
    }

    public destroy (): void {
        this._age = -1;
        this._results.length = 0;
        this._aimOffsets.length = 0;
        if (isValid(this._tearAudio, true)) this._tearAudio.stop();
        if (isValid(this._impactAudio, true)) this._impactAudio.stop();
        if (isValid(this._node, true)) this._node.destroy();
        if (isValid(this._material, true)) this._material.destroy();
    }
}
