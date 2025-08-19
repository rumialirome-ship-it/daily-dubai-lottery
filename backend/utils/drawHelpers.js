const DrawStatus = {
    Upcoming: 'UPCOMING',
    Open: 'OPEN',
    Closed: 'CLOSED',
    Finished: 'FINISHED',
    Suspended: 'SUSPENDED'
};

const getDynamicDrawStatus = (draw, currentTime, marketOverride) => {
    // 1. Final states set by admin are not overridden by time-based logic.
    if (draw.status === DrawStatus.Finished || draw.status === DrawStatus.Suspended) {
        return draw.status;
    }
    
    // 2. Admin manual market override takes next highest precedence.
    if (marketOverride === 'OPEN') return DrawStatus.Open;
    if (marketOverride === 'CLOSED') return DrawStatus.Closed;

    // --- Automatic Time-Based Logic ---
    const drawTime = new Date(draw.drawTime);
    
    // 3. If the draw time has already passed, it's always closed (if not yet finished).
    if (currentTime >= drawTime) {
        return DrawStatus.Closed;
    }

    // Define the overall market hours for the current day.
    const marketOpenTime = new Date(currentTime);
    marketOpenTime.setHours(10, 0, 0, 0); // 10:00 AM

    const marketCloseTime = new Date(currentTime);
    marketCloseTime.setHours(23, 0, 0, 0); // 11:00 PM

    // 4. Check if the entire market is outside of its daily operational hours.
    if (currentTime < marketOpenTime || currentTime >= marketCloseTime) {
        // Since we already established the draw is in the future, if the market is closed, the draw is UPCOMING.
        return DrawStatus.Upcoming;
    }

    // 5. The market is open and the draw is in the future. Check the 15-min booking window.
    const bookingCloseTime = new Date(drawTime.getTime() - 15 * 60 * 1000);
    if (currentTime >= bookingCloseTime) {
        return DrawStatus.Closed;
    }
    
    // 6. If none of the above conditions are met, the draw is open for betting.
    return DrawStatus.Open;
};

module.exports = { getDynamicDrawStatus };
