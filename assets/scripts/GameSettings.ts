import {
    _decorator,
    Component,
    Enum,
    macro,
    Node,
    Sprite,
    SpriteFrame,
    Texture2D,
    view,
} from 'cc';
import { MonsterBatchRenderer } from './monster/MonsterBatchRenderer';

const { ccclass, menu, property } = _decorator;

export enum GameBackground {
    Original = 0,
    Ink = 1,
}

Enum(GameBackground);

export enum GameMonster {
    Cotton = 0,
    InkImp = 1,
}

Enum(GameMonster);

export enum GameSkill {
    BasicAttack = 0,
    PiercingArrow = 1,
    QiBlade = 2,
    Tornado = 3,
    Thunder = 4,
    ChainLightning = 5,
    FrostPulse = 6,
    SwordQi = 7,
}

Enum(GameSkill);

@ccclass('GameSettings')
@menu('Gameplay/Game Settings')
export class GameSettings extends Component {
    @property({
        type: Enum(GameBackground),
        displayName: 'Background',
    })
    public background = GameBackground.Original;

    @property({
        type: Enum(GameMonster),
        displayName: 'Monster',
    })
    public monster = GameMonster.Cotton;

    @property({
        type: [Enum(GameSkill)],
        displayName: '旧版初始技能（已由启程秘典替代）',
        tooltip: '保留旧场景数据。正式开局技能由玩家在启程秘典选择，此项不再决定入场技能。',
    })
    public initialSkills: GameSkill[] = [
        GameSkill.QiBlade,
    ];

    @property({ type: Node, visible: false })
    public backgroundNode: Node | null = null;

    @property({ type: SpriteFrame, visible: false })
    public originalBackground: SpriteFrame | null = null;

    @property({ type: SpriteFrame, visible: false })
    public inkBackground: SpriteFrame | null = null;

    @property({ type: Node, visible: false })
    public monsterRenderLayer: Node | null = null;

    @property({ type: Texture2D, visible: false })
    public originalMonsterTexture: Texture2D | null = null;

    @property({ type: Texture2D, visible: false })
    public inkMonsterTexture: Texture2D | null = null;

    protected onLoad (): void {
        view.setOrientation(macro.ORIENTATION_LANDSCAPE);
        this.applyVisualStyle();
    }

    public hasInitialSkill (skill: GameSkill): boolean {
        return this.initialSkills.includes(skill);
    }

    private applyVisualStyle (): void {
        const backgroundSprite = this.backgroundNode?.getComponent(Sprite) ?? null;
        const spriteFrame = this.background === GameBackground.Ink
            ? this.inkBackground
            : this.originalBackground;
        const monsterTexture = this.monster === GameMonster.InkImp
            ? this.inkMonsterTexture
            : this.originalMonsterTexture;

        if (!backgroundSprite || !spriteFrame) {
            console.error('[GameSettings] Background configuration is incomplete.');
        } else {
            backgroundSprite.spriteFrame = spriteFrame;
        }

        const monsterBatches = this.monsterRenderLayer
            ?.getComponentsInChildren(MonsterBatchRenderer) ?? [];
        if (!monsterTexture || monsterBatches.length === 0) {
            console.error('[GameSettings] Monster texture configuration is incomplete.');
            return;
        }

        for (const batch of monsterBatches) batch.setTexture(monsterTexture);
    }
}
