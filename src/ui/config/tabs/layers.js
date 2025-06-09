import * as THREE from "three";
import Color from "color";
import Tab from "../../misc/tab";
import { css, html } from "lit";
import UpdateLayerFiltersEntry from "../../../editor/history/entries/update_layer_filters_entry";
import MergeFiltersEntry from "../../../editor/history/entries/merge_filters_entry";
import BrightnessFilterSlider from "./layers/brightness_filter_slider";
import AlphaFilterSlider from "./layers/alpha_filter_slider";
import HueFilterSlider from "./layers/hue_filter_slider";
import SaturationFilterSlider from "./layers/saturation_filter_slider";
import UpdateLayerTextureEntry from "../../../editor/history/entries/update_layer_texture_entry";
import { IMAGE_HEIGHT, IMAGE_WIDTH } from "../../../constants";

class LayersTab extends Tab {
  static styles = [
    Tab.styles,
    css`
      :host {
        --current-color: #ff0000;
      }

      #container {
        background-color: #1a1a1a;
        padding: 0.25rem;
        box-sizing: border-box;
      }

      #sliders {
        padding: 0.25rem;
        padding-bottom: 0.5rem;
        margin-bottom: 0.25rem;
      }

      #sliders h2 {
        margin: 0px;
        font-size: medium;
        color: white;
        text-align: center;
        width: 100%;
      }

      #sliders label {
        font-size: x-small;
        color: rgb(134 137 139);
      }

      #sliders ncrs-slider::part(slider) {
        width: 100%;
        height: 1rem;
        border-radius: 0.25rem;
      }

      #opacity-slider::part(slider) {
        background: linear-gradient(to right, transparent, var(--current-color)),
          repeating-conic-gradient(#aaa 0% 25%, #888 0% 50%) 50%/ 8px 8px;
      }

      #hue-slider::part(slider) {
        background-image: linear-gradient(
          to right,
          rgb(0, 255, 255),
          rgb(0, 0, 255),
          rgb(255, 0, 255),
          rgb(255, 0, 0),
          rgb(255, 255, 0),
          rgb(0, 255, 0),
          rgb(0, 255, 255)
        );
      }

      #saturation-slider::part(slider) {
        background: linear-gradient(
          to right,
          hsl(from var(--current-color) h 0% l),
          hsl(from var(--current-color) h 100% l),
          hsl(from var(--current-color) h 200% l)
        );
      }

      #brightness-slider::part(slider) {
        background: linear-gradient(
          to right,
          hsl(from var(--current-color) h s 0%),
          hsl(from var(--current-color) h s l),
          hsl(from var(--current-color) h s 100%)
        );
      }

      #filter-buttons {
        display: flex;
        justify-content: center;
        gap: 0.25rem;
      }

      #filter-buttons ncrs-button {
        flex-grow: 1;
        flex-basis: 0;
        margin-bottom: 0.25rem;
        text-align: center;
        font-size: small;
      }

      ncrs-button::part(button) {
        padding: 0.25rem;
      }

      #header {
        display: flex;
        justify-content: space-between;
        gap: 0.25rem;
      }

      #clipboard {
        display: flex;
        gap: 0.25rem;
      }

      #clipboard ncrs-button {
        width: 26px;
        height: 20px;
      }

      #clipboard ncrs-icon {
        width: 100%;
        height: 18px;
      }

      .slider {
        display: flex;
        gap: 0.25rem;
      }

      .slider ncrs-slider {
        flex-grow: 1;
      }

      .reset {
        --icon-color: white;
        all: unset;
        display: block;
        cursor: pointer;
        flex-basis: 0;
      }

      .reset ncrs-icon {
        width: 18px;
        height: 18px;
        pointer-events: none;
      }

      #layer-buttons {
        display: flex;
        flex-direction: column;
        flex-basis: 0;
        padding: 0.5rem;
      }

      #layer-buttons ncrs-button {
        text-align: center;
        font-size: large;
        font-weight: bold;
      }

      #layer-buttons ncrs-button::part(button) {
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
      }

      hr {
        width: 100%;
        border-color: rgb(73, 76, 78);
        margin-bottom: 0.75rem;
        box-sizing: border-box;
      }
    `,
  ];

  constructor(editor) {
    super({name: "Layer", title: "Layer [2]/[Alt+L]\nApply filters and edit current layer."});
    this.editor = editor;
    this.config = editor.toolConfig;

    this.sliders = this._setupSliders();

    this._setupEvents();
  }
  clipboardFilters = [];

