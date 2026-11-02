// Aspecto: lo que NEO lleva en la cabeza y el color de su cuerpo, con NEO delante para verlo puesto.
// Lo mismo que el armario de la isla (clic derecho en NEO), más el color.

import { h } from "../../views/dom";
import { t } from "../../i18n/i18n";
import type { Settings } from "../../core/state";
import { BotEngine } from "../../neo/engine";
import { NEO_SKINS, neoSkin } from "../../neo/neo-look";
import { drawWardrobeIcon } from "../../neo/outfits";
import {
  OUTFIT_KEYS, OUTFIT_SELECTIONS, WARDROBE_STRINGS, parseOutfit, resolveOutfit, seasonalOutfit, type Outfit,
} from "../../neo/wardrobe";
import type { HubContext } from "../shell";
import { liveNeo } from "../hero";

/** El armario dibuja sus iconos a 28 px; aquí van al doble. */
const ICON = 28;
const SCALE = 2;

/** Viste un NEO de la ventana como el de la isla: su color y lo que lleva puesto. */
export function dressNeo(engine: BotEngine, settings: Settings, outfit?: Outfit) {
  engine.bodyColor = null;
  engine.baseColors = neoSkin(settings.neoColor);
  engine.setOutfit(outfit ?? resolveOutfit(parseOutfit(settings.neoOutfit), new Date()), false);
}

export function lookPage(page: HTMLElement, ctx: HubContext) {
  const preview = h("canvas", { class: "look-neo" }) as HTMLCanvasElement;
  const engine = liveNeo(preview);
  const show = (outfit?: Outfit) => dressNeo(engine, ctx.settings(), outfit);
  show();

  const season = seasonalOutfit(new Date());
  const outfits = h("div", { class: "look-grid" });
  const outfitButtons = OUTFIT_SELECTIONS.map((sel) => {
    const canvas = h("canvas") as HTMLCanvasElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(ICON * SCALE * dpr);
    const c = canvas.getContext("2d");
    if (c) {
      c.setTransform(SCALE * dpr, 0, 0, SCALE * dpr, 0, 0);
      drawWardrobeIcon(c, ICON, sel, season, WARDROBE_STRINGS.autoBadge);
    }
    const name = t(OUTFIT_KEYS[sel]);
    const b = h("button", { class: "look-tile", title: name, "aria-label": name }, canvas, h("span", { text: name }));
    b.addEventListener("mouseenter", () => show(resolveOutfit(sel, new Date())));
    b.addEventListener("mouseleave", () => show());
    b.addEventListener("click", () => {
      ctx.changeSettings((s) => (s.neoOutfit = sel));
      mark();
    });
    outfits.append(b);
    return [sel, b] as const;
  });

  const colors = h("div", { class: "look-colors" });
  const colorButtons = NEO_SKINS.map((skin) => {
    const name = t(skin.name);
    const b = h("button", {
      class: "look-swatch",
      title: name,
      "aria-label": name,
      style: `background:linear-gradient(160deg, ${skin.top}, ${skin.bottom})`,
      onclick: () => {
        ctx.changeSettings((s) => (s.neoColor = skin.id));
        mark();
      },
    });
    colors.append(b);
    return [skin.id, b] as const;
  });

  function mark() {
    const s = ctx.settings();
    const outfit = parseOutfit(s.neoOutfit);
    const color = NEO_SKINS.some((k) => k.id === s.neoColor) ? s.neoColor : "graphite";
    for (const [sel, b] of outfitButtons) b.setAttribute("aria-pressed", String(sel === outfit));
    for (const [id, b] of colorButtons) b.setAttribute("aria-pressed", String(id === color));
    show();
  }
  mark();

  page.append(
    ctx.hero("look", t("Appearance"), t("What NEO wears and the colour of his body.")),
    h("div", { class: "look" },
      h("div", { class: "hub-card look-stage" }, preview),
      h("div", { class: "look-choices" },
        h("div", { class: "hub-card" }, h("h2", { class: "look-title", text: t("Body colour") }), colors),
        h("div", { class: "hub-card" }, h("h2", { class: "look-title", text: t("Wardrobe") }), outfits),
        h("div", { class: "hub-note", text: t("Also in the island: right-click NEO to open the wardrobe.") }),
      ),
    ),
  );
}
