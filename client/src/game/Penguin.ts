import Phaser from "phaser";
import { ITEMS_BY_ID, EMOTES, PUFFLE_BY_ID, type PlayerView, type ClothingSlot } from "@shared";
import { hexColor } from "./gfx";
import { RENDER_SCALE } from "./render";

const ACC_SLOTS: ClothingSlot[] = ["body", "feet", "neck", "face", "head", "hand"];
const ACC_POS: Record<string, { x: number; y: number }> = {
  head: { x: 0, y: -59 }, face: { x: 0, y: -45 }, neck: { x: 0, y: -15 },
  body: { x: 0, y: -27 }, hand: { x: 17, y: -26 }, feet: { x: 0, y: -3 },
};

const WALK_SPEED = 150; // px/sec

export class Penguin extends Phaser.GameObjects.Container {
  readonly isSelf: boolean;
  targetX: number;
  targetY: number;
  facing = 1;

  private rig: Phaser.GameObjects.Container;
  private bodyImg: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private accs: Partial<Record<ClothingSlot, Phaser.GameObjects.Image>> = {};
  private puffle?: Phaser.GameObjects.Image;
  private bubble?: Phaser.GameObjects.Container;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private lastMsgSeq = -1;
  private lastEmoteSeq = -1;
  private walkPhase = 0;

  constructor(scene: Phaser.Scene, view: PlayerView, isSelf: boolean) {
    super(scene, view.x, view.y);
    this.isSelf = isSelf;
    this.targetX = view.x;
    this.targetY = view.y;

    const shadow = scene.add.image(0, 2, "peng_shadow");
    this.rig = scene.add.container(0, 0);

    const footL = scene.add.image(-9, -5, "peng_foot");
    const footR = scene.add.image(9, -5, "peng_foot");
    this.bodyImg = scene.add.image(0, -30, "peng_body");
    const belly = scene.add.image(0, -24, "peng_belly");
    const beak = scene.add.image(0, -38, "peng_beak");
    const eyeL = scene.add.image(-7, -45, "peng_eye");
    const eyeR = scene.add.image(7, -45, "peng_eye");
    this.rig.add([footL, footR, this.bodyImg, belly, beak, eyeL, eyeR]);

    this.nameText = scene.add
      .text(0, -74, view.name, {
        fontFamily: "system-ui, sans-serif", fontSize: "13px",
        color: isSelf ? "#ffe66d" : "#ffffff", stroke: "#000000", strokeThickness: 3,
        resolution: RENDER_SCALE,
      })
      .setOrigin(0.5);

    this.add([shadow, this.rig, this.nameText]);
    this.setDepth(view.y);
    this.applyView(view, true);
    scene.add.existing(this);
  }

  /** Update from a networked view. For the local player we keep movement local. */
  applyView(view: PlayerView, initial = false) {
    this.nameText.setText(view.name);
    this.bodyImg.setTint(hexColor(ITEMS_BY_ID[view.color]?.tint ?? "#2e6fdb"));

    for (const slot of ACC_SLOTS) {
      const id = (view as any)[slot] as string;
      if (id && this.scene.textures.exists(id)) {
        const pos = ACC_POS[slot];
        let img = this.accs[slot];
        if (!img) {
          img = this.scene.add.image(pos.x, pos.y, id);
          this.accs[slot] = img;
          this.rig.add(img);
        } else if (img.texture.key !== id) {
          img.setTexture(id);
        }
        img.setVisible(true).setPosition(pos.x, pos.y);
      } else if (this.accs[slot]) {
        this.accs[slot]!.setVisible(false);
      }
    }

    // active puffle (trails the penguin)
    const puf = view.puffle && PUFFLE_BY_ID[view.puffle];
    if (puf) {
      if (!this.puffle) {
        this.puffle = this.scene.add.image(-28, -6, "puffle");
        this.addAt(this.puffle, 0); // behind the penguin
      }
      this.puffle.setVisible(true).setTint(hexColor(puf.color));
    } else if (this.puffle) {
      this.puffle.setVisible(false);
    }

    if (!this.isSelf) {
      this.targetX = view.x;
      this.targetY = view.y;
      if (view.dir !== 0) this.facing = view.dir < 0 ? -1 : 1;
    }

    if (view.msgSeq !== this.lastMsgSeq) {
      this.lastMsgSeq = view.msgSeq;
      if (!initial && view.message) this.showBubble(view.message);
    }
    if (view.emoteSeq !== this.lastEmoteSeq) {
      this.lastEmoteSeq = view.emoteSeq;
      if (!initial && view.emote >= 0) this.showEmote(view.emote);
    }
  }

  /** Local-player move command. */
  setTarget(x: number, y: number) {
    if (x !== this.x) this.facing = x < this.x ? -1 : 1;
    this.targetX = x;
    this.targetY = y;
  }

  update(_time: number, delta: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const moving = dist > 1.5;
    if (moving) {
      const step = (WALK_SPEED * delta) / 1000;
      if (step >= dist) {
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
      this.walkPhase += delta * 0.02;
      this.rig.y = Math.abs(Math.sin(this.walkPhase)) * -3;
      this.rig.rotation = Math.sin(this.walkPhase) * 0.06;
    } else {
      this.rig.y = 0;
      this.rig.rotation = 0;
    }
    this.rig.scaleX = this.facing;
    if (this.puffle?.visible) {
      this.puffle.x = -this.facing * 30;
      this.puffle.y = -6 + (moving ? Math.sin(this.walkPhase * 0.8) * 2 : 0);
      this.puffle.setFlipX(this.facing < 0);
    }
    this.setDepth(this.y);
  }

  private showBubble(text: string) {
    this.bubble?.destroy();
    this.bubbleTimer?.remove();
    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#10202a",
        align: "center", wordWrap: { width: 150 }, resolution: RENDER_SCALE,
      })
      .setOrigin(0.5);
    const pad = 8;
    const w = label.width + pad * 2;
    const h = label.height + pad * 2;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, 0, h / 2 + 8);
    const c = this.scene.add.container(0, -92 - h / 2, [bg, label]);
    this.add(c);
    this.bubble = c;
    this.bubbleTimer = this.scene.time.delayedCall(4500, () => {
      c.destroy();
      if (this.bubble === c) this.bubble = undefined;
    });
  }

  private showEmote(id: number) {
    const glyph = EMOTES.find((e) => e.id === id)?.glyph ?? "❓";
    const t = this.scene.add.text(0, -78, glyph, { fontSize: "26px", resolution: RENDER_SCALE }).setOrigin(0.5);
    this.add(t);
    this.scene.tweens.add({
      targets: t, y: -110, alpha: 0, duration: 1200, ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  destroy(fromScene?: boolean) {
    this.bubbleTimer?.remove();
    super.destroy(fromScene);
  }
}
