import { useState } from "react";
import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { COINS_PER_TOKEN, MIN_SETTLE_COINS, SOL_FAUCET } from "@shared";

export function WalletPanel({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [amount, setAmount] = useState<number>(MIN_SETTLE_COINS);

  const hasWallet = !!g.walletAddress;
  const maxCoins = g.coins;
  const tokens = Math.floor(Math.min(amount, maxCoins) / COINS_PER_TOKEN);

  const f = g.solFaucet ?? {
    enabled: false, perClaimSol: SOL_FAUCET.perClaimSol, maxClaimsPerDay: SOL_FAUCET.maxClaimsPerDay,
    claimsLeft: SOL_FAUCET.maxClaimsPerDay, poolLeftSol: SOL_FAUCET.dailyBudgetSol,
  };
  const canClaim = hasWallet && f.enabled && f.claimsLeft > 0 && f.poolLeftSol >= f.perClaimSol;
  const claimLabel = !hasWallet ? "Connect a wallet to claim"
    : !f.enabled ? "SOL rewards paused — back soon"
    : f.claimsLeft <= 0 ? "Claimed today ✓ — back tomorrow"
    : f.poolLeftSol < f.perClaimSol ? "Pool refilling — try later"
    : `Claim ${f.perClaimSol} SOL`;

  return (
    <Modal title="💰 Wallet & Rewards" coins={g.coins} onClose={onClose}>
      <div className="wallet-panel">
        <div className="kv">
          <span>Wallet</span>
          <strong>{g.walletAddress ?? "Guest (no wallet)"}</strong>
        </div>
        <div className="kv">
          <span>In-game coins</span>
          <strong>🪙 {g.coins}</strong>
        </div>

        <div className="sol-faucet">
          <div className="sol-faucet-head">
            <strong>🪂 Daily SOL Reward</strong>
          </div>
          <p className="hint">
            A shared <b>{SOL_FAUCET.dailyBudgetSol} SOL</b>/day pool, spread evenly across all players —
            claim up to <b>{f.maxClaimsPerDay}×</b> a day ({f.perClaimSol} SOL each), straight to your wallet.
          </p>
          <div className="settle-row">
            <span>Your claims left today</span>
            <span><strong>{f.claimsLeft}/{f.maxClaimsPerDay}</strong></span>
          </div>
          <button className="btn btn-solana" disabled={!canClaim} onClick={() => game.claimSol()}>
            {claimLabel}
          </button>
        </div>

        <hr />

        <div className="kv">
          <span>Coin settlement (coming later)</span>
          <strong>{COINS_PER_TOKEN} coins = 1 COIN (SPL)</strong>
        </div>

        {!hasWallet ? (
          <p className="hint">
            Connect a Solana wallet at login to claim your daily SOL rewards, paid straight to your wallet.
          </p>
        ) : (
          <>
            <label className="field-label">Coins to settle</label>
            <input
              type="range"
              min={0}
              max={maxCoins}
              step={COINS_PER_TOKEN}
              value={Math.min(amount, maxCoins)}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="settle-row">
              <span>Settling <strong>{Math.min(amount, maxCoins)}</strong> coins</span>
              <span>➜ <strong>{tokens} COIN</strong></span>
            </div>
            <button
              className="btn btn-solana"
              disabled={tokens < 1}
              onClick={() => game.settle(Math.min(amount, maxCoins))}
            >
              Settle to Solana
            </button>
            <p className="hint">
              Coin-to-token settlement is coming later — the SPL token isn't live yet, so this is ledger-only
              for now and your coins are kept. Your real payouts come from the daily SOL pool above.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
