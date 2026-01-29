import { loadImage, imageUrlToDataURI } from "./helpers.mjs"

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
  get title() {
    let textRegion = Object.values(this.properties.regions).find(region => region.regionType == "text");
    let titleText = "";
    if (textRegion) {
      titleText = `${textRegion.value} (${this.id})`;
    } 
    return titleText;
  }
  updateRegion({id, value}) {
    let region = this.properties.regions[id];
    region.updateValue(value);
  }
}

export class ImageRegion extends _Region {
  imageURL = "";
  constructor(region = {}) {
    super(region);
    if (region._value) {
      this._value = region._value;
      this.loadImageURL(value);
    }
  }
  resolveStringToURL(strURL) {
    let imageURL = new URL(strURL, this.baseURL);
    return imageURL.toString();
  }
  get url() { 
    if (!this._value) return ""; 
    return this.resolveStringToURL(this._value);
  }
  set url(value) { 
    this._value = value;
  }
  loadImageURL(url) {
    this._loadedPromise = imageUrlToDataURI(url).then(dataUri => {
      this.imageURL = dataUri;
      return loadImage(dataUri);
    });
  }
  updateValue(value) {
    const url = this.resolveStringToURL(value);
    this.loadImageURL(url);
    // could dispatch with a loading image?
    this.loaded.then(() => {
      super.updateValue(value);
    })
  }
  get loaded() {
    return this._loadedPromise ?? Promise.resolve();
  }
}

export class QRCodeImageRegion extends ImageRegion {
  resolveStringToURL(strURL) {
    let imageURL = new URL(strURL, this.baseURL);
    // pass through data: URIs, and URLs that already point at our QRCode endpoint
    if (
      !imageURL.protocol.startsWith("http") ||
      imageURL.toString().includes("/url2qrcode")
    ) {
      return imageURL.toString();
    }
    const params = new URLSearchParams();
    params.append("url", strURL);
    params.append("border", "0");
    params.append("box", "12");
    return (new URL(`/url2qrcode?${params}`, this.baseURL)).toString();
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