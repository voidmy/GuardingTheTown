import { Color, dragonBones, instantiate, Node, Prefab, Vec3 } from 'cc';

// CottonKingSimple's death animation is 24 frames at 30 fps.
const DEFAULT_DEATH_DURATION = 0.8;
const MOVEMENT_EPSILON = 0.01;
const ATTACK_TIME_SCALE = 4;
const ATTACK_IMPACT_EVENT = 'slam_impact';

interface ArmatureVisual {
    display: dragonBones.ArmatureDisplay;
    defaultColor: Color;
    tint: Color;
    defaultTimeScale: number;
}

interface PrefabVisual {
    node: Node;
    defaultScale: Vec3;
    armatures: ArmatureVisual[];
    animation: string;
    flipped: boolean;
    hitFlash: number;
    deathDuration: number;
    attack?: PrefabAttack;
}

interface PrefabAttack {
    armatures: ArmatureVisual[];
    eventDisplay: dragonBones.ArmatureDisplay;
    onFrame: (event: dragonBones.EventObject) => void;
    onComplete: (event: dragonBones.EventObject) => void;
    impacted: boolean;
}

interface DeadPrefabVisual {
    visual: PrefabVisual;
    remainingTime: number;
}

/** Prefab animation and lifetime management for the few non-batched enemies. */
export class MonsterPrefabVisuals {
    private readonly _alive = new Map<number, PrefabVisual>();
    private readonly _dead: DeadPrefabVisual[] = [];
    private _paused = false;

    public constructor (
        private readonly _parent: Node,
        private readonly _prefabs: ReadonlyMap<string, Prefab>,
    ) {}

    public hasPrefab (key: string): boolean {
        return this._prefabs.has(key);
    }

    public spawn (
        enemyId: number,
        key: string,
        x: number,
        y: number,
        deathDuration = DEFAULT_DEATH_DURATION,
    ): boolean {
        const prefab = this._prefabs.get(key);
        if (!prefab || this._alive.has(enemyId)) return false;

        const node = instantiate(prefab);
        node.setParent(this._parent);
        // The authored root is the feet / crowd collision origin.
        node.setPosition(x, y, node.position.z);
        const armatures = node.getComponentsInChildren(dragonBones.ArmatureDisplay)
            .map((display): ArmatureVisual => ({
                display,
                defaultColor: display.color.clone(),
                tint: display.color.clone(),
                defaultTimeScale: display.timeScale,
            }));
        if (armatures.length === 0) {
            node.destroy();
            return false;
        }

        const visual: PrefabVisual = {
            node,
            defaultScale: node.scale.clone(),
            armatures,
            animation: '',
            flipped: false,
            hitFlash: 0,
            deathDuration,
        };
        this._alive.set(enemyId, visual);
        this.playAnimation(visual, 'idle', 0);
        this.applyPause(visual);
        return true;
    }

    public sync (
        enemyId: number,
        x: number,
        y: number,
        velocityX: number,
        velocityY: number,
        hitFlash: number,
    ): void {
        const visual = this._alive.get(enemyId);
        if (!visual || !visual.node.isValid) return;

        visual.node.setPosition(x, y, visual.node.position.z);
        if (!visual.attack) {
            this.setFacing(visual, velocityX);
            const moving = velocityX * velocityX + velocityY * velocityY
                > MOVEMENT_EPSILON * MOVEMENT_EPSILON;
            this.playAnimation(visual, moving ? 'walk' : 'idle', 0);
        }
        this.setHitFlash(visual, Math.min(1, Math.max(0, hitFlash)));
    }

