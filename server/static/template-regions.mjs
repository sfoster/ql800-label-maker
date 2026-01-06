import { loadImage } from "./helpers.mjs"

class _Region extends EventTarget {
  constructor(region = {}) {
    super();
    this.id = region.id;
    this.labelText = region.label;
    this.regionType = region.regionType;
    this.properties = { ...region.properties };
    this.originalProperties = { ...region.properties };
    this.baseURL = region.baseURL || (window.config.baseURL ?? window.location.href);
  }
  get (propName) {
    return this.properties[propName];
  }
  get box() {
    return {
      left: this.properties.left,
      top: this.properties.top,
      width: this.properties.width,
      height: this.properties.height,
    };
  }
  get value() { return this._value || ""}
  set value(value) { 
    this._value = value;
  }
  updateValue(value) {
    this.value = value;
    this.dispatchEvent(new CustomEvent('value-change', { bubbles: true, composed: true }));
  }
}

export class ComposedRegion extends _Region {
  get currentValues() {
    const idValues = {};
    for (let [id, region] of Object.entries(this.properties.regions)) {
      idValues[id] = region.value;
    }
    return idValues;
  }
  updateRegion({id, value}) {
    console.log("updateRegion", id);
    let region = this.properties.regions[id];
    region.updateValue(value);
  }
}

export class ImageRegion extends _Region {
  constructor(region = {}) {
    super(region);
    if (region._value) {
      this._value = region._value;
      this._loadedPromise = loadImage(value);
    }
  }
  get url() { return this._value || ""}
  set url(value) { 
    this._value = value;
  }
  updateValue(value) {
    console.log("updateValue:", this.id);
    let url = new URL(value, this.baseURL);
    this._loadedPromise = loadImage(url);
    super.updateValue(url);
  }
  get loaded() {
    return this._loadedPromise ?? Promise.resolve();
  }
}

export class StringRegion extends _Region {
  constructor(region = {}) {
    super(region);
    if (region._value) {
      this._value = region._value;
    }
  }
}

export function fromJSON(templateData) {
  if (templateData instanceof _Region) {
    return templateData;
  }
  if (typeof templateData == "string") {
    templateData = JSON.parse(templateData);
  }
  if (templateData.properties.regions) {
    const regions = templateData.properties.regions.map(region => fromJSON(region));
    templateData.properties.regions = regions;
  }
}