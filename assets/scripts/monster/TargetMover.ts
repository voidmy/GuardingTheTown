import {
    _decorator,
    AudioClip,
    AudioSource,
    Component,
    EventKeyboard,
    EventTouch,
    input,
    Input,
    KeyCode,
    Sprite,
    SpriteFrame,
    UITransform,
    Vec2,
} from 'cc';
import { WECHAT, WECHAT_MINI_PROGRAM } from 'cc/env';
import { CharacterStats, PlayerHitContext } from '../player/CharacterStats';

const { ccclass, menu, property } = _decorator;

declare const wx: {
    vibrateShort?: (options: { type: 'heavy'; fail: () => void }) => void;
} | undefined;

@ccclass('TargetMover')
@menu('Gameplay/Target Mover')
export class TargetMover extends Component {
    @property({ min: 1, visible: false })
    public moveSpeed = 260;

    @property([SpriteFrame])
    public walkFrames: SpriteFrame[] = [];

    @property({ min: 1 })
    public walkFramesPerSecond = 8;

    @property(SpriteFrame)
    public idleFrame01: SpriteFrame | null = null;

    @property(SpriteFrame)
    public idleFrame02: SpriteFrame | null = null;

    @property(SpriteFrame)
    public idleFrame03: SpriteFrame | null = null;

    @property(SpriteFrame)
    public idleFrame04: SpriteFrame | null = null;

    @property({ min: 1 })
    public idleFramesPerSecond = 4;

    @property({ min: 0 })
    public hitKnockbackDistance = 0;

    @property({ min: 0 })
    public eliteHitKnockbackDistance = 70;

    @property({ min: 0 })
    public heavyHitKnockbackDistance = 110;

    @property({ min: 0.01 })
    public hitKnockbackDuration = 0.14;

    @property({ min: 0 })
    public heavyHitShakeDistance = 5;

    @property({ min: 0.01 })
    public heavyHitShakeDuration = 0.12;

    @property(AudioClip)
    public hitSound: AudioClip | null = null;

    private readonly _pressed = new Set<KeyCode>();
    private _activeTouchId: number | null = null;
    private readonly _pointerDirection = new Vec2();
    private readonly _facingDirection = new Vec2(1, 0);
    private readonly _lastPosition = new Vec2();
    private readonly _idleFrames: SpriteFrame[] = [];
    private _sprite: Sprite | null = null;
    private _characterStats: CharacterStats | null = null;
    private _audioSource: AudioSource | null = null;
    private _frameIndex = 0;
    private _frameElapsed = 0;
    private _wasMoving = false;
    private readonly _hitDirection = new Vec2();
    private readonly _knockbackMovement = new Vec2();
    private _knockbackElapsed = 0;
    private _knockbackDistance = 0;
    private _shakeRemaining = 0;
    private readonly _shakeOffset = new Vec2();

    public getFacingDirection (out: Vec2): Vec2 {
        return out.set(this._facingDirection);
    }

    protected onLoad (): void {
        this._sprite = this.getComponent(Sprite);
        this._characterStats = this.getComponent(CharacterStats);
        this._audioSource = this.getComponent(AudioSource);
        this.collectIdleFrames();
        const initialFrames = this._idleFrames.length > 0
            ? this._idleFrames
            : this.walkFrames;
        this.showAnimationFrame(initialFrames, 0);
    }

