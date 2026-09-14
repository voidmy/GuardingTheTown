import { _decorator, Button, Component, Label, Node } from 'cc';
import { ProgressionUIController } from './ProgressionUI';
const { ccclass, menu } = _decorator;
const SKILLS = [
    { skill:0,name:'基础射击',node:'ShootingRow' },{ skill:1,name:'穿透箭',node:'ArrowRow' },
    { skill:2,name:'气刃',node:'BladeRow' },{ skill:3,name:'小旋风',node:'TornadoRow' },
] as const;
interface SkillRow {skill:number;name:string;status:Label;decrease:Button;increase:Button;obtain:Button;evolve:Button;}

@ccclass('CheatPanel')
@menu('Gameplay/Cheat Panel')
export class CheatPanel extends Component {
    private _controller: ProgressionUIController | null = null;
    private readonly _rows: SkillRow[] = [];
    private _summary: Label | null = null;
    private _message: Label | null = null;
    private _qualification: Button | null = null;
    private _bound = false;
    protected onLoad (): void { this.bindNodes(); }
    protected onEnable (): void { this.refresh(); }
    public setController (controller: ProgressionUIController): void {
        this._controller = controller; this.bindNodes(); this.refresh();
    }
    public refresh (): void {
        if (!this._controller || !this.bindNodes()) return;
        const snapshot = this._controller.getProgressionSnapshot();
        this._summary.string = `角色 Lv.${snapshot.playerLevel} · 技能 ${snapshot.skills.length}/3 · 核心 ${snapshot.cores.map((core) => core.name).join('、') || '无'}\n`
            + (snapshot.evolutionUsed ? '本局进化已使用' : snapshot.evolutionAvailable ? '进化资格可用'
                : snapshot.evolutionGranted ? '已有资格，升至 Lv.5 即可进化' : '可领取进化资格后测试进化');
        this._qualification.interactable = !snapshot.evolutionGranted && !snapshot.evolutionUsed;
        this._rows.forEach((row) => {
            const current = snapshot.skills.find((item) => item.skill === row.skill);
            const level = current?.level ?? 0;
            row.status.string = `${row.name}  ${level > 0 ? `Lv.${level}` : '未获得'}${current?.innate ? ' · 本命' : ''}${current?.evolved ? ' · 已进化' : ''}`;
            row.decrease.interactable = level > (current?.innate ? 1 : 0);
            row.increase.interactable = level < 5;
            row.obtain.interactable = level === 0;
            row.evolve.interactable = level === 5 && !current?.evolved && snapshot.evolutionAvailable && !snapshot.evolutionUsed;
        });
    }
    private bindNodes (): boolean {
        if (this._bound) return true;
        const content = this.node.getChildByName('Content');
        if (!content) return false;
        this._summary = content.getChildByName('Summary')?.getComponent(Label) ?? null;
        this._message = content.getChildByName('Message')?.getComponent(Label) ?? null;
        const close = this.button(content,'CloseButton');
        const all = this.button(content,'MaxAllButton');
        const qualification = this.button(content,'GrantEvolutionButton');
        const addMonsters = this.button(content,'AddMonstersButton');
        this._qualification = qualification;
        const rows = SKILLS.map((definition) => {
            const node = content.getChildByName(definition.node);
            return {skill:definition.skill,name:definition.name,status:node?.getChildByName('Status')?.getComponent(Label),
                decrease:this.button(node,'DecreaseButton'),increase:this.button(node,'IncreaseButton'),
                obtain:this.button(node,'ObtainButton'),evolve:this.button(node,'EvolveButton')};
        });
        if (!this._summary || !this._message || !close || !all || !qualification || !addMonsters
            || rows.some((row) => !row.status || !row.decrease || !row.increase || !row.obtain || !row.evolve)) return false;
        close.node.on(Button.EventType.CLICK,() => this._controller?.closeCheats(),this);
        all.node.on(Button.EventType.CLICK,() => {this._controller?.debugMaxAllSkills();this.feedback('四个技能已设为 Lv.5');},this);
        qualification.node.on(Button.EventType.CLICK,() => {this._controller?.debugGrantEvolution();this.feedback('已请求进化资格');},this);
        addMonsters.node.on(Button.EventType.CLICK,() => {
            const added = this._controller?.debugAddMonsters() ?? 0;
            this.feedback(added === 100 ? '已添加100只小怪' : added > 0
                ? `已添加${added}只小怪，已达数量上限` : '当前无法添加小怪或已达数量上限');
        },this);
        rows.forEach((row) => {
            this._rows.push(row);
            row.decrease.node.on(Button.EventType.CLICK,() => this.changeLevel(row.skill,-1),this);
            row.increase.node.on(Button.EventType.CLICK,() => this.changeLevel(row.skill,1),this);
            row.obtain.node.on(Button.EventType.CLICK,() => this.feedback(this._controller?.debugSetSkillLevel(row.skill,1)
                ? `已获得${row.name}` : '技能未应用，请重试'),this);
            row.evolve.node.on(Button.EventType.CLICK,() => this.feedback(this._controller?.debugEvolveSkill(row.skill)
                ? `${row.name}已进化` : '请先领取资格；本局只能进化一次'),this);
        });
        this._bound = true; return true;
    }
    private button (node: Node | null | undefined,name: string): Button | null {
        return node?.getChildByName(name)?.getComponent(Button) ?? null;
    }
    private changeLevel (skill: number,delta: number): void {
        if (!this._controller) return;
        const current = this._controller.getProgressionSnapshot().skills.find((item) => item.skill === skill);
        const next = Math.max(current?.innate ? 1 : 0,Math.min(5,(current?.level ?? 0) + delta));
        this.feedback(this._controller.debugSetSkillLevel(skill,next) ? '技能等级已应用' : '技能等级未应用，请重试');
    }
    private feedback (message: string): void {if (this._message) this._message.string = message;this.refresh();}
}
