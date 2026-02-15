import { templateMap, SVGTemplateLoader } from "./templates.mjs";
import { ImageRegion, QRCodeImageRegion, StringRegion } from "./template-regions.mjs"
import { TemplateEditor } from "./editor.mjs";
import { LayerStack } from "./stack.mjs";
import { TemplateList } from "./template-list.mjs";
import { updateCanvas } from "./page-canvas.mjs";
import { loadImage, sanitizeFilename } from "./helpers.mjs";
import { getDeviceList, sendBlob } from "./api.mjs";

const blankImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const App = new (class _App {
  constructor() {
    this.devices = [];
    this.startParams = null;
    this.readyPromise = new Promise((resolve, reject) => {
      if (document.readyState == "complete") {
        resolve();
      } else {
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      }
    });
  }
  get hasImage() {
    return !!this._resultObjectURL;
  }
  get printEndpoint() {
    if (!this.devices?.length) {
      return null;
    }
    const { sizeId } = App.templateInstance.sourceData;
    return [this.devices[0].endpoint, sizeId].join("/");
  }
  configureAvailableTemplates() {
    // TODO: load these from some .json file
    // And key them on the capabilities of the printer
    // Or let the user tell us what size labels it has loaded
    templateMap.set("ems-29x90-qrcode", {
      id: "ems-29x90-qrcode",
      sizeId: "29x90",
      svgURL: "./label-templates/29x90-qrcode-label-html-text.svg",
      label: "29x90 (QRCode, label, ems logo)",
    });
    templateMap.set("29x90-image-2line", {
      id: "29x90-image-2line",
      sizeId: "29x90",
      svgURL: "./label-templates/29x90-image-label-html-text.svg",
      label: "29x90 (QRCode, label, ems logo)",
    });
    templateMap.set("ems-17x54-2line", {
      id: "ems-17x54-2line",
      sizeId: "17x54",
      svgURL: "./label-templates/17x54-image-label-html-text.svg",
      label: "17x54 (QRCode, label)",
    });
    console.log("configureAvailableTemplates", templateMap);
  }
  async start(params) {
    if (params) {
      this.startParams = params;
    }
    this.templateLoader = new SVGTemplateLoader(document.getElementById("template-instance"));
    this.editorElem = document.querySelector("template-editor");
    this.optionsElem = document.querySelector("template-list");
    this.refreshButton = document.querySelector(".picker button.refresh");
    this.printButton = document.querySelector("#printBtn");
    this.saveImageButton = document.querySelector("#saveImageBtn");

    this.optionsElem.addEventListener("template-change", this);

    await this.updateUI();
    for (let button of [this.refreshButton, this.printButton, this.saveImageButton]) {
      button.addEventListener("click", this);
    }
    document.documentElement.addEventListener("page-change", this);
  }
  handleEvent(event) {
    switch (event.type) {
      case "template-change": {
        this.loadSelectedTemplate(this.optionsElem.value);
        break;
      }
      case "page-change": {
        this.updateRenderedImage().then(result => {
          this._resultObjectURL = URL.createObjectURL(result.blob);
          this._resultBlob = result.blob;
          const title = this.getImageTitleFromTemplateInstance(this.templateLoader.currentTemplate);
          const filename = sanitizeFilename(`${title}.png`);
          console.log("Created filename:", filename, title);
          for (let anchor of [this.saveImageButton, this.printButton]) {
            anchor.href = this._resultObjectURL;
            anchor.download = filename;
          }
          this.updateEditor();
        });
        break;
      }
      case "click": {
        if (event.target == this.refreshButton) {
          this.updateUI();
          break;
        }
        if (event.target == this.printButton) {
          const dryRun = location.search.toLowerCase().includes("dryrun");
          if (!this.templateInstance) {
            return;
          }
          sendBlob(this._resultBlob, this.printEndpoint, dryRun);
          break;
        }
        if (event.target == this.saveImageButton) {
          requestAnimationFrame(() => URL.revokeObjectURL(this._resultObjectURL));
          break;
        }
      }
    }
  }
  getImageTitleFromTemplateInstance(template) {
    let titleText = template.title;
    if (!titleText) {
      // add a timestamp prefix instead
      const currentDateTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60 * 1000
      ).toISOString();
      const filenameDate = currentDateTime.substring(0, 10);
      const filenameTime = currentDateTime.substring(11, 19).replace(/:/g, "-");
      titleText = `${filenameTime} ${filenameDate}`
    }
    return titleText;
  }
  updateRenderedImage() {
    const svgElement = this.templateLoader.svgTemplateElem;
    const dataURI = `data:image/svg+xml;utf8,${encodeURIComponent(svgElement.outerHTML)}`;
    return loadImage(dataURI).then(svgImg => {
      let result = updateCanvas(svgImg, this.templateInstance);
      this.updateEditor();
      return result;
    });
  }
  loadSelectedTemplate(id) {
    if (!id) {
      id = this.optionsElem.value;
    }
    if (id) {
      let templateProps = templateMap.get(id);
      console.log("loadSelectedTemplate, templateProps:", templateProps);
      console.assert(templateProps?.svgURL, `${id} isn't a valid registered template`);
      this.templateLoader.load(templateProps).then(templateInstance => {
        this.templateInstance = templateInstance;
        this.editorElem.configure(this.templateInstance);
      });
    }
  }

  async updateUI() {
    this.devices = await getDeviceList();
    console.log("Got devices:", this.devices);
    if (this.devices.length) {
      const [device] = this.devices; 
      document.getElementById("message").textContent = `Device connected: ${device.manufacturer} ${device.name}`;
      document.getElementById("message").hidden = false;
    } else {
      document.getElementById("message").textContent = "No devices connected";
      document.getElementById("message").hidden = false;
    }
    this.configureAvailableTemplates();
    let templateId = this.startParams?.get("template");
    if (templateId && !templateMap.has(templateId)) {
      templateId = "";
    }
    this.optionsElem.items = [...templateMap.keys()];
    await this.optionsElem.updateComplete;
    if (templateId) {
      this.optionsElem.value = templateId;
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (templateId) {
      this.loadSelectedTemplate(templateId);
    }
    this.updateEditor();
  }

  async updateEditor() {
    let hasImage = this.editorElem.checkValidity() && this.hasImage;
    let canPrint = hasImage && this.devices.length;
    this.saveImageButton.classList.toggle("primary", hasImage);
    this.saveImageButton.toggleAttribute("disabled", !hasImage);

    this.printButton.classList.toggle("primary", canPrint);
    this.printButton.disabled = !canPrint;
  }

});

// Expose App for browser console debugging
// Usage: __app.updateUI(), __app.templateInstance, etc.
if (typeof window !== 'undefined') {
  window.__app = App;

  App.readyPromise.then(async () => {
    const qsParams = new URLSearchParams(location.search);
    await App.start(qsParams);
  });
}
