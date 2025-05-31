import "./misc/icon";
import "./misc/button";
import "./misc/toggle";
import "./misc/troggle";
import "./misc/quadroggle";
import "./misc/modal";
import "./misc/window";
import "./misc/skin_2d";

import { css, html, LitElement, unsafeCSS } from "lit";
import Editor from "../editor/main";
import Toolbar from "./tools/toolbar";
import ToolTab from "./config/tabs/tool";
import LayerList from "./layers/layer_list";
import Config from "./config/main";
import PersistenceManager from "../persistence";
import { getFocusedElement, isKeybindIgnored } from "../helpers";
import Modal from "./misc/modal";

import imgGridDark from "/assets/images/grid-editor-dark.png";
import imgGridGray from "/assets/images/grid-editor-gray.png";
import imgGridLight from "/assets/images/grid-editor-light.png";

import { GALLERY_URL, SKIN_LOOKUP_URL } from "../constants";
import { del } from "idb-keyval";

class UI extends LitElement {
  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      --editor-bg: url(${unsafeCSS(imgGridDark)});
      --ncrs-color-picker-height: 15rem;
    }

    :host > div {
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .warning {
      display: none;
      align-items: center;
      gap: 0.5rem;
      pointer-events: none;
      position: absolute;
      top: 8px;
      left: 36px;
      color: #aaaaaa;
      font-size: small;
    }

    .warning svg {
      width: 1.25rem;
      height: auto;
      padding-left: 0.35rem;
    }

    :host(.has-filters) #filters-warning {
      display: flex;
    }

    :host(.layer-invisible) #layer-warning {
      display: flex;
    }

    :host(.editor-dark) {
      --editor-bg: url(${unsafeCSS(imgGridDark)});
    }

    :host(.editor-gray) {
      --editor-bg: url(${unsafeCSS(imgGridGray)});
    }

    :host(.editor-light) {
      --editor-bg: url(${unsafeCSS(imgGridLight)});
    }

    :host(.editor-light) .warning {
      color: black;
    }

    :host(.minimized) {
      --ncrs-color-picker-height: 15rem;
    }

    :host(.fullscreen) {
      --ncrs-color-picker-height: 17rem;
    }

    #editor {
      background-color: #191919;
      background-image: var(--editor-bg);
      flex-grow: 1;
      position: relative;
    }

    #layers {
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }

    #layers ncrs-layer-list {
      flex-grow: 1;
    }

    #editor ncrs-editor {
      width: 100%;
      height: 100%;
      min-width: 240px;
    }

    #history {
      display: flex;
      justify-content: center;
      padding: 0.5rem;
      gap: 0.5rem;
      background-color: rgb(19, 19, 21);
    }

    #history button {
      all: unset;
      cursor: pointer;
    }

    #history button:disabled {
      cursor: default;
    }

    #history button:focus-visible {
      outline: 1px solid white;
    }

    #history ncrs-icon {
      --icon-color: white;
      width: 24px;
      height: 24px;
    }

    #history button:disabled ncrs-icon {
      --icon-color: #aaaaaa;
    }

    #themeSwitch {
      all: unset;
      display: block;
      cursor: pointer;
      position: absolute;
      top: 8px;
      left: 8px;
    }

    #themeSwitch ncrs-icon {
      display: none;
      width: 24px;
      height: 24px;
    }

    :host(.editor-dark) #themeSwitch ncrs-icon.dark {
      display: block;
    }

    :host(.editor-gray) #themeSwitch ncrs-icon.gray {
      display: block;
    }

    :host(.editor-light) #themeSwitch ncrs-icon.light {
      display: block;
    }

    #fullscreenSwitch {
      all: unset;
      display: block;
      cursor: pointer;
      position: absolute;
      top: 8px;
      right: 8px;
    }

    #fullscreenSwitch ncrs-icon {
      display: none;
      width: 24px;
      height: 24px;
    }

    :host(.minimized) #fullscreenSwitch ncrs-icon.minimized {
      display: block;
    }

    :host(.fullscreen) #fullscreenSwitch ncrs-icon.fullscreen {
      display: block;
    }
  `;

  static properties = {
    src: {type: String},
    _warning: {type: String, state: true},
  }

  // All keybind definitions, ^ = ctrl, + = shift, ! = alt

  static keybinds = {
    "b": "pen",
    "e": "eraser",
    "g": "bucket",
    "s": "shade",
    "i": "eyedropper",
    "+s": "sculpt",
    "^z": "undo",
    "^y": "redo",
    "^+z": "redo",
    "^r": "reset",
    "0": "cameraReset",
    "1": "selectTools",
    "2": "selectLayer",
    "3": "selectImport",
    "4": "selectExport",
    "!t": "selectTools",
    "!l": "selectLayer",
    "!i": "selectImport",
    "!e": "selectExport",
    "+n": "addLayer",
    "delete": "removeLayer",
    "+d": "cloneLayer",
    "+m": "mergeLayer",
  }

  constructor() {
    super();

    this.persistence = new PersistenceManager("ncrs-ui");
    this.editor = new Editor;
    this.toolbar = new Toolbar(this);
    this.layers = new LayerList(this);
    this.config = new Config(this);

    this.exportModal = this._setupModal("export-form");
    this.galleryModal = this._setupGalleryModal();

    this._setEditorTheme();
    this._setFullscreen();
    this._setupEvents();
  }
  currentLayer;

  firstUpdated() {
    document.addEventListener("keydown", event => {
      const element = event.originalTarget || getFocusedElement();
      if (isKeybindIgnored(element)) { return; }

      switch(this.checkKeybinds(event)){
        case "pen":
          if (this.editor.currentTool == this.editor.tools[0]) {
            this.config.select("tool");
          }
          this.editor.selectTool(this.editor.tools[0]);
          break;
        case "eraser":
          if (this.editor.currentTool == this.editor.tools[1]) {
            this.config.select("tool");
          }
          this.editor.selectTool(this.editor.tools[1]);
          break;
        case "bucket":
          if (this.editor.currentTool == this.editor.tools[2]) {
            this.config.select("tool");
          }
          this.editor.selectTool(this.editor.tools[2]);
          break;
        case "shade":
          if (this.editor.currentTool == this.editor.tools[3]) {
            this.config.select("tool");
          }
          this.editor.selectTool(this.editor.tools[3]);
          break;
        case "sculpt":
          if (!this.editor.config.get("overlayVisible")) { break; }
          if (this.editor.currentTool == this.editor.tools[4]) {
            this.config.select("tool");
          }
          this.editor.selectTool(this.editor.tools[4]);
          break;
        case "eyedropper":
          this.editor.config.set("pick-color-toggle", true);
          this.editor.config.set("pick-color", !this.editor.config.get("pick-color", false));
          break;
        case "undo":
          this.editor.history.undo();
          break;
        case "redo":
          this.editor.history.redo();
          break;
        case "reset":
          const check = confirm("Do you want to reset all editor data? You will lose all progress on your current skin.");

          if (check) {
            PersistenceManager.resetAll();
            del("ncrs:reference-images");
            location.reload();
          }
          
          break;
        case "cameraReset":
          this.editor.resetCamera();
          break;
        case "selectTools":
          this.config.select("tool");
          break;
        case "selectLayer":
          this.config.select("layers");
          break;
        case "selectImport":
          this.config.select("import");
          break;
        case "selectExport":
          this.config.select("export");
          break;
        case "addLayer":
          this.editor.addLayer();
          break;
        case "removeLayer":
          this.editor.removeLayer();
          break;
        case "cloneLayer":
          this.editor.cloneLayer();
          break;
        case "mergeLayer":
          this.editor.mergeLayer();
          break;
      }
    });

    this._updateWarning();
  }

  checkKeybinds(event) {
    let key = '';
    if (event.ctrlKey) {
      key+='^';
    }
    if (event.altKey) {
      key+='!';
    }
    if (event.shiftKey) {
      key+='+';
    }
    key+=event.key.toLowerCase();
    if (key in this.constructor.keybinds) {
      return this.constructor.keybinds[key];
    }
  }

  render() {
    return html`
      <div>
        ${this.config}
        ${this.toolbar}
        <div id="editor">
          ${this.editor}
          ${this._filtersWarning()}
          ${this._bgToggle()}
          ${this._fullscreenToggle()}
        </div>
        <div id="layers">
          ${this._historyButtons()}
          ${this.layers}
        </div>
      </div>
      ${this.exportModal}
      ${this.galleryModal}
      <slot name="footer"></slot>
    `;
  }

  galleryURL() {
    if (!this.src) { return GALLERY_URL };

    const url = new URL(this.src);

    return `${url.origin}/gallery/skins`;
  }

  skinLookupURL() {
    if (!this.src) { return SKIN_LOOKUP_URL };

    const url = new URL(this.src);

    return `${url.origin}/api/skin`;
  }

  toggleEditorBackground() {
    if (this.classList.contains("editor-gray")) {
      this.classList.replace("editor-gray", "editor-light");
      this.persistence.set("theme", "light");
    } else if (this.classList.contains("editor-light")) {
      this.classList.replace("editor-light", "editor-dark");
      this.persistence.set("theme", "dark");
    } else {
      this.classList.remove("editor-dark", "editor-light");
      this.classList.add("editor-gray");
      this.persistence.set("theme", "gray");
    }
  }

  toggleFullscreen() {
    if (this.classList.contains("minimized")) {
      this.classList.replace("minimized", "fullscreen");
    } else if (this.classList.contains("fullscreen")) {
      this.classList.replace("fullscreen", "minimized");
    }
  }

  _filtersWarning() {
    const filterIcon = html`
      <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
    const eyeIcon = html`
      <svg data-slot="icon" aria-hidden="true" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `

    return html`
      <div id="filters-warning" class="warning">
        ${filterIcon}
        Colors drawn on the current layer will appear altered by filters.
      </div>
      <div id="layer-warning" class="warning">
        ${eyeIcon}
        Current layer is hidden, and cannot be edited.
      </div>
    `;
  }

  _setEditorTheme() {
    if (
      !this.classList.contains("editor-dark") ||
      !this.classList.contains("editor-gray") ||
      !this.classList.contains("editor-light")
    ) {
      const theme = this.persistence.get("theme", "dark");
      this.classList.add(`editor-${theme}`);
    }
  }

  _setFullscreen() {
    const fullscreen = "minimized";
    this.classList.add(fullscreen);
  }

  _bgToggle() {
    return html`
      <button id="themeSwitch" @click=${this.toggleEditorBackground}>
        <ncrs-icon title="Switch to dusk mode." icon="dusk-mode" color="white" class="dark"></ncrs-icon>
        <ncrs-icon title="Switch to light mode." icon="light-mode" color="white" class="gray"></ncrs-icon>
        <ncrs-icon title="Switch to dark mode." icon="dark-mode" color="black" class="light"></ncrs-icon>
      </button>
    `
  }

  _fullscreenToggle() {
    return html`
      <!-- <button id="fullscreenSwitch" @click=${this.toggleFullscreen}>
        <ncrs-icon title="Switch to Fullscreen. [EXPERIMENTAL]" icon="fullscreen" color="white" class="minimized"></ncrs-icon>
        <ncrs-icon title="Minimize." icon="minimize" color="white" class="fullscreen"></ncrs-icon>
      </button> -->
    `
  }

  _historyButtons() {
    const undoDisabled = !this.editor.history.canUndo();
    const redoDisabled = !this.editor.history.canRedo();

    return html`
      <div id="history">
        <button title="Undo [Ctrl + Z]" ?disabled=${undoDisabled} @click=${this._undo}>
          <ncrs-icon icon="undo" color="var(--icon-color)"></ncrs-icon>
        </button>
        <button title="Redo [Ctrl + Y]" ?disabled=${redoDisabled} @click=${this._redo}>
          <ncrs-icon icon="redo" color="var(--icon-color)"></ncrs-icon>
        </button>
      </div>
    `
  }

  _undo() {
    this.editor.history.undo();
  }

  _redo() {
    this.editor.history.redo();
  }

  _updateWarning() {
    const layer = this.editor.layers.getSelectedLayer();
    if (!layer) { return; }

    this.classList.remove("has-filters", "layer-invisible");
    
    if (!layer.visible) {
      return this.classList.add("layer-invisible");
    } else if (layer.hasFilters()) {
      return this.classList.add("has-filters");
    }
  }

  _setupModal(name) {
    const modal = new Modal();
    modal.part = name;
    
    const slot = document.createElement("slot");
    slot.name = name;

    modal.appendChild(slot);

    return modal
  }

  _setupGalleryModal() {
    const modal = new Modal();
    // const gallery = new Gallery(this);
    // gallery.url = "http://127.0.0.1:3000/gallery/skins"

    // modal.appendChild(gallery);

    return modal;
  }

  _setupEvents() {
    const layers = this.editor.layers;
    layers.addEventListener("layers-render", () => {
      this._updateWarning();
    });

    layers.addEventListener("update-filters", () => {
      this._updateWarning();
    });

    layers.addEventListener("layers-select", () => {
      this._updateWarning();
    });

    this.editor.history.addEventListener("update", () => {
      this.requestUpdate();
    })

    this.addEventListener("dragover", event => event.preventDefault());
    this.addEventListener("drop", event => {
      event.preventDefault();
      [...event.dataTransfer.items].forEach(item => {
        if (item.type != "image/png") { return; }

        this.editor.addLayerFromFile(item.getAsFile());
      })
    });
  }
}

customElements.define("ncrs-ui", UI);

export default UI;