  render() {
    const layer = this._getLayer();
    const hasFilters = layer?.hasFilters() || false;
    const hasClipboard = this.clipboardFilters && this.clipboardFilters.length > 0;
    const clipboardMatch = this.clipboardFilters == layer?.compositor?.getFilters();

    return html`
      <div id="container">
        <div id="sliders">
          <div id="header">
            <h2>Filters</h2>
            <div id="clipboard">
              <ncrs-button @click=${this._copyFilters} title="Copy filters" ?disabled=${!hasFilters}>
                <ncrs-icon icon="copy" color="var(--text-color)"></ncrs-icon>
              </ncrs-button>
              <ncrs-button @click=${this._pasteFilters} title="Paste filters" ?disabled=${!hasClipboard || clipboardMatch}>
                <ncrs-icon icon="paste" color="var(--text-color)"></ncrs-icon>
              </ncrs-button>
            </div>
          </div>
          <label for="hue-slider">Adjust Layer Hue</label>
          <div class="slider">
            ${this.hueSlider.slider}
            <button class="reset" title="Reset hue." data-slider="hue" @click=${this._resetSlider}>
              <ncrs-icon icon="undo" color="var(--icon-color)"></ncrs-icon>
            </button>
          </div>
          <label for="saturation-slider">Adjust Layer Saturation</label>
          <div class="slider">
            ${this.saturationSlider.slider}
            <button class="reset" title="Reset saturation." data-slider="saturation" @click=${this._resetSlider}>
              <ncrs-icon icon="undo" color="var(--icon-color)"></ncrs-icon>
            </button>
          </div>
          <label for="brightness-slider">Adjust Layer Brightness</label>
          <div class="slider">
            ${this.brightnessSlider.slider}
            <button class="reset" title="Reset brightness." data-slider="brightness" @click=${this._resetSlider}>
              <ncrs-icon icon="undo" color="var(--icon-color)"></ncrs-icon>
            </button>
          </div>
          <label for="opacity-slider">Adjust Layer Opacity</label>
          <div class="slider">
            ${this.opacitySlider.slider}
            <button class="reset" title="Reset opacity." data-slider="opacity" @click=${this._resetSlider}>
              <ncrs-icon icon="undo" color="var(--icon-color)"></ncrs-icon>
            </button>
          </div>
        </div>
        <div id="filter-buttons">
          <ncrs-button @click=${this._resetSliders} title="Clear all active filters on the current layer.">
            Clear Filters
          </ncrs-button>
          <ncrs-button
            @click=${this._mergeFilters}
            title="Applies the current filters to the pixels of the current layer."
          >
            Merge in to Layer
          </ncrs-button>
        </div>
      </div>
      <div id="layer-buttons">
        <ncrs-button @click=${this.swapBodyOverlay} title="Swap body of the skin with the overlay.">Swap Body / Overlay</ncrs-button>
        <ncrs-button @click=${this.swapFrontBack} title="Flip skin front and back.">Flip Front / Back</ncrs-button>
        <hr>
        <ncrs-button @click=${this.clearLayerBase} title="Erases the base of the skin on the selected layer.">Erase Skin Base</ncrs-button>
        <ncrs-button @click=${this.clearLayerOverlay} title="Erases the overlay of the skin on the selected layer.">Erase Skin Overlay</ncrs-button>
        <ncrs-button @click=${this.flattenLayerOverlay} title="Erases the overlay of the skin on the selected layer.">Flatten Overlay in to Base</ncrs-button>
      </div>
    `;
  }

  swapBodyOverlay() {
    const layers = this.editor.layers;
    const layer = this._getLayer();
    const canvas = layer.swapBodyOverlayTexture("classic");
    const texture = new THREE.Texture(canvas, IMAGE_WIDTH, IMAGE_HEIGHT);

    this.editor.history.add(
      new UpdateLayerTextureEntry(layers, layer, texture)
    );
  }

  swapFrontBack() {
    const layers = this.editor.layers;
    const layer = this._getLayer();
    const canvas = layer.swapFrontBackTexture(this.editor.config.get("variant", "classic"));
    const texture = new THREE.Texture(canvas, IMAGE_WIDTH, IMAGE_HEIGHT);

    this.editor.history.add(
      new UpdateLayerTextureEntry(layers, layer, texture)
    );
  }

