import { useEffect, useState, type ComponentType } from "react";
import { game, type Identity } from "./net/GameClient";
import type { CardPayload, CjInvitePayload, CjStartPayload } from "@shared";
import { useGame } from "./net/useGame";
import { PhaserGame } from "./game/PhaserGame";
import { Hud } from "./ui/Hud";
import { Dashboard } from "./ui/Dashboard";
import { QuickTravel } from "./ui/QuickTravel";
import { ZoomControls } from "./ui/ZoomControls";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ChatBar } from "./ui/ChatBar";
import { Notices } from "./ui/Notices";
import { ShopModal } from "./ui/ShopModal";
import { MapModal } from "./ui/MapModal";
import { ClosetModal } from "./ui/ClosetModal";
import { StampBook } from "./ui/StampBook";
import { QuestPanel } from "./ui/QuestPanel";
import { EventModal } from "./ui/EventModal";
import { WelcomeModal } from "./ui/WelcomeModal";
import { PlayerCard } from "./ui/PlayerCard";
import { FriendsModal } from "./ui/FriendsModal";
import { MailModal } from "./ui/MailModal";
import { LoadingScreen } from "./ui/LoadingScreen";
import { Snow } from "./ui/Snow";
import { WalletPanel } from "./ui/WalletPanel";
import { IglooEditor } from "./ui/IglooEditor";
import { PuffleShop } from "./ui/PuffleShop";
import { CoinDash } from "./game/minigames/CoinDash";
import { JetPack } from "./game/minigames/JetPack";
import { BeanCounters } from "./game/minigames/BeanCounters";
import { PuffleRoundup } from "./game/minigames/PuffleRoundup";
import { CartSurfer } from "./game/minigames/CartSurfer";
import { CardJitsu } from "./game/minigames/CardJitsu";
import { CardJitsuMP } from "./game/minigames/CardJitsuMP";
import { InviteModal } from "./ui/InviteModal";
import { HydroHopper } from "./game/minigames/HydroHopper";
import { IceFishing } from "./game/minigames/IceFishing";
import { AstroBarrier } from "./game/minigames/AstroBarrier";
import { Pizzatron } from "./game/minigames/Pizzatron";
import { initAudio, sfx, setMusic } from "./game/sound";
import type { NoticePayload } from "@shared";

const MINIGAMES: Record<string, ComponentType<{ onClose: () => void }>> = {
  coindash: CoinDash,
  jetpack: JetPack,
  beancounters: BeanCounters,
  puffleroundup: PuffleRoundup,
  cartsurfer: CartSurfer,
  cardjitsu: CardJitsu,
  hydrohopper: HydroHopper,
  icefishing: IceFishing,
  astrobarrier: AstroBarrier,
  pizzatron: Pizzatron,
};

