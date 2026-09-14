export interface ProgressionSkillView {
    skill: number; name: string; level: number; evolved: boolean; innate: boolean;
}
export interface ProgressionSnapshot {
    playerLevel: number; experience: number; experienceToNext: number;
    skills: ProgressionSkillView[];
    cores: Array<{ id: string; name: string }>;
    refreshesRemaining: number; evolutionAvailable: boolean; evolutionGranted: boolean; evolutionUsed: boolean;
    combatStatus?: string;
}
/** HUD 与秘籍只消费视图和命令，避免循环引用战斗控制器。 */
export interface ProgressionUIController {
    getProgressionSnapshot(): ProgressionSnapshot;
    debugSetSkillLevel(skill: number, level: number): boolean;
    debugEvolveSkill(skill: number): boolean;
    debugGrantEvolution(): void;
    debugMaxAllSkills(): void;
    debugAddMonsters(): number;
    openCheats(): void;
    closeCheats(): void;
    openEvolution(): void;
}
