import { _decorator, Component, Prefab, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { LootBatchRenderer } from './LootBatchRenderer';
import { LootDropModel, LootReward, LootTier } from './LootDropModel';
import { LootPickupAudio } from './LootPickupAudio';
import { POTIONS } from './ExpeditionDefinitions';

const { ccclass, menu, property, requireComponent } = _decorator;
const LOOT_VISUALS = ['effect', 'normal', 'elite', 'boss', 'chest', 'equipment', 'potion', 'sand'] as const;
type LootVisual = LootTier | 'chest' | 'equipment' | 'effect' | 'potion' | 'sand';
const MAX_RARE_EFFECTS = 24;
const MANUAL_TINT = [120, 235, 255] as const;

interface LootAppearance {
    frame: SpriteFrame;
    corners: Float32Array;
    red: number;
    green: number;
    blue: number;
    alpha: number;
    batch: LootBatchRenderer;
}

@ccclass('LootDropSystem')
@menu('Gameplay/Loot Drop System')
@requireComponent(UITransform)
export class LootDropSystem extends Component {
    @property({ type: Prefab, displayName: '普通怪掉落预制体', tooltip: '读取根节点 Sprite 的图片和尺寸进行批量绘制，不实例化每颗掉落。' })
    public normalPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '精英掉落预制体' })
    public elitePrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: 'Boss 掉落预制体' })
    public bossPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '稀有宝箱图片预制体' })
    public chestPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '稀有装备图片预制体' })
    public equipmentPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '稀有掉落光效预制体', tooltip: '使用带透明通道的光圈/光柱图片，最多同时显示24处光效。' })
    public rareEffectPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '药水掉落预制体' })
    public potionPrefab: Prefab | null = null;

    @property({ type: Prefab, displayName: '梦砂掉落预制体' })
    public sandPrefab: Prefab | null = null;

    @property({ min: 1, displayName: '掉落吸附半径' })
    public attractionRadius = 130;

    @property({ min: 1, displayName: '掉落拾取半径' })
    public pickupRadius = 22;

    @property({ min: 1, displayName: '掉落吸附速度' })
    public attractionSpeed = 520;

    @property({ min: 0, displayName: '掉落落地时间' })
    public settleDuration = 0.3;

    private readonly _model = new LootDropModel();
    private readonly _local = new Vec3();
    private _transform: UITransform | null = null;
    private _batches: LootBatchRenderer[] = [];
    private readonly _appearances: Partial<Record<LootVisual, LootAppearance>> = {};
    private _pickupAudio: LootPickupAudio | null = null;
    private _collectReward: ((reward: LootReward) => number | void) | null = null;
    private readonly _onPickup = (reward: LootReward): number | void => {
        const accepted = this._collectReward?.(reward);
        if (accepted !== 0) this._pickupAudio?.queuePickup(reward);
        return accepted;
    };

    public get dropCount (): number { return this._model.drops.length; }

    protected onLoad (): void {
        this.node.setSiblingIndex(0);
        this._transform = this.getComponent(UITransform);
        this._pickupAudio = this.getComponent(LootPickupAudio);
        this._batches = this.getComponentsInChildren(LootBatchRenderer).slice(0, LOOT_VISUALS.length);
        this.refreshAppearances();
    }

    /** Prefabs remain the authoring interface; their nodes never enter the scene. */
    public refreshAppearances (): void {
        for (const batch of this._batches) { batch.begin(); batch.setTexture(null); batch.commit(); }
        for (const tier of LOOT_VISUALS) {
            delete this._appearances[tier];
            const prefab = tier === 'normal' ? this.normalPrefab : tier === 'elite' ? this.elitePrefab
                : tier === 'boss' ? this.bossPrefab : tier === 'chest' ? this.chestPrefab
                    : tier === 'equipment' ? this.equipmentPrefab : tier === 'potion' ? this.potionPrefab
                        : tier === 'sand' ? this.sandPrefab : this.rareEffectPrefab;
            const sprite = prefab?.data?.getComponent(Sprite);
            const transform = prefab?.data?.getComponent(UITransform);
            const frame = sprite?.spriteFrame;
            if (!sprite || !transform || !frame || sprite.type !== Sprite.Type.SIMPLE) {
                console.error(`[LootDropSystem] ${tier} 预制体根节点需要配置 Simple Sprite 图片。`);
                continue;
            }
            // Keep effects behind items even when both are packed into one atlas.
            // Item batches retain all 512 slots; effects cannot consume pickup slots.
            const batch = this._batches.find(entry => entry !== this._appearances.effect?.batch && entry.texture === frame.texture)
                ?? this._batches.find(entry => !entry.texture);
            if (!batch) {
                console.error('[LootDropSystem] 请配置八个带 LootBatchRenderer 的批量绘制节点。');
                continue;
            }
            batch.setTexture(frame.texture);
            const width = transform.width;
            const height = transform.height;
            let left = -transform.anchorX * width;
            let bottom = -transform.anchorY * height;
            let right = left + width;
            let top = bottom + height;
            if (!sprite.trim) {
                const original = frame.originalSize;
                const rect = frame.rect;
                const offset = frame.offset;
                const sx = width / Math.max(1, original.width);
                const sy = height / Math.max(1, original.height);
                left += ((original.width - rect.width) * 0.5 + offset.x) * sx;
                bottom += ((original.height - rect.height) * 0.5 + offset.y) * sy;
                right = left + rect.width * sx;
                top = bottom + rect.height * sy;
            }
            const corners = new Float32Array([left, bottom, right, bottom, left, top, right, top]);
            const scale = sprite.node.scale;
            const angle = sprite.node.angle * Math.PI / 180;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            for (let i = 0; i < 8; i += 2) {
                const x = corners[i] * scale.x;
                const y = corners[i + 1] * scale.y;
                corners[i] = x * cosine - y * sine;
                corners[i + 1] = x * sine + y * cosine;
            }
            const color = sprite.color;
            this._appearances[tier] = { frame, corners, batch,
                red: color.r / 255, green: color.g / 255, blue: color.b / 255, alpha: color.a / 255 };
        }
        this.syncVisuals();
    }

    public spawn (worldPosition: Vec3, reward: LootReward): void {
        if (!this._transform) return;
        this._transform.convertToNodeSpaceAR(worldPosition, this._local);
        this._model.spawn(this._local.x, this._local.y, reward);
    }

    /** Combat drives both pickup and animation, including upgrade/death pauses. */
    public advance (dt: number, targetWorld: Vec3, collect: (reward: LootReward) => number | void,
        canCollect?: (reward: LootReward) => boolean): void {
        if (!this._transform || !this.enabledInHierarchy) return;
        this._transform.convertToNodeSpaceAR(targetWorld, this._local);
        this._collectReward = collect;
        try {
            this._model.advance(dt, this._local.x, this._local.y, this, this._onPickup, canCollect);
        } finally {
            this._collectReward = null;
        }
        this._pickupAudio?.flush();
        this.syncVisuals();
    }

    public clear (): void {
        this._model.clear();
        this._pickupAudio?.clear();
        for (const batch of this._batches) { batch.begin(); batch.commit(); }
    }

    protected onDestroy (): void {
        this._model.clear();
        this._batches.length = 0;
    }

    private syncVisuals (): void {
        // SpriteFrames can move into an atlas after loading. Re-group together
        // with their UVs so a replacement/packed frame keeps sampling its texture.
        for (const tier of LOOT_VISUALS) {
            const appearance = this._appearances[tier];
            if (appearance && appearance.frame.texture !== appearance.batch.texture) {
                this.refreshAppearances();
                return;
            }
        }
        for (const batch of this._batches) batch.begin();
        const effect = this._appearances.effect;
        let effectCount = 0;
        for (const drop of this._model.drops) {
            const rare = drop.kind === 'chest' || drop.kind === 'equipment' || drop.kind === 'manual';
            // Reuse the authored chest SpriteFrame and batch for the cyan manual casket.
            const appearance = this._appearances[drop.kind === 'manual' ? 'chest'
                : drop.kind && drop.kind !== 'experience' ? drop.kind : drop.tier];
            if (!appearance) continue;
            const progress = Math.min(1, drop.age / Math.max(0.01, this.settleDuration));
            const bounce = progress < 1 ? Math.sin(progress * Math.PI) * 24 : 0;
            const idle = progress === 1 && !drop.attracted ? Math.sin(drop.age * 3 + drop.x) * 2 : 0;
            const baseExperience = drop.tier === 'boss' ? 50 : drop.tier === 'elite' ? 20 : 1;
            const mergedScale = 1 + Math.min(0.4, Math.log2(Math.max(1,
                rare ? drop.stacks ?? 1 : drop.experience / baseExperience)) * 0.08);
            const pulse = drop.evolution && !drop.attracted ? 1 + Math.sin(drop.age * 4) * 0.08 : 1;
            const tint = drop.kind === 'manual' ? MANUAL_TINT
                : drop.kind === 'potion' && drop.potion ? POTIONS[drop.potion].color : null;
            appearance.batch.addQuad(drop.x, drop.y + (rare ? 12 : 6) + bounce + idle, mergedScale * pulse,
                appearance.corners, appearance.frame.uv, appearance.red * (tint ? tint[0] / 255 : 1),
                appearance.green * (tint ? tint[1] / 255 : 1), appearance.blue * (tint ? tint[2] / 255 : 1), appearance.alpha);
            if (rare && !drop.attracted && effect && effectCount < MAX_RARE_EFFECTS) {
                effectCount++;
                const shimmer = 0.65 + Math.sin(drop.age * 3.2 + drop.x) * 0.15;
                const chest = drop.kind === 'chest';
                const manual = drop.kind === 'manual';
                effect.batch.addQuad(drop.x, drop.y - 14, 1 + Math.sin(drop.age * 2.4) * 0.05,
                    effect.corners, effect.frame.uv, effect.red * (manual ? 0.4 : chest ? 1 : 0.75),
                    effect.green * (manual ? 0.9 : chest ? 0.76 : 0.45), effect.blue * (chest ? 0.28 : 1), effect.alpha * shimmer);
            }
        }
        for (const batch of this._batches) batch.commit();
    }
}
