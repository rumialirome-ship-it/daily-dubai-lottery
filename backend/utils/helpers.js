const GameType = {
    OneDigit: '1D', TwoDigits: '2D', ThreeDigits: '3D', FourDigits: '4D',
    Combo: 'COMBO', Positional: 'POSITIONAL'
};
const BettingCondition = { First: 'FIRST', Second: 'SECOND' };

const checkMatch = (betNumber, betGameType, winningNumber) => {
    if (winningNumber.length !== 4) return false;
    switch (betGameType) {
        case GameType.FourDigits: return betNumber.length === 4 && betNumber === winningNumber;
        case GameType.ThreeDigits: return betNumber.length === 3 && winningNumber.startsWith(betNumber);
        case GameType.TwoDigits: return betNumber.length === 2 && winningNumber.startsWith(betNumber);
        case GameType.OneDigit: return betNumber.length === 1 ? winningNumber.includes(betNumber) : false;
        default: return false;
    }
};

const isBetWinner = (bet, winningNumbers) => {
    if (!winningNumbers || winningNumbers.length === 0 || !bet.number) {
        return false;
    }

    const firstPrizeNumber = winningNumbers[0];
    const secondPrizeNumbers = winningNumbers.slice(1);

    if (bet.gameType === GameType.Positional) {
        if (bet.condition === BettingCondition.Second) return false;
        
        const betPattern = bet.number;
        if (betPattern.length === 4 && firstPrizeNumber.length === 4) {
            for (let i = 0; i < 4; i++) {
                const patternChar = betPattern[i].toUpperCase();
                if (patternChar !== 'X' && patternChar !== firstPrizeNumber[i]) {
                    return false;
                }
            }
            return true;
        }
        return false;
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

module.exports = { isBetWinner };
