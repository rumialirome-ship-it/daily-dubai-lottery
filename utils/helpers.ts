import { Bet, GameType, BettingCondition, Draw, DrawStatus, Client, MarketOverride } from '../types/index.ts';
import { defaultPrizeRates, defaultCommissionRates } from '../data/mockData.ts';

export const normalizeClientData = (client: Partial<Client>): Client => {
    if (!client) return {} as Client;

    const normalized = { ...client };

    // Ensure wallet is always a number to prevent crashes.
    normalized.wallet = typeof client.wallet === 'number' ? client.wallet : 0;

    // Ensure prizeRates and commissionRates are non-null objects by merging with defaults.
    // This robustly prevents crashes if the API returns null or incomplete rate objects,
    // which was a primary cause of login failures.
    normalized.prizeRates = {
        ...defaultPrizeRates,
        ...(client.prizeRates || {}),
    };

    normalized.commissionRates = {
        ...defaultCommissionRates,
        ...(client.commissionRates || {}),
    };

    // Cast to Client, assuming other required properties are present from the API.
    return normalized as Client;
};


const checkMatch = (betNumber: string, betGameType: GameType, winningNumber: string): boolean => {
    if (winningNumber.length !== 4) return false;
    switch (betGameType) {
        case GameType.FourDigits: return betNumber.length === 4 && betNumber === winningNumber;
        case GameType.ThreeDigits: return betNumber.length === 3 && winningNumber.startsWith(betNumber);
        case GameType.TwoDigits: return betNumber.length === 2 && winningNumber.startsWith(betNumber);
        case GameType.OneDigit: return betNumber.length === 1 ? winningNumber.includes(betNumber) : false;
        default: return false;
    }
};

export const isBetWinner = (bet: Bet, winningNumbers: string[]): boolean => {
    if (!winningNumbers || winningNumbers.length === 0 || !bet.number) {
        return false;
    }

    const firstPrizeNumber = winningNumbers[0];
    const secondPrizeNumbers = winningNumbers.slice(1);

    if (bet.gameType === GameType.Positional) {
        // Positional bets ONLY apply to the First prize number.
        // They can only win if their condition is First.
        if (bet.condition === BettingCondition.Second) {
            return false;
        }

        // Check for legacy positional bets (sequence match) first.
        // These have a defined `positions` array.
        if (bet.positions && bet.positions.length > 0) {
            if (firstPrizeNumber.length !== 4) return false;
            const sortedPositions = [...bet.positions].sort((a, b) => a - b);
            if (sortedPositions.length !== bet.number.length) return false;

            let targetSubstring = '';
            for (const pos of sortedPositions) {
                if (pos < 1 || pos > 4) return false;
                targetSubstring += firstPrizeNumber[pos - 1];
            }
            return bet.number === targetSubstring;
        }

        // New positional bet logic (pattern match, e.g., "5X1X")
        // These bets won't have the `positions` property set.
        const betPattern = bet.number;
        if (betPattern.length === 4 && firstPrizeNumber.length === 4) {
            for (let i = 0; i < 4; i++) {
                const patternChar = betPattern[i].toUpperCase();
                if (patternChar !== 'X' && patternChar !== firstPrizeNumber[i]) {
                    return false; // Mismatch
                }
            }
            return true; // All non-X characters matched
        }
        
        return false; // Not a valid positional bet if it reaches here
    }

    switch (bet.condition) {
        case BettingCondition.First:
            return checkMatch(bet.number, bet.gameType, firstPrizeNumber);
        case BettingCondition.Second:
            return secondPrizeNumbers.some(wn => checkMatch(bet.number, bet.gameType, wn));
        default:
            return false;
    }
};


export const getPermutations = (digits: number[], size: number): string[] => {
    const result: string[] = [];
    if (size > digits.length) {
        return [];
    }
    const backtrack = (permutation: string[], used: boolean[]) => {
        if (permutation.length === size) {
            result.push(permutation.join(''));
            return;
        }
        for (let i = 0; i < digits.length; i++) {
            if (used[i]) continue;
            permutation.push(String(digits[i]));
            backtrack(permutation, used);
            permutation.pop();
            used[i] = false;
        }
    };
    backtrack([], Array(digits.length).fill(false));
    return result;
};

export const generateAllSubstrings = (str: string): string[] => {
    const substrings = new Set<string>();
    for (let i = 0; i < str.length; i++) {
        for (let j = i + 1; j < str.length + 1; j++) {
            substrings.add(str.slice(i, j));
        }
    }
    return Array.from(substrings);
}

export const getGameTypeDisplayName = (gameType: GameType): string => {
    switch (gameType) {
        case GameType.OneDigit: return '1 Digit';
        case GameType.TwoDigits: return '2 Digits';
        case GameType.ThreeDigits: return '3 Digits';
        case GameType.FourDigits: return '4 Digits';
        case GameType.Combo: return 'Combo';
        case GameType.Positional: return 'Multi Positional 1 digit';
        default: return gameType;
    }
};