export function GameRoot({ identity, onLogout, onExit }: { identity: Identity; onLogout?: () => void; onExit?: () => void }) {
  const g = useGame();
  const [questsOpen, setQuestsOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => !localStorage.getItem("cp_seen_intro_v1"));
  const [mapOpen, setMapOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const dismissWelcome = () => {
    localStorage.setItem("cp_seen_intro_v1", "1");
    setWelcomeOpen(false);
  };
  const [closetOpen, setClosetOpen] = useState(false);
  const [stampsOpen, setStampsOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [puffleOpen, setPuffleOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [card, setCard] = useState<CardPayload | null>(null);

  const openMail = () => { localStorage.setItem("cp_mail_seen", String(game.mail.length)); setMailOpen(true); };
  const [minigame, setMinigame] = useState<string | null>(null);
  const [cjInvite, setCjInvite] = useState<CjInvitePayload | null>(null);
  const [mpMatch, setMpMatch] = useState<CjStartPayload | null>(null);
  const [musicOn, setMusicOn] = useState(() => localStorage.getItem("cp_music") !== "off");

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    localStorage.setItem("cp_music", next ? "on" : "off");
    initAudio();
    setMusic(next);
  };

  useEffect(() => {
    game.connect(identity);
    const onShop = () => setShopOpen(true);
    const onMini = (id: string) => setMinigame(id);
    const onPuffle = () => setPuffleOpen(true);
    const onCard = (c: CardPayload) => setCard(c);
    const onExitIgloo = () => setEditorOpen(false);
    game.on("openShop", onShop);
    game.on("openMinigame", onMini);
    game.on("openPuffleShop", onPuffle);
    game.on("card", onCard);
    const onCjInvite = (m: CjInvitePayload) => setCjInvite(m);
    const onCjStart = (m: CjStartPayload) => { setMpMatch(m); setCjInvite(null); };
    game.on("cjInvite", onCjInvite);
    game.on("cjStart", onCjStart);
    game.on("exitIgloo", onExitIgloo);

    // sound: unlock on first gesture, then play SFX on coins/notices
    const onGesture = () => {
      initAudio();
      if (localStorage.getItem("cp_music") !== "off") setMusic(true);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    let lastCoin = 0;
    const onCoins = () => { const t = Date.now(); if (t - lastCoin > 120) { lastCoin = t; sfx.coin(); } };
    const onNotice = (n: NoticePayload) => {
      if (n.kind === "error") sfx.error();
      else if (n.kind === "success") (/level up/i.test(n.message) ? sfx.level() : sfx.win());
    };
    game.on("coins", onCoins);
    game.on("notice", onNotice);

    return () => {
      game.off("openShop", onShop);
      game.off("openMinigame", onMini);
      game.off("openPuffleShop", onPuffle);
      game.off("card", onCard);
      game.off("cjInvite", onCjInvite);
      game.off("cjStart", onCjStart);
      game.off("exitIgloo", onExitIgloo);
      game.off("coins", onCoins);
      game.off("notice", onNotice);
      window.removeEventListener("pointerdown", onGesture);
      setMusic(false);
    };
  }, []);

  const connected = g.status === "connected";

  return (
    <div className="game-shell">
      <Snow count={40} />
      <PhaserGame />

      <Hud
        onHome={() => setConfirmHome(true)}
        onHelp={() => setWelcomeOpen(true)}
        onDashboard={() => setDashOpen(true)}
        onQuests={() => setQuestsOpen(true)}
        onEvent={() => setEventOpen(true)}
        onMap={() => setMapOpen(true)}
        onShop={() => setShopOpen(true)}
        onCloset={() => setClosetOpen(true)}
        onStamps={() => setStampsOpen(true)}
        onFriends={() => setFriendsOpen(true)}
        onMail={openMail}
        onWallet={() => setWalletOpen(true)}
        onEditor={() => setEditorOpen(true)}
        onLogout={onLogout}
        musicOn={musicOn}
        onToggleMusic={toggleMusic}
      />
      <QuickTravel />
      <ChatBar />
      <ZoomControls />
      <Notices />

      {questsOpen && <QuestPanel onClose={() => setQuestsOpen(false)} />}
      {eventOpen && <EventModal onClose={() => setEventOpen(false)} />}
      {mapOpen && <MapModal onClose={() => setMapOpen(false)} />}
      {dashOpen && <Dashboard onClose={() => setDashOpen(false)} />}
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
      {closetOpen && <ClosetModal onClose={() => setClosetOpen(false)} />}
      {stampsOpen && <StampBook onClose={() => setStampsOpen(false)} />}
      {puffleOpen && <PuffleShop onClose={() => setPuffleOpen(false)} />}
      {friendsOpen && <FriendsModal onClose={() => setFriendsOpen(false)} />}
      {mailOpen && <MailModal onClose={() => setMailOpen(false)} />}
      {card && <PlayerCard card={card} onClose={() => setCard(null)} />}
      {cjInvite && !mpMatch && (
        <InviteModal invite={cjInvite} onRespond={(accept) => { game.cjRespond(cjInvite.matchId, accept); setCjInvite(null); }} />
      )}
      {mpMatch && <CardJitsuMP start={mpMatch} onClose={() => setMpMatch(null)} />}
      {welcomeOpen && (
        <WelcomeModal onClose={dismissWelcome} onOpenQuests={() => { dismissWelcome(); setQuestsOpen(true); }} />
      )}
      {confirmHome && (
        <ConfirmDialog
          title="🏠 Return home?"
          message="Leave this world and go back to the home screen? Your progress is saved."
          confirmLabel="Leave"
          cancelLabel="Stay"
          danger
          onConfirm={async () => { setConfirmHome(false); await game.disconnect(); onExit?.(); }}
          onCancel={() => setConfirmHome(false)}
        />
      )}
      {walletOpen && <WalletPanel onClose={() => setWalletOpen(false)} />}
      {editorOpen && g.isIgloo && g.isIglooOwner && (
        <IglooEditor onClose={() => setEditorOpen(false)} onOpenShop={() => setShopOpen(true)} />
      )}
      {minigame && (() => {
        const Game = MINIGAMES[minigame] ?? CoinDash;
        return <Game onClose={() => setMinigame(null)} />;
      })()}

      {!connected && <LoadingScreen status={g.status} />}
    </div>
  );
}
