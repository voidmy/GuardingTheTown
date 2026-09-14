import { Ability, AbilityFrameContext } from './CombatTypes';

export class AbilityController {
    private readonly _abilities: Ability[] = [];

    public addAbility (ability: Ability): void {
        this._abilities.push(ability);
    }

    public update (dt: number, context: AbilityFrameContext): void {
        for (const ability of this._abilities) {
            ability.updateAbility(dt, context);
        }
    }

    public removeAbility (id: string): void {
        for (let index = this._abilities.length - 1; index >= 0; index--) {
            if (this._abilities[index].id !== id) continue;
            this._abilities[index].destroyAbility?.();
            this._abilities.splice(index, 1);
        }
    }

    public clear (): void {
        for (const ability of this._abilities) {
            ability.destroyAbility?.();
        }
        this._abilities.length = 0;
    }
}