    /** Plays one authored attack, with damage timed by its slam_impact frame event. */
    public playAttack (
        enemyId: number,
        facingX: number,
        onImpact: () => void,
        onComplete: () => void,
    ): boolean {
        const visual = this._alive.get(enemyId);
        if (!visual || !visual.node.isValid || visual.attack) return false;

        const armatures = visual.armatures.filter(({ display, defaultTimeScale }) =>
            display.isValid && defaultTimeScale > 0
            && display.getAnimationNames(display.armatureName).includes('attack'));
        if (armatures.length === 0) return false;

        for (const { display } of armatures) {
            // Cached DragonBones animations do not deliver the authored frame events.
            if (display.isAnimationCached()) {
                display.setAnimationCacheMode(dragonBones.ArmatureDisplay.AnimationCacheMode.REALTIME);
            }
            if (!display.armature()) return false;
        }

        const eventDisplay = armatures[0].display;
        const attack: PrefabAttack = {
            armatures,
            eventDisplay,
            impacted: false,
            onFrame: (event) => {
                if (visual.attack !== attack || !visual.node.isValid || attack.impacted
                    || event.animationState?.name !== 'attack' || event.name !== ATTACK_IMPACT_EVENT) return;

                attack.impacted = true;
                onImpact();
            },
            onComplete: (event) => {
                if (visual.attack !== attack || !visual.node.isValid
                    || event.animationState?.name !== 'attack') return;

                this.cancelAttack(visual);
                this.playAnimation(visual, 'idle', 0);
                onComplete();
            },
        };
        visual.attack = attack;
        visual.animation = 'attack';
        this.setFacing(visual, facingX);
        this.applyPause(visual);
        eventDisplay.on(dragonBones.EventObject.FRAME_EVENT, attack.onFrame, this);
        eventDisplay.on(dragonBones.EventObject.COMPLETE, attack.onComplete, this);

        for (const { display } of armatures) {
            if (display.playAnimation('attack', 1)) continue;

            this.cancelAttack(visual);
            this.playAnimation(visual, 'idle', 0);
            return false;
        }
        return true;
    }

    public die (enemyId: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual) return;

        this._alive.delete(enemyId);
        this.cancelAttack(visual);
        if (!visual.node.isValid) return;

        this.setHitFlash(visual, 0);
        this.playAnimation(visual, 'death', 1);
        this.applyPause(visual);
        this._dead.push({ visual, remainingTime: visual.deathDuration });
    }

    public advance (dt: number): void {
        if (this._paused || dt <= 0) return;

        for (let i = this._dead.length - 1; i >= 0; i--) {
            const dead = this._dead[i];
            dead.remainingTime -= dt;
            if (dead.remainingTime > 0 && dead.visual.node.isValid) continue;

            if (dead.visual.node.isValid) dead.visual.node.destroy();
            this._dead.splice(i, 1);
        }
    }

    public setPaused (paused: boolean): void {
        if (this._paused === paused) return;

        this._paused = paused;
        for (const visual of this._alive.values()) this.applyPause(visual);
        for (const dead of this._dead) this.applyPause(dead.visual);
    }

    public clear (): void {
        for (const visual of this._alive.values()) {
            this.cancelAttack(visual);
            if (visual.node.isValid) visual.node.destroy();
        }
        for (const dead of this._dead) {
            if (dead.visual.node.isValid) dead.visual.node.destroy();
        }
        this._alive.clear();
        this._dead.length = 0;
    }

    private cancelAttack (visual: PrefabVisual): void {
        const attack = visual.attack;
        if (!attack) return;

        visual.attack = undefined;
        if (attack.eventDisplay.isValid) {
            attack.eventDisplay.off(dragonBones.EventObject.FRAME_EVENT, attack.onFrame, this);
            attack.eventDisplay.off(dragonBones.EventObject.COMPLETE, attack.onComplete, this);
        }
        this.applyPause(visual);
    }

    private setFacing (visual: PrefabVisual, facingX: number): void {
        if (Math.abs(facingX) <= MOVEMENT_EPSILON) return;

        const flipped = facingX < 0;
        if (visual.flipped === flipped) return;

        visual.flipped = flipped;
        const scale = visual.defaultScale;
        visual.node.setScale(flipped ? -scale.x : scale.x, scale.y, scale.z);
    }

    private playAnimation (visual: PrefabVisual, animation: string, playTimes: number): void {
        if (visual.animation === animation) return;

        visual.animation = animation;
        for (const armature of visual.armatures) {
            armature.display.playAnimation(animation, playTimes);
        }
    }

    private setHitFlash (visual: PrefabVisual, amount: number): void {
        if (visual.hitFlash === amount) return;

        visual.hitFlash = amount;
        for (const armature of visual.armatures) {
            const base = armature.defaultColor;
            armature.tint.set(
                Math.round(base.r + (255 - base.r) * amount),
                Math.round(base.g * (1 - 0.65 * amount)),
                Math.round(base.b * (1 - 0.4 * amount)),
                base.a,
            );
            // Per-component color preserves shared DragonBones materials.
            armature.display.color = armature.tint;
        }
    }

    private applyPause (visual: PrefabVisual): void {
        if (!visual.node.isValid) return;

        for (const armature of visual.armatures) {
            const attackScale = visual.attack?.armatures.includes(armature) ? ATTACK_TIME_SCALE : 1;
            armature.display.timeScale = this._paused ? 0 : armature.defaultTimeScale * attackScale;
        }
    }
}
