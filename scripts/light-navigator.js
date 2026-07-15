import { hasActiveLightOrDarknessSource } from "./light-activity.js";
import { matchesNavigatorEntry } from "./navigator-filter.js";
import { MODULE_ID } from "./settings.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function text(key) { return game.i18n.localize(`LIGHTKEEPER.Navigator.${key}`); }
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function lightName(document) { return document.name?.trim() || `${text("UnnamedLight")} — ${number(document.x)}, ${number(document.y)}`; }

export class LightNavigator extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "lightkeeper-navigator", classes: ["lightkeeper", "lightkeeper-navigator"],
    tag: "section", window: {title: "LIGHTKEEPER.Navigator.Title", resizable: true, contentClasses: ["lightkeeper-navigator__window-content"]},
    actions: {openSettings: LightNavigator.#onOpenSettings},
    // Initial dimensions only. ApplicationV2 retains the user's live position and size on later renders.
    position: {width: 480, height: 560}
  };
  static PARTS = {content: {template: "modules/lightkeeper/templates/light-navigator.hbs"}};

  #query = "";
  #filters = new Set();
  #entries = new Map();

  _getFrameButtons(options) {
    const buttons = super._getFrameButtons(options);
    buttons.push({icon: "fa-solid fa-sliders", label: "LIGHTKEEPER.Navigator.OpenSettings", action: "openSettings"});
    return buttons;
  }

  static async #onOpenSettings() {
    const settings = game.settings.sheet;
    // The singleton may already be open: select the module tab before force-rendering it to the front.
    settings.tabGroups.categories = MODULE_ID;
    return settings.render({force: true});
  }

  async _prepareContext(_options) {
    const entries = Array.from(canvas.scene?.lights ?? []).map((document) => this.#entry(document));
    this.#entries = new Map(entries.map((entry) => [entry.id, entry]));
    return {entries, filters: this.#filterContext(), query: this.#query, labels: {
      search: text("Search"), filters: text("Filters"), hidden: text("Hidden"), locked: text("Locked"), positive: text("Positive"), negative: text("Negative"), inactive: text("Inactive"), elevation: text("Elevation"), bright: text("Bright"), dim: text("Dim"), select: text("Select"), focus: text("Focus"), rename: text("Rename"), configure: text("Configure"), empty: text("Empty")
    }};
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    root.querySelector("[data-lk-search]")?.addEventListener("input", (event) => {
      this.#query = event.currentTarget.value;
      this.#applyFilters(root);
    });
    root.querySelectorAll("[data-lk-filter]").forEach((input) => input.addEventListener("change", (event) => {
      event.currentTarget.checked ? this.#filters.add(event.currentTarget.value) : this.#filters.delete(event.currentTarget.value);
      this.#applyFilters(root);
    }));
    root.querySelectorAll(".lightkeeper-navigator__content [data-action]").forEach((button) => button.addEventListener("click", (event) => {
      void this.#onAction(event).catch(() => ui.notifications?.error(text("ActionFailed")));
    }));
    this.#applyFilters(root);
  }

  #applyFilters(root) {
    for (const element of root.querySelectorAll("[data-lk-entry]")) {
      const entry = this.#entries.get(element.dataset.lightId);
      element.hidden = !entry || !matchesNavigatorEntry(entry, this.#query, this.#filters);
    }
  }

  #entry(document) {
    const placeable = canvas.lighting?.placeables?.find((light) => light.document?.id === document.id);
    const config = document.config ?? {};
    const negative = Boolean(config.negative);
    // An undrawn placeable has no active canvas source and is therefore inactive.
    const active = hasActiveLightOrDarknessSource(placeable);
    const states = [document.hidden ? text("Hidden") : null, document.locked ? text("Locked") : null, negative ? text("Negative") : text("Positive"), active ? text("Active") : text("Inactive")].filter(Boolean);
    return {
      id: document.id, name: lightName(document), x: number(document.x), y: number(document.y), elevation: number(document.elevation),
      bright: number(config.bright), dim: number(config.dim), states: states.join(" · "), hidden: Boolean(document.hidden), locked: Boolean(document.locked), negative, active, canRename: Boolean(document.canUserModify?.(game.user, "update"))
    };
  }

  #filterContext() {
    return ["hidden", "locked", "positive", "negative", "inactive"].map((key) => ({
      key, checked: this.#filters.has(key), label: text(key[0].toUpperCase() + key.slice(1))
    }));
  }

  async #onAction(event) {
    const id = event.currentTarget.closest("[data-light-id]")?.dataset.lightId;
    const document = canvas.scene?.lights?.get(id);
    if (!document) return;
    const placeable = canvas.lighting?.placeables?.find((light) => light.document?.id === id);
    switch (event.currentTarget.dataset.action) {
      case "select": return this.#select(placeable);
      case "focus":
        this.#select(placeable);
        return canvas.animatePan?.({x: number(document.x), y: number(document.y), scale: Math.max(canvas.stage?.scale?.x ?? 1, 1.5)});
      case "rename": return this.#rename(document);
      case "configure": return document.sheet?.render(true);
    }
  }

  #select(placeable) {
    // Native placeable control only; never switch layers/tools or move the camera.
    if (placeable?.isInteractable === true && typeof placeable?._canControl === "function" && typeof placeable.control === "function") {
      try {
        if (placeable._canControl(game.user)) placeable.control({releaseOthers: true});
      } catch (_error) { /* No fallback that changes core state. */ }
    }
  }

  async #rename(document) {
    if (!document.canUserModify?.(game.user, "update")) return ui.notifications?.warn(text("NoRenamePermission"));
    const next = globalThis.window?.prompt(text("RenamePrompt"), document.name ?? "");
    if (next === null || next.trim() === document.name) return;
    try {
      await document.update({name: next.trim()});
    } catch (_error) {
      ui.notifications?.error(text("RenameFailed"));
      return;
    }
    // Keep direct Rename responsive even if another module suppresses an update hook.
    return this.render({force: true});
  }
}
