const path = require('path');
const { defaultPrizeRates, defaultCommissionRates } = require(path.join(__dirname, '..', 'data', 'defaultRates.js'));

const normalizeClientData = (client) => {
    if (!client) return null;
    
    // Create a copy to avoid modifying the original object
    const normalized = { ...client };

    // Remove password hash for security
    delete normalized.password;

    // Ensure wallet is a number
    normalized.wallet = Number(normalized.wallet) || 0;

    // Merge with defaults to ensure prizeRates and commissionRates are non-null, complete objects.
    // This provides consistency with the frontend and prevents potential errors.
    normalized.prizeRates = {
        ...defaultPrizeRates,
        ...(typeof normalized.prizeRates === 'string' ? JSON.parse(normalized.prizeRates) : normalized.prizeRates || {}),
    };

    normalized.commissionRates = {
        ...defaultCommissionRates,
        ...(typeof normalized.commissionRates === 'string' ? JSON.parse(normalized.commissionRates) : normalized.commissionRates || {}),
    };

    return normalized;
};

module.exports = { normalizeClientData };