    protected onEnable (): void {
        const position = this.node.position;
        this._lastPosition.set(position.x, position.y);
        this.node.on(CharacterStats.Event.Damaged, this.onDamaged, this);
        this.node.on(CharacterStats.Event.Died, this.resetHitFeedback, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onDisable (): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.node.off(CharacterStats.Event.Damaged, this.onDamaged, this);
        this.node.off(CharacterStats.Event.Died, this.resetHitFeedback, this);
        this._pressed.clear();
        this._activeTouchId = null;
        this._pointerDirection.set(0, 0);
        this.resetHitFeedback();
    }

    protected update (dt: number): void {
        this._knockbackMovement.set(0, 0);
        if (this._characterStats && !this._characterStats.isAlive) return;
        const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        let directionX = 0;
        let directionY = 0;

        if (this._pressed.has(KeyCode.KEY_A)) directionX -= 1;
        if (this._pressed.has(KeyCode.KEY_D)) directionX += 1;
        if (this._pressed.has(KeyCode.KEY_S)) directionY -= 1;
        if (this._pressed.has(KeyCode.KEY_W)) directionY += 1;
        directionX += this._pointerDirection.x;
        directionY += this._pointerDirection.y;
        const directionLength = Math.sqrt(
            directionX * directionX + directionY * directionY,
        );
        if (directionLength > 0) {
            directionX /= directionLength;
            directionY /= directionLength;
            const moveSpeed = Math.max(
                1,
                this._characterStats?.moveSpeed ?? this.moveSpeed,
            );
            this.moveBy(directionX * moveSpeed * step, directionY * moveSpeed * step);
        }
        this.updateHitFeedback(step);
    }

    public resetHitFeedback (): void {
        this._hitDirection.set(0, 0);
        this._knockbackMovement.set(0, 0);
        this._knockbackElapsed = 0;
        this._knockbackDistance = 0;
        this._shakeRemaining = 0;
        this._shakeOffset.set(0, 0);
        // Map follow is absolute, so clearing the additive shake cannot leave drift.
        this.followTargetWithMap();
    }

    private onDamaged (appliedDamage: number, hit?: PlayerHitContext): void {
        if (appliedDamage <= 0) return;
        if (this.hitSound && this._audioSource) {
            this._audioSource.playOneShot(this.hitSound, hit?.heavy ? 0.7 : hit?.elite ? 0.5 : 0.35);
        }
        if (!hit || (this._characterStats && !this._characterStats.isAlive)) return;

        const directionX = Number.isFinite(hit.directionX) ? hit.directionX : 0;
        const directionY = Number.isFinite(hit.directionY) ? hit.directionY : 0;
        const directionLength = Math.sqrt(directionX * directionX + directionY * directionY);
        this._hitDirection.set(
            directionLength > 0.001 ? directionX / directionLength : 0,
            directionLength > 0.001 ? directionY / directionLength : 0,
        );
        this._knockbackElapsed = 0;
        this._knockbackDistance = Math.max(0, hit.heavy
            ? this.heavyHitKnockbackDistance
            : hit.elite ? this.eliteHitKnockbackDistance : this.hitKnockbackDistance);
        if (hit.heavy) this.playHeavyHitVibration();
    }

    private playHeavyHitVibration (): void {
        const shakeScreen = (): void => {
            // A delayed platform failure must not restart feedback after pausing or death.
            if (!this.isValid || !this.enabledInHierarchy
                || (this._characterStats && !this._characterStats.isAlive)) return;
            this._shakeRemaining = Math.max(0, this.heavyHitShakeDuration);
        };
        if ((WECHAT || WECHAT_MINI_PROGRAM) && typeof wx !== 'undefined'
            && typeof wx?.vibrateShort === 'function') {
            try {
                // Called once per accepted heavy hit, already gated by damage protection.
                wx.vibrateShort({ type: 'heavy', fail: shakeScreen });
                return;
            } catch {
                // Preview tools or unsupported devices can expose an unusable native API.
            }
        }
        shakeScreen();
    }

    private updateHitFeedback (dt: number): void {
        if (this._knockbackDistance > 0) {
            const duration = Math.max(0.01, this.hitKnockbackDuration);
            const previousProgress = Math.min(1, this._knockbackElapsed / duration);
            this._knockbackElapsed = Math.min(duration, this._knockbackElapsed + dt);
            const progress = this._knockbackElapsed / duration;
            const distance = this._knockbackDistance
                * ((1 - previousProgress) ** 2 - (1 - progress) ** 2);
            // Hit vectors already use parent coordinates; the player's negative
            // facing scale must not flip either the movement or its direction.
            const previousX = this.node.position.x;
            const previousY = this.node.position.y;
            this.moveBy(this._hitDirection.x * distance, this._hitDirection.y * distance, false);
            this._knockbackMovement.set(this.node.position.x - previousX, this.node.position.y - previousY);
            if (progress >= 1) this._knockbackDistance = 0;
        }

        this._shakeRemaining = Math.max(0, this._shakeRemaining - dt);
        if (this._shakeRemaining <= 0) {
            this._shakeOffset.set(0, 0);
            return;
        }
        const duration = Math.max(0.01, this.heavyHitShakeDuration);
        const progress = 1 - this._shakeRemaining / duration;
        const amplitude = Math.max(0, this.heavyHitShakeDistance)
            * this._shakeRemaining / duration;
        this._shakeOffset.set(
            Math.sin(progress * Math.PI * 8) * amplitude,
            Math.sin(progress * Math.PI * 6 + Math.PI * 0.5) * amplitude * 0.6,
        );
    }

    protected lateUpdate (dt: number): void {
        const position = this.node.position;
        const deltaX = position.x - this._lastPosition.x;
        const deltaY = position.y - this._lastPosition.y;
        const isMoving = deltaX * deltaX + deltaY * deltaY > 0.0001;

        const facingDeltaX = deltaX - this._knockbackMovement.x;
        if (facingDeltaX > 0.001) this.setSpriteFacing(1);
        else if (facingDeltaX < -0.001) this.setSpriteFacing(-1);

        const animationFrames = isMoving
            ? (this.walkFrames.length > 0 ? this.walkFrames : this._idleFrames)
            : (this._idleFrames.length > 0 ? this._idleFrames : this.walkFrames);
        const stateChanged = isMoving !== this._wasMoving;
        if (stateChanged) {
            this._frameElapsed = 0;
            this.showAnimationFrame(animationFrames, 0);
        }

        if (isMoving || this._idleFrames.length > 0) {
            this.advanceAnimation(
                animationFrames,
                isMoving ? this.walkFramesPerSecond : this.idleFramesPerSecond,
                dt,
            );
        }

        this._wasMoving = isMoving;
        this._lastPosition.set(position.x, position.y);
        this.followTargetWithMap();
    }

    private collectIdleFrames (): void {
        this._idleFrames.length = 0;
        const configuredFrames = [
            this.idleFrame01,
            this.idleFrame02,
            this.idleFrame03,
            this.idleFrame04,
        ];
        for (const frame of configuredFrames) {
            if (frame) this._idleFrames.push(frame);
        }
    }

    private moveBy (deltaX: number, deltaY: number, updateFacing = true): void {
        const directionLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (updateFacing && directionLength > 0.001) {
            this._facingDirection.set(
                deltaX / directionLength,
                deltaY / directionLength,
            );
        }

        const position = this.node.position;
        let nextX = position.x + deltaX;
        let nextY = position.y + deltaY;

        const parentTransform = this.node.parent?.getComponent(UITransform);
        const ownTransform = this.getComponent(UITransform);
        if (parentTransform && ownTransform) {
            const halfWidth = ownTransform.width * 0.5;
            const halfHeight = ownTransform.height * 0.5;
            nextX = Math.max(-parentTransform.width * 0.5 + halfWidth,
                Math.min(parentTransform.width * 0.5 - halfWidth, nextX));
            nextY = Math.max(-parentTransform.height * 0.5 + halfHeight,
                Math.min(parentTransform.height * 0.5 - halfHeight, nextY));
        }

        this.node.setPosition(nextX, nextY, position.z);
    }

    private advanceAnimation (
        frames: SpriteFrame[],
        framesPerSecond: number,
        dt: number,
    ): void {
        if (frames.length <= 1) return;

        this._frameElapsed += Math.max(0, dt);
        const secondsPerFrame = 1 / Math.max(1, framesPerSecond);
        while (this._frameElapsed >= secondsPerFrame) {
            this._frameElapsed -= secondsPerFrame;
            const nextFrameIndex = (this._frameIndex + 1) % frames.length;
            this.showAnimationFrame(frames, nextFrameIndex);
        }
    }

    private showAnimationFrame (frames: SpriteFrame[], index: number): void {
        if (!this._sprite || frames.length === 0) return;
        this._frameIndex = Math.max(0, Math.min(index, frames.length - 1));
        this._sprite.spriteFrame = frames[this._frameIndex];
    }

    private setSpriteFacing (direction: -1 | 1): void {
        const scale = this.node.scale;
        const absoluteScaleX = Math.abs(scale.x) || 1;
        this.node.setScale(direction * absoluteScaleX, scale.y, scale.z);
    }

    private followTargetWithMap (): void {
        const mapNode = this.node.parent;
        const mapTransform = mapNode?.getComponent(UITransform);
        const viewportTransform = mapNode?.parent?.getComponent(UITransform);
        if (!mapNode || !mapTransform || !viewportTransform) return;

        const maximumCameraX = Math.max(
            0,
            (mapTransform.width - viewportTransform.width) * 0.5,
        );
        const maximumCameraY = Math.max(
            0,
            (mapTransform.height - viewportTransform.height) * 0.5,
        );
        const targetPosition = this.node.position;
        const cameraX = Math.max(
            -maximumCameraX,
            Math.min(maximumCameraX, targetPosition.x),
        );
        const cameraY = Math.max(
            -maximumCameraY,
            Math.min(maximumCameraY, targetPosition.y),
        );
        const mapPosition = mapNode.position;
        mapNode.setPosition(
            Math.max(-maximumCameraX, Math.min(maximumCameraX, -cameraX + this._shakeOffset.x)),
            Math.max(-maximumCameraY, Math.min(maximumCameraY, -cameraY + this._shakeOffset.y)),
            mapPosition.z,
        );
    }

    private onKeyDown (event: EventKeyboard): void {
        this._pressed.add(event.keyCode);
    }

    private onKeyUp (event: EventKeyboard): void {
        this._pressed.delete(event.keyCode);
    }

    private onTouchStart (event: EventTouch): void {
        if (this._activeTouchId !== null || !event.touch) return;
        this._activeTouchId = event.touch.getID();
        this._pointerDirection.set(0, 0);
    }

    private onTouchMove (event: EventTouch): void {
        if (!event.touch || event.touch.getID() !== this._activeTouchId) return;
        const delta = event.getUIDelta();
        const directionLength = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
        if (directionLength <= 0.001) return;
        this._pointerDirection.set(
            delta.x / directionLength,
            delta.y / directionLength,
        );
    }

    private onTouchEnd (event: EventTouch): void {
        if (!event.touch || event.touch.getID() !== this._activeTouchId) return;
        this._activeTouchId = null;
        this._pointerDirection.set(0, 0);
    }
}
