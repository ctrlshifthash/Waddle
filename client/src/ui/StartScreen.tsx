import { useState } from "react";
import { Snow } from "./Snow";

export interface StartScreenProps {
  privyEnabled: boolean;
  ready?: boolean;
  authenticated?: boolean;
  walletAddress?: string | null;
  onConnect?: () => void;
  onLogout?: () => void;
  onEnterWallet?: (name: string) => void;
  onGuest: (name: string) => void;
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

export function StartScreen(props: StartScreenProps) {
  const [name, setName] = useState("");
  const { privyEnabled, ready = true, authenticated = false, walletAddress } = props;

  return (
    <div className="start-screen">
      <Snow count={40} />
      <div className="start-card">
        <div className="start-logo">🐧</div>
        <h1>Create your Penguin</h1>
        <p className="start-sub">Name your penguin, then pick a server.</p>

        <label className="field-label">Penguin name</label>
        <input
          className="text-input"
          value={name}
          maxLength={16}
          placeholder="Penguin"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") props.onGuest(name); }}
          autoFocus
        />

        {privyEnabled && (
          <div className="wallet-block">
            {!authenticated ? (
              <button className="btn btn-solana" disabled={!ready} onClick={props.onConnect}>
                {ready ? "Connect Solana Wallet" : "Loading…"}
              </button>
            ) : (
              <>
                <div className="wallet-row">
                  <span className="wallet-dot" /> Wallet: {walletAddress ? shortAddr(walletAddress) : "creating…"}
                  <button className="link-btn" onClick={props.onLogout}>logout</button>
                </div>
                <button className="btn btn-primary" disabled={!walletAddress} onClick={() => props.onEnterWallet?.(name)}>
                  Continue with Wallet →
                </button>
              </>
            )}
          </div>
        )}

        <div className="divider"><span>{privyEnabled ? "or" : ""}</span></div>

        <button className="btn btn-play" onClick={() => props.onGuest(name)}>
          Continue as Guest →
        </button>

        {!privyEnabled && (
          <p className="hint">Set <code>VITE_PRIVY_APP_ID</code> in <code>.env</code> to enable Solana wallet login.</p>
        )}
      </div>
    </div>
  );
}
