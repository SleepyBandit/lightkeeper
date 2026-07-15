export const MODULE_ID = "lightkeeper";

// SettingsConfig recognizes DataField instances and ColorField renders Foundry's linked color-picker/text control.
const colorField = () => new foundry.data.fields.ColorField({required: true, nullable: false, initial: "#f6c945"});

const CLIENT_APPEARANCE = {
  showMarkers: {type: Boolean, default: true, scope: "client"},
  markerColor: {type: colorField(), default: "#f6c945", scope: "client"},
  markerOutline: {type: Boolean, default: true, scope: "client"},
  minMarkerPx: {type: Number, default: 12, scope: "client", range: {min: 2, max: 48, step: 1}},
  maxMarkerPx: {type: Number, default: 28, scope: "client", range: {min: 2, max: 96, step: 1}},
  zoomCompensation: {type: String, default: "full", scope: "client", choices: {full: "LIGHTKEEPER.Settings.zoomCompensation.Full", mild: "LIGHTKEEPER.Settings.zoomCompensation.Mild"}}
};

const WORLD_APPEARANCE = {
  markerColor: {type: colorField(), default: "#f6c945", scope: "world"},
  markerOutline: {type: Boolean, default: true, scope: "world"},
  minMarkerPx: {type: Number, default: 12, scope: "world", range: {min: 2, max: 48, step: 1}},
  maxMarkerPx: {type: Number, default: 28, scope: "world", range: {min: 2, max: 96, step: 1}},
  zoomCompensation: {type: String, default: "full", scope: "world", choices: {full: "LIGHTKEEPER.Settings.zoomCompensation.Full", mild: "LIGHTKEEPER.Settings.zoomCompensation.Mild"}}
};

function refreshMarkers() {
  globalThis.Lightkeeper?.styler?.refreshAll();
}

function sharedKey(key) {
  return `shared${key[0].toUpperCase()}${key.slice(1)}`;
}

export function registerSettings() {
  for (const [key, data] of Object.entries(CLIENT_APPEARANCE)) {
    game.settings.register(MODULE_ID, key, {
      name: `LIGHTKEEPER.Settings.${key}.Name`, hint: `LIGHTKEEPER.Settings.${key}.Hint`, config: true, onChange: refreshMarkers, ...data
    });
  }
  game.settings.register(MODULE_ID, "enforceSharedAppearance", {
    name: "LIGHTKEEPER.Settings.enforceSharedAppearance.Name", hint: "LIGHTKEEPER.Settings.enforceSharedAppearance.Hint",
    scope: "world", config: true, type: Boolean, default: false, onChange: refreshMarkers
  });
  for (const [key, data] of Object.entries(WORLD_APPEARANCE)) {
    const keyName = sharedKey(key);
    game.settings.register(MODULE_ID, keyName, {
      name: `LIGHTKEEPER.Settings.${keyName}.Name`, hint: `LIGHTKEEPER.Settings.${keyName}.Hint`,
      config: true, onChange: refreshMarkers, ...data
    });
  }
}

export function getEffectiveAppearance() {
  const shared = game.settings.get(MODULE_ID, "enforceSharedAppearance");
  const get = (key) => game.settings.get(MODULE_ID, shared ? sharedKey(key) : key);
  return {
    showMarkers: game.settings.get(MODULE_ID, "showMarkers"),
    markerColor: get("markerColor"), markerOutline: get("markerOutline"), minMarkerPx: get("minMarkerPx"),
    maxMarkerPx: get("maxMarkerPx"), zoomCompensation: get("zoomCompensation")
  };
}
