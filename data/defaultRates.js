const defaultPrizeRates = {
    '4D': { first: 525000, second: 165000 },
    '3D': { first: 80000, second: 26000 },
    '2D': { first: 8000, second: 2600 },
    '1D': { first: 800, second: 260 },
    'POSITIONAL': { first: 0, second: 0 },
    'COMBO': { first: 0, second: 0 },
};

const defaultCommissionRates = {
    '4D': 20,
    '3D': 17,
    '2D': 13,
    '1D': 10,
    'POSITIONAL': 0,
    'COMBO': 0,
};

module.exports = {
    defaultPrizeRates,
    defaultCommissionRates
};
