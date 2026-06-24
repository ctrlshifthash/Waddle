// Solana SPL-token settle layer. When SOLANA_SETTLE_ENABLED=true, payout() moves
// `tokens` of the configured SPL mint to a player's wallet:
//   - mode "mint":     treasury is the mint authority and mints fresh tokens
//   - mode "transfer": treasury holds a fixed supply and transfers from it
// When disabled, payout() is a no-op that reports the ledger-only state, so the
// rest of the game runs fully without any chain config.
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getMint,
  mintTo,
  transfer,
} from "@solana/spl-token";
import bs58 from "bs58";

export interface PayoutResult {
  ok: boolean;
  signature?: string;
  message: string;
}

class SolanaService {
  readonly enabled: boolean;        // SPL-token settle (coins -> token)
  readonly faucetEnabled: boolean;  // native-SOL daily reward pool
  private connection: Connection | null = null;
  private treasury: Keypair | null = null;
  private mint: PublicKey | null = null;
  private decimals = 0;
  private mode: "mint" | "transfer" = "mint";
  private ready: Promise<void> | null = null;

  constructor() {
    this.enabled = process.env.SOLANA_SETTLE_ENABLED === "true";
    this.faucetEnabled = process.env.SOL_FAUCET_ENABLED === "true";
    if (!this.enabled && !this.faucetEnabled) {
      console.log("[solana] settle + faucet disabled (ledger only)");
      return;
    }
    try {
      const rpc = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
      this.connection = new Connection(rpc, "confirmed");
      // one treasury keypair powers both SPL settle and the SOL faucet
      this.treasury = Keypair.fromSecretKey(
        bs58.decode(reqEnv("SOLANA_TREASURY_SECRET")),
      );
      if (this.enabled) {
        this.mint = new PublicKey(reqEnv("SOLANA_COIN_MINT"));
        this.mode = process.env.SOLANA_PAYOUT_MODE === "transfer" ? "transfer" : "mint";
        this.ready = this.loadMint();
      }
      console.log(`[solana] ready (settle=${this.enabled}, faucet=${this.faucetEnabled}, rpc=${rpc})`);
    } catch (e) {
      console.error("[solana] init failed, disabling chain features:", e);
      (this as { enabled: boolean }).enabled = false;
      (this as { faucetEnabled: boolean }).faucetEnabled = false;
    }
  }

  /** Send native SOL from the treasury to a player (used by the daily faucet). */
  async sendSol(toAddress: string, sol: number): Promise<PayoutResult> {
    if (!this.faucetEnabled || !this.connection || !this.treasury) {
      return { ok: false, message: "SOL rewards aren't live yet." };
    }
    try {
      const to = new PublicKey(toAddress);
      const lamports = Math.round(sol * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: this.treasury.publicKey, toPubkey: to, lamports }),
      );
      const signature = await sendAndConfirmTransaction(this.connection, tx, [this.treasury]);
      return { ok: true, signature, message: "Sent" };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[solana] sendSol failed:", message);
      return { ok: false, message: `SOL transfer failed: ${message}` };
    }
  }

  private async loadMint(): Promise<void> {
    if (!this.connection || !this.mint) return;
    const info = await getMint(this.connection, this.mint);
    this.decimals = info.decimals;
  }

  async payout(toAddress: string, tokens: number): Promise<PayoutResult> {
    if (!this.enabled || !this.connection || !this.treasury || !this.mint) {
      return {
        ok: false,
        message: "On-chain settle is disabled (ledger only). Set SOLANA_SETTLE_ENABLED=true to turn it on.",
      };
    }
    try {
      if (this.ready) await this.ready;
      const to = new PublicKey(toAddress);
      const amount = BigInt(tokens) * 10n ** BigInt(this.decimals);

      const toAta = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.treasury,
        this.mint,
        to,
      );

      let signature: string;
      if (this.mode === "transfer") {
        const fromAta = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.treasury,
          this.mint,
          this.treasury.publicKey,
        );
        signature = await transfer(
          this.connection,
          this.treasury,
          fromAta.address,
          toAta.address,
          this.treasury,
          amount,
        );
      } else {
        signature = await mintTo(
          this.connection,
          this.treasury,
          this.mint,
          toAta.address,
          this.treasury,
          amount,
        );
      }
      return { ok: true, signature, message: "Settled on-chain" };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[solana] payout failed:", message);
      return { ok: false, message: `On-chain settle failed: ${message}` };
    }
  }
}

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const solana = new SolanaService();
