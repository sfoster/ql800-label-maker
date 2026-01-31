import { ImageRegion, QRCodeImageRegion, StringRegion, ComposedRegion } from "./template-regions.mjs"

export const templateMap = new Map();

/* Load an svg document that is our template
 * Extract the template regions from it
 * Populate an editor that gives you a field editor for each region
 */
async function loadXML(filename) {
  const response = await fetch(filename);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(await response.text(), "text/xml");
  return xmlDoc;
}

export class SVGTemplateLoader {
  #templateLoaded = false;

  constructor(containerElem) {
    this.container = containerElem;
  }
  get svgTemplateElem() {
    return this.container.querySelector("svg");
  }
  getRegionElements() {
    return Array.from(this.svgTemplateElem.querySelectorAll("[data-region-type]"));
  }
  getTemplateRect() {
    return this.svgTemplateElem.getBoundingClientRect();
  }
  async load(templateData) {
    this.unload();
    this.templateURL = templateData.svgURL;
    const svgDoc = await loadXML(this.templateURL);
    this.#templateLoaded = true;
    this.container.appendChild(svgDoc.documentElement);

    this.templateRegions = {};
    const { width, height, top: containerTop, left: containerLeft } = this.getTemplateRect(); 

    let regions = this.getRegionElements();
    for (let regionElem of regions) {
      let boxElem = regionElem;
      if (regionElem.dataset.regionWrapper) {
        boxElem = regionElem.closest(regionElem.dataset.regionWrapper);
      }
      if (!boxElem) {
        throw new Error(`data-region-wrapper "${regionElem.dataset.regionWrapper}" didn't resolve to a containing element`);
      }
      let rect = boxElem.getBoundingClientRect();
      let {regionType} = regionElem.dataset;
      let regionData = {
          label: regionElem.getAttribute("data-region-label") || regionElem.id,
          id: regionElem.id,
          regionType, 
          properties: {
            top: rect.top - containerTop,
            left: rect.left - containerLeft,
            width: rect.width,
            height: rect.height,
          }
      };
      let region;
      switch (regionType) {
        case "text": {
          let initialValue = regionElem.textContent.trim();
          Object.assign(regionData.properties, {
              fieldType: "string",
              fontSize: getComputedStyle(regionElem).fontSize,
              presentationType: "edit-string-single",
              initialValue,
          });
          region = new StringRegion(regionData);
          region.value = initialValue;
          break;
        }
        case "image": {
          let initialValue = regionElem.getAttribute("xlink:href");
          Object.assign(regionData.properties, {
              fieldType: "image",
              presentationType: "edit-image-url",
              initialValue
          });
          region = new ImageRegion(regionData);
          region.value = initialValue;
          break;
        }
        case "qrcode-image": {
          let initialValue = regionElem.getAttribute("xlink:href");
          Object.assign(regionData.properties, {
              fieldType: "image",
              presentationType: "edit-image-url",
              initialValue
          });
          region = new QRCodeImageRegion(regionData);
          region.value = initialValue;
          break;
        }
      }
      this.templateRegions[region.id] = region;
      region.addEventListener("value-change", this);
    }
    this.currentTemplate = new ComposedRegion({
      baseURL: templateData.svgURL,
      id: templateData.id,
      label: templateData.label,
      properties: {
        regions: this.templateRegions,
        top: 0,
        left: 0,
        width,
        height,
      }
    });
    this.currentTemplate.sourceData = { ...templateData };
    this.currentTemplate.addEventListener("change", (event) => {
      console.log("change event:", event);
    });
    return this.currentTemplate;
  }
  unload() {
    this.currentTemplate = null;
    this.templateRegions = {};
    this.container.textContent = "";
    this.#templateLoaded = false;
  }
  handleEvent(event) {
    if (event.type == "value-change") {
      const region = event.target;
      this.updateTemplateRegion(region);
    }
  }
  updateTemplateRegion(region) {
    let elem = this.svgTemplateElem.querySelector(`#${region.id}`);
    switch (region.regionType) {
    case "text":
      // this is a HTML element, just update its textContent property
      elem.textContent = region.value;
      break;
    case "image":
      region.loaded.then(() => elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', region.imageURL))
      break;
    case "qrcode-image":
      region.loaded.then(() => {
        elem.setAttributeNS('http://www.w3.org/1999/xlink', 'href', region.imageURL);
      })
      break;
    default:
      console.warn(`Unknown region type: ${regionType} for region: ${region.id}`, elem);
      return;
    }
    Emitter.scheduleNotify(this.currentTemplate.id, region);
  }
};

const Emitter = new class _Emitter {
  constructor() {
    this._scheduled = {};
  }
  scheduleNotify(name, target) {
    if (!this._scheduled[name]) {
      this._scheduled[name] = true;
      const loadedPromise = target.loaded ?? Promise.resolve();
      loadedPromise.then(() => {
        delete this._scheduled[name];
        const changeEvent = new CustomEvent('page-change', { detail: name });
        console.log("scheduleNotify, dispatchEvent for name:", name, changeEvent);
        window.document.documentElement.dispatchEvent(changeEvent);
      });
    }
  }
}
