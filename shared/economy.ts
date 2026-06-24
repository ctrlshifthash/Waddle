// Economy + P2E constants. Coins are tracked off-chain in the ledger now and can
// be settled to a Solana SPL token via the server's solana service.

export const STARTING_COINS = 500;

/** Per-minigame payout rule. Server validates score and awards coins. */
export const MINIGAME_PAYOUTS: Record<
  string,
  { perScore: number; max: number; label: string }
> = {
  coindash: { perScore: 1, max: 600, label: "Coin Dash" },
  jetpack: { perScore: 3, max: 600, label: "Jet Pack Adventure" },
  beancounters: { perScore: 4, max: 600, label: "Bean Counters" },
  puffleroundup: { perScore: 40, max: 400, label: "Puffle Roundup" },
  cartsurfer: { perScore: 2, max: 700, label: "Cart Surfer" },
  hydrohopper: { perScore: 4, max: 600, label: "Hydro Hopper" },
  icefishing: { perScore: 4, max: 600, label: "Ice Fishing" },
  astrobarrier: { perScore: 12, max: 600, label: "Astro Barrier" },
  pizzatron: { perScore: 3, max: 600, label: "Pizzatron 3000" },
};

/**
 * Coins -> on-chain token conversion. Example: 100 in-game coins == 1 COIN token.
 * Used by the Solana settle service when SOLANA_SETTLE_ENABLED=true.
 */
export const COINS_PER_TOKEN = 100;

/** Minimum coins a player must hold before they can settle to the chain. */
export const MIN_SETTLE_COINS = 100;

/**
 * Daily SOL faucet/pool. A fixed budget of SOL is shared across ALL players each
 * UTC day. The server HARD-CAPS total spend at `dailyBudgetSol` (never more than
 * this per 24h) and releases it gradually over the day so it spreads evenly across
 * early players and new joiners. Each player may claim up to `maxClaimsPerDay`.
 * Real SOL is only sent when SOL_FAUCET_ENABLED=true on the server (+ a funded
 * treasury); otherwise the UI shows it as "not live yet".
 */
export const SOL_FAUCET = {
  dailyBudgetSol: 1,    // hard cap across EVERYONE per UTC day
  perClaimSol: 0.002,   // SOL sent per claim (tune to spread across more players)
  maxClaimsPerDay: 3,   // per player per day
};
