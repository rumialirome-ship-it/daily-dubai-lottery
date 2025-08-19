import { GameType } from '../types/index.ts';

export const defaultPrizeRates: Record<GameType, { first: number, second: number }> = {
    [GameType.FourDigits]: { first: 525000, second: 165000 },
    [GameType.ThreeDigits]: { first: 80000, second: 26000 },
    [GameType.TwoDigits]: { first: 8000, second: 2600 },
    [GameType.OneDigit]: { first: 800, second: 260 },
    [GameType.Positional]: { first: 0, second: 0 },
    [GameType.Combo]: { first: 0, second: 0 },
};

export const defaultCommissionRates: Record<GameType, number> = {
    [GameType.FourDigits]: 20,
    [GameType.ThreeDigits]: 17,
    [GameType.TwoDigits]: 13,
    [GameType.OneDigit]: 10,
    [GameType.Positional]: 0,
    [GameType.Combo]: 0,
};
