import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import test from "node:test";
import { hasActiveLightOrDarknessSource } from "../scripts/light-activity.js";

const moduleRoot = resolve(import.meta.dirname, "..");
const scriptsDirectory = resolve(moduleRoot, "scripts");

function staticImports(source) {
  return [...source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g)].map((match) => match[1]);
}

function topLevelElements(template) {
  const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const stack = [];
  const roots = [];
  for (const match of template.matchAll(/<\/?([A-Za-z][\w-]*)\b[^>]*>/g)) {
    const [token, rawName] = match;
    const name = rawName.toLowerCase();
    if (token.startsWith("</")) assert.equal(stack.pop(), name, `unbalanced template tag: ${token}`);
    else if (!voidElements.has(name) && !token.endsWith("/>")) {
      if (stack.length === 0) roots.push(name);
      stack.push(name);
    }
  }
  assert.equal(stack.length, 0, "template has unclosed elements");
  return roots;
}

function source(path) {
  return readFileSync(resolve(moduleRoot, path), "utf8");
}

test("all module script static imports resolve locally without importing Foundry", () => {
  const pending = readdirSync(scriptsDirectory).filter((file) => extname(file) === ".js").map((file) => resolve(scriptsDirectory, file));
  const visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    for (const specifier of staticImports(readFileSync(file, "utf8"))) {
      assert.ok(specifier.startsWith("."), `${relative(moduleRoot, file)} has a non-local import: ${specifier}`);
      const target = resolve(dirname(file), specifier);
      assert.ok(existsSync(target), `${relative(moduleRoot, file)} cannot resolve ${specifier}`);
      pending.push(target);
    }
  }
  assert.ok(visited.size >= 1);
});

