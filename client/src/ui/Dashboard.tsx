import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { PenguinPreview } from "./PenguinPreview";
import { XP_PER_LEVEL, PUFFLE_BY_ID, SOL_FAUCET } from "@shared";

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-ico">{icon}</div>
      <div className="dash-stat-val">{value}</div>
      <div className="dash-stat-label">{label}</div>
    </div>
  );
}

export function Dashboard({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const me = game.players.get(game.sessionId) as any;
  const outfit = {
    color: me?.color ?? "color_blue", head: me?.head ?? "", face: me?.face ?? "",
    neck: me?.neck ?? "", body: me?.body ?? "", hand: me?.hand ?? "", feet: me?.feet ?? "",
  };
  const puffleColor = me?.puffle ? PUFFLE_BY_ID[me.puffle]?.color : undefined;
  const into = g.xp % XP_PER_LEVEL;
  const pct = Math.round((into / XP_PER_LEVEL) * 100);

  const f = g.solFaucet ?? {
    enabled: false, perClaimSol: SOL_FAUCET.perClaimSol, maxClaimsPerDay: SOL_FAUCET.maxClaimsPerDay,
    claimsLeft: SOL_FAUCET.maxClaimsPerDay, poolLeftSol: SOL_FAUCET.dailyBudgetSol, claimedTotalSol: 0,
  };
  const hasWallet = !!g.walletAddress;
  const canClaim = hasWallet && f.enabled && f.claimsLeft > 0 && f.poolLeftSol >= f.perClaimSol;
  const claimLabel = !hasWallet ? "Connect a wallet to claim"
    : !f.enabled ? "SOL rewards paused — back soon"
    : f.claimsLeft <= 0 ? "Claimed today ✓ — back tomorrow"
    : f.poolLeftSol < f.perClaimSol ? "Pool refilling — try later"
    : `Claim ${f.perClaimSol} SOL`;

  return (
    <Modal title="📊 Dashboard" coins={g.coins} onClose={onClose}>
      <div className="dash">
        <div className="dash-hero">
          <div className="dash-av"><PenguinPreview outfit={outfit} puffleColor={puffleColor} size={120} /></div>
          <div className="dash-id">
            <div className="dash-name">{me?.name ?? "You"}</div>
            <div className="dash-rank">⭐ Lv {g.level} · {g.rank}</div>
            <div className="xp-bar dash-xpbar"><span className="xp-fill" style={{ width: `${pct}%` }} /></div>
            <div className="dash-xp">{into} / {XP_PER_LEVEL} XP to level {g.level + 1}</div>
          </div>
        </div>

        <div className="dash-sol">
          <div className="dash-sol-head">
            <strong>🪂 Claim your daily SOL</strong>
          </div>
          <div className="dash-sol-stats">
            <div><span>SOL claimed (total)</span><strong>◎ {(f.claimedTotalSol ?? 0).toFixed(4)}</strong></div>
            <div><span>Claims left today</span><strong>{f.claimsLeft} / {f.maxClaimsPerDay}</strong></div>
            <div><span>Per claim</span><strong>◎ {f.perClaimSol}</strong></div>
          </div>
          <button className="btn btn-solana" disabled={!canClaim} onClick={() => game.claimSol()}>{claimLabel}</button>
          <p className="hint">
            {hasWallet
              ? "Paid as real SOL straight to your connected wallet. The 1 SOL/day pool is shared across all players."
              : "Connect a Solana wallet at login to receive your SOL rewards."}
          </p>
        </div>

        <div className="dash-stats">
          <Stat icon="🪙" label="Coins" value={g.coins.toLocaleString()} />
          <Stat icon="💰" label="Total earned" value={g.totalEarned.toLocaleString()} />
          <Stat icon="🏅" label="Stamps" value={`${g.stamps.length}/16`} />
          <Stat icon="🥋" label="Belt" value={g.beltName} />
          <Stat icon="👥" label="Friends" value={g.friends.length} />
          <Stat icon="🐾" label="Puffles" value={g.puffles.length} />
          <Stat icon="📌" label="Pins" value={g.collectedPins.length} />
          <Stat icon="🏆" label="CJ wins" value={g.cardJitsuWins} />
        </div>
      </div>
    </Modal>
  );
}
