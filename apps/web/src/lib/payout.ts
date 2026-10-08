// casino_game_history.multiplier is DECIMAL(6,2), so payouts use the multiplier as it will be stored.
// Kept free of imports so the server can share it.
export const payoutFor = (bet: number, multiplier: number) =>
  Math.floor((bet * Math.round(multiplier * 100)) / 100);