test("native translate-handle integration has no module overlay or core monkey patch", () => {
  const files = readdirSync(scriptsDirectory);
  const allScripts = files.filter((file) => extname(file) === ".js").map((file) => source(`scripts/${file}`)).join("\n");
  const runtime = source("scripts/lightkeeper.js");
  assert.ok(!files.includes("marker-overlay.js"));
  assert.doesNotMatch(allScripts, /MarkerOverlay|canvas\.interface|new PIXI\.(?:Container|Graphics)|\.addChild\(|\.removeChild\(/);
  assert.doesNotMatch(allScripts, /ShapeControlsHandle\.prototype|children\s*\[\s*\d+\s*\]|handles\s*=|replaceChild/);
  assert.match(allScripts, /controls\?\.handles\?\.children\?\.find\(\(handle\)\s*=>\s*handle\.name\s*===\s*"translate"\)/);
  assert.match(runtime, /Hooks\.on\("drawAmbientLight"/);
  assert.match(runtime, /Hooks\.on\("refreshAmbientLight"/);
  assert.match(runtime, /Hooks\.on\("canvasReady"/);
  assert.match(runtime, /Hooks\.on\("activateLightingLayer"/);
  assert.doesNotMatch(runtime, /renderSceneControls/);
});

test("native handle redraw uses the Foundry 14.364 legacy Graphics contract", () => {
  const drawing = source("scripts/marker-drawing.js");
  assert.match(drawing, /handle\.clear\(\)\.beginFill\(color, alpha\)\.lineStyle\(outline \? outlineWidth : 0, 0x000000, outline \? 0\.8 : 0\)\.drawCircle\(0, 0, radius\)\.endFill\(\)/);
  assert.match(drawing, /handle\.tint = 0xFFFFFF/);
  assert.doesNotMatch(drawing, /\.circle\(|\.fill\(|\.stroke\(/);
});

test("native marker styling only redraws for a scale-changing canvas pan", () => {
  const styler = source("scripts/native-handle-styler.js");
  assert.match(styler, /refreshForCanvasPan\(\)\s*\{[\s\S]*if \(scale === this\.#stageScale\) return false;[\s\S]*return this\.refreshAll\(\);/);
  assert.match(styler, /canvas\.lighting\?\.placeables/);
  assert.match(styler, /if \(!appearance\.showMarkers\)[\s\S]*controls\?\.draw\?\.\(\)/);
});

test("navigator template has one root, stable input controls, and a constrained AppV2 scroll chain", () => {
  const template = source("templates/light-navigator.hbs");
  const css = source("styles/lightkeeper.css");
  assert.deepEqual(topLevelElements(template), ["section"]);
  assert.match(template, /id="lightkeeper-navigator-search"\s+name="lightkeeper-navigator-search"/);
  assert.match(template, /id="lightkeeper-navigator-filter-\{\{key\}\}"\s+name="lightkeeper-navigator-filter-\{\{key\}\}"/);
  assert.match(template, /data-lk-entry\s+data-light-id="\{\{id\}\}"/);
  assert.match(template, /class="lightkeeper-navigator__list\s+scrollable"/);
  assert.match(css, /\.lightkeeper-navigator\.application\s+\.window-content\s*\{[^}]*display:\s*flex[^}]*flex:\s*1\s+1\s+0[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.lightkeeper-navigator__content\s*\{[^}]*flex:\s*1\s+1\s+0[^}]*height:\s*100%[^}]*min-height:\s*0/s);
  assert.match(css, /\.lightkeeper-navigator__list\s*\{[^}]*display:\s*grid[^}]*flex:\s*1\s+1\s+0[^}]*height:\s*0[^}]*min-height:\s*0[^}]*padding:\s*0\s+var\(--scroll-margin\)\s+0\s+0/s);
});

test("navigator input filtering remains caret-safe and resize-stable", () => {
  const navigator = source("scripts/light-navigator.js");
  assert.match(navigator, /static DEFAULT_OPTIONS = \{[\s\S]*position: \{width: 480, height: 560\}/);
  assert.doesNotMatch(navigator, /(?:setPosition\(|render\(\{[^}]*position:)/);
  assert.match(navigator, /this\.#query = event\.currentTarget\.value;\s*this\.#applyFilters\(root\);/s);
  assert.doesNotMatch(navigator, /data-lk-search][\s\S]{0,220}this\.render\(/);
});

test("navigator frame settings button uses the AppV2 frame-button action and focuses Lightkeeper settings", () => {
  const navigator = source("scripts/light-navigator.js");
  const locale = JSON.parse(source("lang/en.json"));
  assert.match(navigator, /actions:\s*\{\s*openSettings:\s*LightNavigator\.#onOpenSettings\s*\}/s);
  assert.match(navigator, /_getFrameButtons\(options\)\s*\{[\s\S]*super\._getFrameButtons\(options\)[\s\S]*icon:\s*"fa-solid fa-(?:gear|sliders)"[\s\S]*label:\s*"LIGHTKEEPER\.Navigator\.OpenSettings"[\s\S]*action:\s*"openSettings"/);
  assert.match(navigator, /game\.settings\.sheet[\s\S]*tabGroups\.categories\s*=\s*MODULE_ID[\s\S]*render\(\{force:\s*true\}\)/);
  assert.equal(locale.LIGHTKEEPER.Navigator.OpenSettings, "Open Lightkeeper settings");
});

test("personal and shared marker colors register native ColorField settings", () => {
  const settings = source("scripts/settings.js");
  assert.match(settings, /const colorField = \(\) => new foundry\.data\.fields\.ColorField\(\{required: true, nullable: false, initial: "#f6c945"\}\)/);
  assert.match(settings, /markerColor: \{type: colorField\(\), default: "#f6c945", scope: "client"\}/);
  assert.match(settings, /markerColor: \{type: colorField\(\), default: "#f6c945", scope: "world"\}/);
  assert.match(settings, /showMarkers: \{type: Boolean, default: true, scope: "client"\}/);
  assert.match(settings, /const get = \(key\) => game\.settings\.get\(MODULE_ID, shared \? sharedKey\(key\) : key\);/);
});

test("manifest publishes the v1.0.0 install chain and exact 14.364 boundary", () => {
  const manifest = JSON.parse(source("module.json"));
  assert.deepEqual(Object.keys(manifest).sort(), ["authors", "changelog", "compatibility", "description", "download", "esmodules", "id", "languages", "license", "manifest", "readme", "styles", "title", "url", "version"]);
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.url, "https://github.com/SleepyBandit/lightkeeper");
  assert.equal(manifest.manifest, "https://github.com/SleepyBandit/lightkeeper/releases/latest/download/module.json");
  assert.equal(manifest.download, "https://github.com/SleepyBandit/lightkeeper/releases/download/v1.0.0/module.zip");
  assert.deepEqual(manifest.compatibility, {minimum: "14.364", maximum: "14.364", verified: "14.364"});
});

test("light activity requires an active drawn light or darkness source", () => {
  assert.equal(hasActiveLightOrDarknessSource(undefined), false);
  assert.equal(hasActiveLightOrDarknessSource({}), false);
  assert.equal(hasActiveLightOrDarknessSource({lightSource: {active: false}, darknessSource: {active: false}}), false);
  assert.equal(hasActiveLightOrDarknessSource({lightSource: {active: true}}), true);
  assert.equal(hasActiveLightOrDarknessSource({darknessSource: {active: true}}), true);
  assert.equal(hasActiveLightOrDarknessSource({source: {active: true}, active: true}), false);
});
