import {
    _decorator,
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
import { CharacterStats } from '../player/CharacterStats';

const { ccclass, menu, property } = _decorator;

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

    private readonly _pressed = new Set<KeyCode>();
    private _activeTouchId: number | null = null;
    private readonly _pointerDirection = new Vec2();
    private readonly _facingDirection = new Vec2(1, 0);
    private readonly _lastPosition = new Vec2();
    private readonly _idleFrames: SpriteFrame[] = [];
    private _sprite: Sprite | null = null;
    private _characterStats: CharacterStats | null = null;
    private _frameIndex = 0;
    private _frameElapsed = 0;
    private _wasMoving = false;

    public getFacingDirection (out: Vec2): Vec2 {
        return out.set(this._facingDirection);
    }

    protected onLoad (): void {
        this._sprite = this.getComponent(Sprite);
        this._characterStats = this.getComponent(CharacterStats);
        this.collectIdleFrames();
        const initialFrames = this._idleFrames.length > 0
            ? this._idleFrames
            : this.walkFrames;
        this.showAnimationFrame(initialFrames, 0);
    }

    protected onEnable (): void {
        const position = this.node.position;
        this._lastPosition.set(position.x, position.y);
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
        this._pressed.clear();
        this._activeTouchId = null;
        this._pointerDirection.set(0, 0);
    }

    protected update (dt: number): void {
        let directionX = 0;
        let directionY = 0;

        if (this._pressed.has(KeyCode.KEY_A)) directionX -= 1;
        if (this._pressed.has(KeyCode.KEY_D)) directionX += 1;
        if (this._pressed.has(KeyCode.KEY_S)) directionY -= 1;
        if (this._pressed.has(KeyCode.KEY_W)) directionY += 1;
        directionX += this._pointerDirection.x;
        directionY += this._pointerDirection.y;
        if (directionX === 0 && directionY === 0) return;

        const directionLength = Math.sqrt(
            directionX * directionX + directionY * directionY,
        );
        directionX /= directionLength;
        directionY /= directionLength;

        const moveSpeed = Math.max(
            1,
            this._characterStats?.moveSpeed ?? this.moveSpeed,
        );
        this.moveBy(directionX * moveSpeed * dt, directionY * moveSpeed * dt);
    }

    protected lateUpdate (dt: number): void {
        const position = this.node.position;
        const deltaX = position.x - this._lastPosition.x;
        const deltaY = position.y - this._lastPosition.y;
        const isMoving = deltaX * deltaX + deltaY * deltaY > 0.0001;

        if (deltaX > 0.001) this.setSpriteFacing(1);
        else if (deltaX < -0.001) this.setSpriteFacing(-1);

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

    private moveBy (deltaX: number, deltaY: number): void {
        const directionLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (directionLength > 0.001) {
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
        mapNode.setPosition(-cameraX, -cameraY, mapPosition.z);
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
