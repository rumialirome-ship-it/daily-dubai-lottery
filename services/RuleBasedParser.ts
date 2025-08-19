
import { ParsedBet, GameType, BettingCondition } from '../types/index.ts';

function getGameTypeForNumber(numStr: string): GameType | null {
    const upperCaseNum = numStr.toUpperCase();
    if (upperCaseNum.includes('X')) {
        // Positional bets must be 4 characters long with X as a wildcard
        return upperCaseNum.length === 4 && upperCaseNum.replace(/[^X]/g, '').length > 0 ? GameType.Positional : null;
    }
    switch (numStr.length) {
        case 1: return GameType.OneDigit;
        case 2: return GameType.TwoDigits;
        case 3: return GameType.ThreeDigits;
        case 4: return GameType.FourDigits;
        default: return null;
    }
}

export function parseMessageWithRules(message: string): ParsedBet[] {
    const parsedBets: ParsedBet[] = [];
    if (!message || !message.trim()) {
        return parsedBets;
    }

    const cleanedMessage = message
        .toLowerCase()
        // Replace all problematic symbols with a space to ensure tokenization
        .replace(/[.,;/{}@#*^%&()_=+~`'"-]/g, ' ') 
        .replace(/\s+/g, ' ')
        .trim();

    const tokens = cleanedMessage.split(' ');
    
    let numbersBuffer: string[] = [];
    const defaultStake = 5;
    let justProcessedStake = false;

    const finalizeBufferWithDefaultStake = () => {
        if (numbersBuffer.length > 0 && !justProcessedStake) {
            numbersBuffer.forEach(num => {
                const gameType = getGameTypeForNumber(num);
                if (gameType) {
                    parsedBets.push({ number: num, stake: defaultStake, gameType, condition: undefined });
                }
            });
        }
        numbersBuffer = [];
        justProcessedStake = false;
    };

    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        // New parser for positional format: "p<pos> <digit> [stake]"
        const positionalMatch = token.match(/^p([1-4])$/i);
        if (positionalMatch && tokens[i + 1] && /^\d$/.test(tokens[i + 1])) {
            finalizeBufferWithDefaultStake(); // Process any numbers before this special format

            const position = parseInt(positionalMatch[1], 10);
            const digit = tokens[i + 1];
            let stake = -1;
            let condition: BettingCondition | undefined = undefined;
            let stakeTokensConsumed = 0;

            const stakeToken1 = tokens[i + 2];
            const stakeToken2 = tokens[i + 3];

            if (stakeToken1) {
                const f_s_stake_match = stakeToken1.match(/^(f|s)(\d+)$/);
                const stake_rs_match = stakeToken1.match(/^(\d+)(rs)?$/);

                if ((stakeToken1 === 'f' || stakeToken1 === 's') && stakeToken2 && /^\d+$/.test(stakeToken2)) {
                    condition = stakeToken1 === 's' ? BettingCondition.Second : BettingCondition.First;
                    stake = parseInt(stakeToken2, 10);
                    stakeTokensConsumed = 2;
                } else if (f_s_stake_match) {
                    condition = f_s_stake_match[1] === 's' ? BettingCondition.Second : BettingCondition.First;
                    stake = parseInt(f_s_stake_match[2], 10);
                    stakeTokensConsumed = 1;
                } else if ((stakeToken1 === 'all' || stakeToken1 === 'sab') && stakeToken2 && /^\d+$/.test(stakeToken2)) {
                    stake = parseInt(stakeToken2, 10);
                    stakeTokensConsumed = 2;
                } else if (stake_rs_match) {
                    stake = parseInt(stake_rs_match[1], 10);
                    stakeTokensConsumed = 1;
                }
            }

            const patternArray = ['X', 'X', 'X', 'X'];
            patternArray[position - 1] = digit;
            const pattern = patternArray.join('');

            parsedBets.push({
                number: pattern,
                stake: stake !== -1 ? stake : defaultStake,
                gameType: GameType.Positional,
                condition,
            });

            i += 2 + stakeTokensConsumed; // Advance past p<pos>, <digit>, and any stake tokens
            numbersBuffer = []; // This format is self-contained
            justProcessedStake = false;
            continue;
        }

        // Existing parser for regular numbers and X-patterns
        if (/^([0-9x]{1,4})$/.test(token)) {
            if (justProcessedStake) {
                numbersBuffer = [];
                justProcessedStake = false;
            }
            numbersBuffer.push(token.toUpperCase());
            i++;
            continue;
        }

        let stake = -1;
        let condition: BettingCondition | undefined = undefined;
        let tokensConsumed = 0;

        const f_s_stake_match = token.match(/^(f|s)(\d+)$/);
        const stake_rs_match = token.match(/^(\d+)(rs)?$/);

        if ((token === 'f' || token === 's') && tokens[i+1] && /^\d+$/.test(tokens[i+1])) {
            condition = token === 's' ? BettingCondition.Second : BettingCondition.First;
            stake = parseInt(tokens[i+1], 10);
            tokensConsumed = 2;
        } else if (f_s_stake_match) {
            condition = f_s_stake_match[1] === 's' ? BettingCondition.Second : BettingCondition.First;
            stake = parseInt(f_s_stake_match[2], 10);
            tokensConsumed = 1;
        } else if ((token === 'all' || token === 'sab') && tokens[i+1] && /^\d+$/.test(tokens[i+1])) {
            stake = parseInt(tokens[i+1], 10);
            tokensConsumed = 2;
        } else if (stake_rs_match) {
            stake = parseInt(stake_rs_match[1], 10);
            tokensConsumed = 1;
        }

        if (stake !== -1) {
            if (numbersBuffer.length > 0) {
                numbersBuffer.forEach(num => {
                    const gameType = getGameTypeForNumber(num);
                    if (gameType) {
                        parsedBets.push({ number: num, stake, gameType, condition });
                    }
                });
                justProcessedStake = true;
            }
            i += tokensConsumed;
        } else {
            finalizeBufferWithDefaultStake();
            i++;
        }
    }

    finalizeBufferWithDefaultStake();

    return parsedBets;
}