  clearLayerBase() {
    const layers = this.editor.layers;
    const layer = this._getLayer();
    const canvas = layer.clearBase(this.editor.config.get("variant", "classic"));
    const texture = new THREE.Texture(canvas, IMAGE_WIDTH, IMAGE_HEIGHT);

    this.editor.history.add(
      new UpdateLayerTextureEntry(layers, layer, texture)
    );
  }

  clearLayerOverlay() {
    const layers = this.editor.layers;
    const layer = this._getLayer();
    const canvas = layer.clearOverlay(this.editor.config.get("variant", "classic"));
    const texture = new THREE.Texture(canvas, IMAGE_WIDTH, IMAGE_HEIGHT);

    this.editor.history.add(
      new UpdateLayerTextureEntry(layers, layer, texture)
    );
  }

  flattenLayerOverlay() {
    const layers = this.editor.layers;
    const layer = this._getLayer();
    const canvas = layer.flattenOverlay(this.editor.config.get("variant", "classic"));
    const texture = new THREE.Texture(canvas, IMAGE_WIDTH, IMAGE_HEIGHT);

    this.editor.history.add(
      new UpdateLayerTextureEntry(layers, layer, texture)
    );
  }

  _getLayer() {
    return this.editor.layers.getSelectedLayer();
  }

  _resetSlider(event) {
    const slider = event.target.dataset.slider;

    switch (slider) {
      case "hue": { this.hueSlider.reset(); break; }
      case "saturation": { this.saturationSlider.reset(); break; }
      case "brightness": { this.brightnessSlider.reset(); break; }
      case "opacity": { this.opacitySlider.reset(); break; }
    }
  }

  _resetSliders() {
    const layer = this._getLayer();
    if (!layer.hasFilters()) {
      return;
    }

    this.requestUpdate();
    this.editor.history.add(new UpdateLayerFiltersEntry(this.editor.layers, layer, [], false));
  }

  _mergeFilters() {
    const layer = this._getLayer();
    if (!layer.hasFilters()) {
      return;
    }

    this.requestUpdate();
    this.editor.history.add(new MergeFiltersEntry(this.editor.layers, layer));
  }

  _syncFilters() {
    const layer = this._getLayer();
    if (!layer) {
      return;
    }
    const newFilters = [];

    this.sliders.forEach(slider => {
      if (slider.isDefault()) { return; }
      newFilters.push(slider.toFilter());
    });

    this.requestUpdate();
    this.editor.history.add(new UpdateLayerFiltersEntry(this.editor.layers, layer, newFilters));
  }

  _copyFilters() {
    const layer = this._getLayer();
    if (!layer.hasFilters()) {
      return;
    }
    this.clipboardFilters = layer.compositor.getFilters();
    this.requestUpdate();
  }

  _pasteFilters() {
    if (!this.clipboardFilters) { return; }

    const layer = this._getLayer();
    if (this.clipboardFilters == layer.compositor.getFilters()) { return; }

    this.requestUpdate();
    this.editor.history.add(new UpdateLayerFiltersEntry(this.editor.layers, layer, this.clipboardFilters, false));
  }

  _setupSliders() {
    const layers = this.editor.layers;
    this.opacitySlider = new AlphaFilterSlider(layers);
    this.opacitySlider.slider.id = "opacity-slider"

    this.hueSlider = new HueFilterSlider(layers);
    this.hueSlider.slider.id = "hue-slider"
    this.hueSlider.slider.addEventListener("slider-change", () => {
      const color = new Color(`hsl(${this.hueSlider.getValue()} 100% 50%)`);
      this.style.setProperty("--current-color", color.hex());
    })

    this.saturationSlider = new SaturationFilterSlider(layers);
    this.saturationSlider.slider.id = "saturation-slider"

    this.brightnessSlider = new BrightnessFilterSlider(layers);
    this.brightnessSlider.slider.id = "brightness-slider"

    const sliders = [this.opacitySlider, this.hueSlider, this.saturationSlider, this.brightnessSlider];

    sliders.forEach(element => {
      element.addEventListener("slider-change", () => this._syncFilters());
    })

    return sliders;
  }

  _setupEvents() {
    this.editor.layers.addEventListener("layers-select", () => {
      this.requestUpdate();
    })
  }
}

customElements.define("ncrs-layers-tab", LayersTab);

export default LayersTab;
