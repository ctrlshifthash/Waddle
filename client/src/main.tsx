// Node globals (Buffer/process/global) are provided by vite-plugin-node-polyfills.
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { App } from "./App";
import "./styles.css";

const appId = import.meta.env.VITE_PRIVY_APP_ID;
const root = createRoot(document.getElementById("root")!);

if (appId) {
  root.render(
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#2e6fdb",
          walletChainType: "solana-only",
          logo: undefined,
        },
        loginMethods: ["wallet", "email"],
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" } },
        externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      }}
    >
      <App privyEnabled />
    </PrivyProvider>,
  );
} else {
  // No Privy app id configured -> guest-only mode (game still fully playable).
  root.render(<App privyEnabled={false} />);
}
