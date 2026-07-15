import { registerSettings } from "./settings.js";
import { NativeHandleStyler } from "./native-handle-styler.js";
import { LightNavigator } from "./light-navigator.js";
import { isLightkeeperUser } from "./access.js";

const runtime = {styler: null, navigator: null};
globalThis.Lightkeeper = runtime;

function restyleAmbientLight(light) {
  runtime.styler?.restyle(light);
}

function refreshUI() {
  // Document changes (including native Configure saves) refresh the open list only.
  // Search/filter input never calls render, so it retains normal typing and caret behavior.
  if (runtime.navigator?.rendered) runtime.navigator.render({force: true});
}

function refreshAllNativeHandles() {
  runtime.styler?.refreshAll();
}

Hooks.once("init", () => registerSettings());

Hooks.once("ready", () => {
  if (!isLightkeeperUser()) return;
  runtime.styler = new NativeHandleStyler();
  runtime.navigator = new LightNavigator();
  if (canvas?.ready) refreshAllNativeHandles();
});

// AmbientLight creates/refreshed controls before these hooks. Resolve its translate handle fresh each time.
Hooks.on("drawAmbientLight", restyleAmbientLight);
Hooks.on("refreshAmbientLight", restyleAmbientLight);
Hooks.on("canvasReady", refreshAllNativeHandles);
Hooks.on("activateLightingLayer", refreshAllNativeHandles);
Hooks.on("canvasTearDown", () => runtime.styler?.reset());
Hooks.on("canvasPan", () => runtime.styler?.refreshForCanvasPan());
Hooks.on("createAmbientLight", refreshUI);
Hooks.on("updateAmbientLight", refreshUI);
Hooks.on("deleteAmbientLight", refreshUI);

Hooks.on("getSceneControlButtons", (controls) => {
  if (!isLightkeeperUser()) return;
  const lighting = controls.lighting;
  if (!lighting) return;
  lighting.tools ??= {};
  if (lighting.tools["lightkeeper-navigator"]) return;
  lighting.tools["lightkeeper-navigator"] = {
    name: "lightkeeper-navigator", title: "LIGHTKEEPER.Navigator.Title", icon: "fa-solid fa-lighthouse", button: true,
    order: Object.keys(lighting.tools).length, visible: true,
    onChange: () => {
      runtime.navigator ??= new LightNavigator();
      runtime.navigator.render({force: true});
    }
  };
});
