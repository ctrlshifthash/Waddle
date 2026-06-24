import type { CjInvitePayload } from "@shared";

export function InviteModal({ invite, onRespond }: { invite: CjInvitePayload; onRespond: (accept: boolean) => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h2>🥋 Card-Jitsu Challenge</h2></div>
        <div className="modal-body">
          <p className="invite-text"><b>{invite.fromName}</b> challenged you to a Card-Jitsu match!</p>
          <div className="welcome-actions">
            <button className="btn btn-play" onClick={() => onRespond(true)}>Accept ⚔️</button>
            <button className="btn btn-ghost" onClick={() => onRespond(false)}>Decline</button>
          </div>
        </div>
      </div>
    </div>
  );
}
