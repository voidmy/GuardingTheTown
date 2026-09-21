import { Color, dragonBones, instantiate, Node, ParticleSystem2D, Prefab, Sprite, UIOpacity, UITransform, Vec2, Vec3 } from 'cc';

// CottonKingSimple's death animation is 24 frames at 30 fps.
const DEFAULT_DEATH_DURATION = 0.8;
const HEALTH_BAR_HIT_DURATION = 3;
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
    healthBar: Node | null;
    healthBarScale: Vec3 | null;
    healthFill: Sprite | null;
    healthBarAlwaysVisible: boolean;
    healthBarRemainingTime: number;
    maximumHealth: number;
    particleSystems: ParticleSystem2D[];
    chargeParticles: ParticleSystem2D | null;
    effects: Map<string, ParticleSystem2D>;
    skillAnimation: string | null;
    groundParticles: Node | null;
    telegraphs: Node | null;
    impactWarning: UITransform | null;
    rollWarning: Node | null;
    rollLane: UITransform | null;
    rollOpacity: UIOpacity | null;
    summonPoints: { node: Node; sprite: Sprite | null; burst: ParticleSystem2D | null }[];
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
        private readonly _groundParent: Node,
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
        maximumHealth = 1,
        healthBarAlwaysVisible = true,
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

        const healthBar = node.getChildByName('HealthBar');
        const healthFill = healthBar?.getChildByName('HealthFill')?.getComponent(Sprite) ?? null;
        // Authored emitters are cached once per Boss, then reused for every swing.
        const particleSystems = node.getComponentsInChildren(ParticleSystem2D);
        const groundParticles = node.getChildByName('SkillParticles');
        const telegraphs = node.getChildByName('SkillTelegraphs');
        const rollWarning = telegraphs?.getChildByName('RollWarning') ?? null;
        if (healthFill) healthFill.fillRange = 1;
        if (healthBar) healthBar.active = healthBarAlwaysVisible;
        const visual: PrefabVisual = {
            node,
            defaultScale: node.scale.clone(),
            armatures,
            animation: '',
            flipped: false,
            hitFlash: 0,
            deathDuration,
            healthBar,
            healthBarScale: healthBar?.scale.clone() ?? null,
            healthFill,
            healthBarAlwaysVisible,
            healthBarRemainingTime: 0,
            // Keep the actual spawn HP, including time-based difficulty growth.
            maximumHealth: Math.max(0.01, maximumHealth),
            particleSystems,
            chargeParticles: particleSystems.find((system) => system.node.name === 'Charge') ?? null,
            effects: new Map(particleSystems.map((system) => [system.node.name, system])),
            skillAnimation: null,
            groundParticles,
            telegraphs,
            impactWarning: telegraphs?.getChildByName('ImpactWarning')?.getComponent(UITransform) ?? null,
            rollWarning,
            rollLane: rollWarning?.getChildByName('Lane')?.getComponent(UITransform) ?? null,
            rollOpacity: rollWarning?.getComponent(UIOpacity) ?? null,
            summonPoints: telegraphs?.getChildByName('SummonPoints')?.children.map((point) => ({
                node: point, sprite: point.getComponent(Sprite),
                burst: point.getComponentInChildren(ParticleSystem2D),
            })) ?? [],
        };
        // Reuse the authored roots, but render them before every monster, including batches.
        // The scene ground layer shares the crowd layer's coordinate system.
        for (const ground of [groundParticles, telegraphs]) {
            if (!ground) continue;
            ground.setParent(this._groundParent);
            ground.setPosition(x, y, node.position.z);
            ground.setScale(visual.defaultScale);
        }
        this._alive.set(enemyId, visual);
        this.playAnimation(visual, 'idle', 0);
        this.applyPause(visual);
        return true;
    }

    /** Damage updates the authored fill and restarts the temporary visibility timer. */
    public setHealth (enemyId: number, health: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual?.healthFill?.isValid) return;

        visual.healthFill.fillRange = Math.max(0, Math.min(1, health / visual.maximumHealth));
        if (!visual.healthBarAlwaysVisible && visual.healthBar && health > 0) {
            if (!visual.healthBar.active) visual.healthBar.active = true;
            visual.healthBarRemainingTime = HEALTH_BAR_HIT_DURATION;
        }
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
        visual.groundParticles?.setPosition(x, y, visual.node.position.z);
        visual.telegraphs?.setPosition(x, y, visual.node.position.z);
        if (!visual.attack && !visual.skillAnimation) {
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
        impactRadius = 190,
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
                visual.chargeParticles?.stopSystem();
                if (visual.impactWarning) visual.impactWarning.node.active = false;
                visual.effects.get('ImpactDust')?.resetSystem();
                visual.effects.get('ImpactDebris')?.resetSystem();
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
        visual.chargeParticles?.resetSystem();
        if (visual.impactWarning) {
            visual.impactWarning.setContentSize(impactRadius * 2, impactRadius * 2);
            visual.impactWarning.node.active = true;
        }
        return true;
    }

    /** The cotton king's phases follow the paused battle clock, including cached animations. */
    public playSkill (enemyId: number, animation: string, facingX = 0): void {
        const visual = this._alive.get(enemyId);
        if (!visual) return;
        visual.skillAnimation = animation;
        this.setFacing(visual, facingX);
        this.playAnimation(visual, animation, 1);
    }

    public finishSkill (enemyId: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual) return;
        visual.skillAnimation = null;
        this.playAnimation(visual, 'idle', 0);
        if (visual.rollWarning) visual.rollWarning.active = false;
        for (const point of visual.summonPoints) point.node.active = false;
    }

    public playSkillEffect (enemyId: number, name: string): void {
        this._alive.get(enemyId)?.effects.get(name)?.resetSystem();
    }

    public stopSkillEffect (enemyId: number, name: string): void {
        this._alive.get(enemyId)?.effects.get(name)?.stopSystem();
    }

    public showRollWarning (enemyId: number, dx: number, dy: number, radius: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual?.rollWarning || !visual.rollLane) return;
        const length = Math.sqrt(dx * dx + dy * dy);
        visual.rollWarning.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        // One authored directional decal covers the path and its collision-radius end margins.
        visual.rollLane.setContentSize(length + radius * 2, radius * 2);
        visual.rollLane.node.setPosition(length * 0.5, 0);
        if (visual.rollOpacity) visual.rollOpacity.opacity = 100;
        visual.rollWarning.active = true;
    }

    public updateRollWarning (enemyId: number, progress: number): void {
        const opacity = this._alive.get(enemyId)?.rollOpacity;
        if (!opacity) return;
        const t = Math.max(0, Math.min(1, progress));
        // Follow the paused battle clock; no tween, extra node or material per cast.
        opacity.opacity = Math.round(100 + 130 * t * t * (3 - 2 * t));
    }

    public hideRollWarning (enemyId: number): void {
        const warning = this._alive.get(enemyId)?.rollWarning;
        if (warning) warning.active = false;
    }

    public showSummonPoints (enemyId: number, positions: readonly Vec2[], count: number, x: number, y: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual) return;
        for (let i = 0; i < visual.summonPoints.length; i++) {
            const point = visual.summonPoints[i];
            point.node.active = i < count;
            if (i >= count) continue;
            point.node.setPosition(positions[i].x - x, positions[i].y - y);
            if (point.sprite) point.sprite.enabled = true;
        }
    }

    public emitSummonPoint (enemyId: number, index: number, spawned: boolean): void {
        const point = this._alive.get(enemyId)?.summonPoints[index];
        if (!point) return;
        if (point.sprite) point.sprite.enabled = false;
        if (spawned) point.burst?.resetSystem();
    }

    public die (enemyId: number): void {
        const visual = this._alive.get(enemyId);
        if (!visual) return;

        this._alive.delete(enemyId);
        this.cancelAttack(visual);
        if (!visual.node.isValid) {
            this.destroyVisual(visual);
            return;
        }

        if (visual.telegraphs) visual.telegraphs.active = false;
        // Death interrupts both the charge and any impact still in flight.
        for (const system of visual.particleSystems) {
            // Unused summon markers may never have activated their renderer.
            if (system.particleCount > 0) system.resetSystem();
            system.stopSystem();
        }
        if (visual.groundParticles) visual.groundParticles.active = false;
        if (visual.healthBar) visual.healthBar.active = false;
        this.setHitFlash(visual, 0);
        this.playAnimation(visual, 'death', 1);
        this.applyPause(visual);
        this._dead.push({ visual, remainingTime: visual.deathDuration });
    }

    public advance (dt: number): void {
        if (this._paused || dt <= 0) return;

        // Only prefab enemies participate; reuse battle time so pauses freeze the timer.
        for (const visual of this._alive.values()) {
            if (visual.healthBarRemainingTime <= 0 || !visual.healthBar?.isValid) continue;
            visual.healthBarRemainingTime = Math.max(0, visual.healthBarRemainingTime - dt);
            if (visual.healthBarRemainingTime === 0) visual.healthBar.active = false;
        }

        for (let i = this._dead.length - 1; i >= 0; i--) {
            const dead = this._dead[i];
            dead.remainingTime -= dt;
            if (dead.remainingTime > 0 && dead.visual.node.isValid) continue;

            this.destroyVisual(dead.visual);
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
            this.destroyVisual(visual);
        }
        for (const dead of this._dead) {
            this.destroyVisual(dead.visual);
        }
        this._alive.clear();
        this._dead.length = 0;
    }

    private destroyVisual (visual: PrefabVisual): void {
        if (visual.groundParticles?.isValid) visual.groundParticles.destroy();
        if (visual.telegraphs?.isValid) visual.telegraphs.destroy();
        if (visual.node.isValid) visual.node.destroy();
    }

    private cancelAttack (visual: PrefabVisual): void {
        const attack = visual.attack;
        if (!attack) return;

        visual.attack = undefined;
        visual.chargeParticles?.stopSystem();
        if (visual.impactWarning) visual.impactWarning.node.active = false;
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
        // Detached ground paths keep their world direction; only body-relative particles flip.
        visual.groundParticles?.setScale(flipped ? -scale.x : scale.x, scale.y, scale.z);
        // Counter the root flip so the bar always drains from right to left.
        const barScale = visual.healthBarScale;
        if (visual.healthBar && barScale) {
            visual.healthBar.setScale(flipped ? -barScale.x : barScale.x, barScale.y, barScale.z);
        }
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

        // Disabling preserves particle simulation state; resume never restarts the burst.
        for (const system of visual.particleSystems) system.enabled = !this._paused;
        for (const armature of visual.armatures) {
            const attackScale = visual.attack?.armatures.includes(armature) ? ATTACK_TIME_SCALE : 1;
            armature.display.timeScale = this._paused ? 0 : armature.defaultTimeScale * attackScale;
        }
    }
}
