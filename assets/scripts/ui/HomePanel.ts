import { _decorator, Button, Color, Component, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { GameSkill } from '../GameSettings';
import { CHARMS, POTIONS, PotionId } from '../progression/ExpeditionDefinitions';
import { ExpeditionLoadout, ExpeditionLoadoutPreferences } from '../progression/ExpeditionLoadout';
import { MetaProgress } from '../progression/MetaProgress';
import { SkillMastery } from '../progression/SkillMastery';
import { SKILL_LEVEL_DESCRIPTIONS, SKILL_NAMES } from '../progression/UpgradeDefinitions';

const { ccclass, property } = _decorator;
type Page = 'skills' | 'potions' | 'charms';
const PAGES: readonly Page[] = ['skills', 'potions', 'charms'];
const PAGE_NAMES = ['本命技能', '随行灵露', '守镇灵契'];
const WHITE = new Color(255, 255, 255);
const SELECTED = new Color(170, 238, 210);

interface CardView {
    node: Node; name: Label; icon: Sprite; effect: Label; state: Label;
    action: Button; actionLabel: Label; frame: Sprite;
}

/** Three serialized cards are reused across pages; no runtime UI creation or update loop. */
@ccclass('HomePanel')
export class HomePanel extends Component {
    @property(SpriteFrame) public shootingIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public arrowIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public bladeIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public thunderIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public chainIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public swordQiIcon: SpriteFrame | null = null;
    @property(SpriteFrame) public potionIcon: SpriteFrame | null = null;

    private _begin: ((loadout: ExpeditionLoadout) => string) | null = null;
    private _bound = false;
    private _starting = false;
    private _page: Page = 'skills';
    private _pageIndex = 0;
    private _slot = 0;
    private _skills: readonly GameSkill[] = [];
    private _potions: readonly PotionId[] = [];
    private _preferences: ExpeditionLoadoutPreferences | null = null;
    private readonly _cards: CardView[] = [];
    private readonly _charmIcons: (SpriteFrame | null)[] = [];
    private _skillIcons: (SpriteFrame | null)[] = [];

    public configure (
        skills: readonly GameSkill[], potions: readonly PotionId[],
        begin: (loadout: ExpeditionLoadout) => string,
    ): void {
        this._begin = begin;
        this._skills = skills;
        this._potions = potions;
        this._preferences = new ExpeditionLoadoutPreferences(skills.filter(skill => SkillMastery.instance.owns(skill)), potions);
        this._starting = false;
        this._skillIcons = [this.shootingIcon, this.arrowIcon, this.bladeIcon, null,
            this.thunderIcon, this.chainIcon, null, this.swordQiIcon];
        if (!this._bound) {
            this._bound = true;
            for (let index = 0; index < 3; index++) {
                const node = this.node.getChildByName(`Card_${index}`)!;
                const label = (path: string): Label => node.getChildByPath(path)!.getComponent(Label)!;
                const icon = node.getChildByName('Icon')!.getComponent(Sprite)!;
                this._charmIcons.push(icon.spriteFrame);
                this._cards.push({ node, name: label('Name'), icon, effect: label('Effect'),
                    state: label('State'), action: node.getChildByName('Action')!.getComponent(Button)!,
                    actionLabel: label('Action/Label'), frame: node.getComponent(Sprite)! });
                this.button(`Card_${index}/Action`, () => this.selectCard(index));
                this.button(`Tab_${PAGES[index]}`, () => {
                    this._page = PAGES[index];
                    this._pageIndex = 0;
                    this.notice('');
                    this.refresh();
                });
                this.button(`Slot_${index}`, () => { this._slot = index; this.refresh(); });
            }
            this.button('Previous', () => { this._pageIndex--; this.refresh(); });
            this.button('Next', () => { this._pageIndex++; this.refresh(); });
            this.button('Unequip', () => {
                if (this._page === 'charms') {
                    this.notice(MetaProgress.instance.equip(null) ? '本局不携带灵契。' : MetaProgress.instance.error);
                } else {
                    this._preferences!.potions.fill(null);
                    this.remember('随行灵露已清空，可留空出发。');
                }
                this.refresh();
            });
            this.button('Start', () => this.startExpedition());
        }
        this.notice(skills.length === 0 ? '暂无可用的本命技能，请检查技能资源配置。'
            : SkillMastery.instance.error || this._preferences.notice || '未掌握的技能可指定研习；战斗中拾取秘籍先体验，失败也保留研习。');
        this.refresh();
    }

    private get capacity (): number { return MetaProgress.instance.equipped === 'satchel' ? 3 : 2; }

    private selectCard (index: number): void {
        if (this._starting || !this._preferences) return;
        const entry = this._pageIndex * 3 + index;
        if (this._page === 'skills') {
            const skill = this._skills[entry];
            if (skill === undefined) return;
            if (!SkillMastery.instance.owns(skill)) {
                this.notice(SkillMastery.instance.setFocus(skill)
                    ? `优先研习：${SKILL_NAMES[skill]}。一分钟后寻找青色秘籍宝匣，拾取后本局可用。`
                    : SkillMastery.instance.error);
                this.refresh();
                return;
            }
            this._preferences.skill = skill;
            this.remember(`本命已定：${SKILL_NAMES[skill]} · 以 Lv.1 出战`);
        } else if (this._page === 'potions') {
            const potion = this._potions[entry] ?? null;
            this._preferences.potions[this._slot] = potion;
            this.remember(potion ? `第 ${this._slot + 1} 格携带：${POTIONS[potion].name}` : `第 ${this._slot + 1} 格已留空。`);
        } else {
            const charm = CHARMS[entry];
            if (!charm) return;
            const profile = MetaProgress.instance;
            this.notice(profile.owns(charm.id)
                ? profile.equip(charm.id) ? `本局携带：${charm.name}` : profile.error
                : profile.purchase(charm.id));
        }
        this.refresh();
    }

    private startExpedition (): void {
        const preferences = this._preferences;
        if (this._starting || !this._begin || preferences?.skill == null) return;
        this._starting = true;
        try {
            const error = this._begin({ skill: preferences.skill, charm: MetaProgress.instance.equipped,
                potions: preferences.potions.slice(0, this.capacity) });
            if (!error) return;
            this.notice(error);
        } catch (error) {
            console.error('[HomePanel] 启程失败', error);
            this.notice('启程暂未完成，请再次尝试。');
        }
        this._starting = false;
        this.refresh();
    }

    private refresh (): void {
        const preferences = this._preferences;
        if (!preferences) return;
        const profile = MetaProgress.instance;
        this._slot = Math.min(this._slot, this.capacity - 1);
        const count = this._page === 'skills' ? this._skills.length
            : this._page === 'potions' ? this._potions.length + 1 : CHARMS.length;
        const pages = Math.max(1, Math.ceil(count / 3));
        this._pageIndex = Math.min(pages - 1, Math.max(0, this._pageIndex));
        this.label('Balance', `梦砂  ${profile.sand}`);
        for (let index = 0; index < 3; index++) {
            const card = this._cards[index];
            const entry = this._pageIndex * 3 + index;
            card.node.active = entry < count;
            if (!card.node.active) continue;
            let selected = false;
            card.action.interactable = true;
            card.icon.color = WHITE;
            if (this._page === 'skills') {
                const skill = this._skills[entry];
                const mastery = SkillMastery.instance;
                const owned = mastery.owns(skill);
                selected = preferences.skill === skill;
                card.name.string = SKILL_NAMES[skill];
                card.icon.spriteFrame = this._skillIcons[skill];
                card.effect.string = SKILL_LEVEL_DESCRIPTIONS[skill][1];
                card.state.string = owned ? selected ? '本局本命 · Lv.1' : '已掌握 · 可选本命'
                    : `研习 ${mastery.points(skill)} / ${mastery.goal(skill)} · ${mastery.focus === skill ? '优先研习' : '未掌握'}`;
                card.actionLabel.string = owned ? selected ? '已选为本命' : '选为本命'
                    : mastery.focus === skill ? '正在研习' : '优先研习';
                card.action.interactable = owned ? !selected : mastery.canResearch && mastery.focus !== skill;
            } else if (this._page === 'potions') {
                const potion = this._potions[entry] ?? null;
                selected = preferences.potions[this._slot] === potion;
                card.name.string = potion ? POTIONS[potion].name : '留一格余地';
                card.icon.spriteFrame = potion ? this.potionIcon : null;
                if (potion) {
                    const color = POTIONS[potion].color;
                    card.icon.color = new Color(color[0], color[1], color[2]);
                }
                card.effect.string = potion ? POTIONS[potion].description : '这一格不携带灵露，留给途中拾取。也可以点击其他栏位，分别配置。';
                card.state.string = selected ? (potion ? `已放入第 ${this._slot + 1} 格` : `第 ${this._slot + 1} 格留空`) : '免费补给 · 每格 1 瓶';
                card.actionLabel.string = selected ? (potion ? '本格已携带' : '本格已留空')
                    : potion ? `放入第 ${this._slot + 1} 格` : '本格留空';
                card.action.interactable = !selected;
            } else {
                const charm = CHARMS[entry];
                const owned = profile.owns(charm.id);
                selected = profile.equipped === charm.id;
                card.name.string = charm.name;
                card.icon.spriteFrame = this._charmIcons[entry];
                card.effect.string = `${charm.description}\n${charm.flavor}`;
                card.state.string = selected ? '本局携带' : owned ? '已永久解锁' : `${charm.price} 梦砂 · 永久解锁`;
                card.actionLabel.string = selected ? '已携带' : owned ? '携带灵契'
                    : profile.sand >= charm.price ? `购买 · ${charm.price}` : `还差 ${charm.price - profile.sand} 梦砂`;
                card.action.interactable = !selected && !profile.error && (owned || profile.sand >= charm.price);
            }
            card.icon.node.active = !!card.icon.spriteFrame;
            if (card.icon.spriteFrame) {
                const size = card.icon.spriteFrame.originalSize;
                const scale = 96 / Math.max(1, size.width, size.height);
                card.icon.node.getComponent(UITransform)!.setContentSize(size.width * scale, size.height * scale);
            }
            card.frame.color = selected ? SELECTED : WHITE;
        }
        for (let index = 0; index < 3; index++) {
            const tab = this.node.getChildByName(`Tab_${PAGES[index]}`)!;
            tab.getComponent(Sprite)!.color = this._page === PAGES[index] ? SELECTED : WHITE;
            this.label(`Tab_${PAGES[index]}/Label`, `${this._page === PAGES[index] ? '◆ ' : ''}${PAGE_NAMES[index]}`);
            const slot = this.node.getChildByName(`Slot_${index}`)!;
            slot.active = this._page === 'potions';
            slot.getComponent(Button)!.interactable = index < this.capacity;
            slot.getComponent(Sprite)!.color = index === this._slot ? SELECTED : WHITE;
            const potion = preferences.potions[index];
            this.label(`Slot_${index}/Label`, index >= this.capacity ? '第 3 格 · 需藏露灵契'
                : `${index === this._slot ? '◆ ' : ''}${index + 1} · ${potion ? POTIONS[potion].name : '空栏'}`);
        }
        this.node.getChildByName('Previous')!.active = pages > 1;
        this.node.getChildByName('Next')!.active = pages > 1;
        this.node.getChildByName('Previous')!.getComponent(Button)!.interactable = this._pageIndex > 0;
        this.node.getChildByName('Next')!.getComponent(Button)!.interactable = this._pageIndex < pages - 1;
        this.label('PageNumber', `${this._pageIndex + 1} / ${pages}`);
        this.node.getChildByName('PageNumber')!.active = this._page !== 'potions';
        this.node.getChildByName('Unequip')!.active = this._page !== 'skills';
        this.label('Unequip/Label', this._page === 'charms' ? '不带灵契' : '清空灵露');
        const charm = CHARMS.find(value => value.id === profile.equipped);
        const bottles = preferences.potions.slice(0, this.capacity)
            .map((id, index) => `${index + 1}·${id ? POTIONS[id].name : '空栏'}`).join('  /  ');
        this.label('Selection', `本命：${preferences.skill == null ? '尚未选择' : SKILL_NAMES[preferences.skill] + ' Lv.1'}    ·    灵契：${charm?.name ?? '不携带'}\n随行：${bottles}`);
        const canStart = preferences.skill != null && this._skills.includes(preferences.skill)
            && SkillMastery.instance.owns(preferences.skill);
        this.node.getChildByName('Start')!.getComponent(Button)!.interactable = canStart && !this._starting;
        this.label('Start/Label', canStart ? '携卷出发 · 开始守镇' : '请先选择本命技能');
        this.label('Subtitle', this._page === 'skills' ? '已掌握可选本命 · 秘籍先体验，研习后永久掌握'
            : this._page === 'potions' ? '先选栏位，再放入灵露 · 可重复携带或留空'
                : '拾梦砂 · 结灵契 · 每局携带一件');
    }

    private remember (message: string): void {
        this._preferences!.save();
        this.notice(this._preferences!.notice || message);
    }
    private button (path: string, action: () => void): void {
        this.node.getChildByPath(path)?.on(Button.EventType.CLICK, action, this);
    }
    private label (path: string, value: string): void {
        const label = this.node.getChildByPath(path)?.getComponent(Label);
        if (label) label.string = value;
    }
    private notice (text: string): void { this.label('Notice', text); }
}
