import { templateMap, SVGTemplateLoader } from "./templates.js";
import { ImageRegion, StringRegion } from "./template-regions.mjs"
import { TemplateEditor } from "./editor.js";
import { LayerStack } from "./stack.js";
import { TemplateList } from "./template-list.js";
import { updateCanvas } from "./page-canvas.js";
import { loadImage } from "./helpers.mjs";

const blankImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const App = new (class _App {
  constructor() {
    if (document.readyState == "complete") {
      this.start();
    } else {
      document.addEventListener("DOMContentLoaded", () => this.start(), { once: true });
    }
  }
  configureAvailableTemplates() {
    // TODO: load these from some .json file
    // And key them on the capabilities of the printer
    // Or let the user tell us what size labels it has loaded
    templateMap.set("29x90-2line", {
      id: "29x90-2line",
      svgURL: "./label-templates/29x90-image-label-html-text.svg",
      label: "29x90 (QRCode, label, ems logo)",
      endpoint: "asdasd",
    });
    console.log("configureAvailableTemplates", templateMap);
  }
  async start() {
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
        this.loadSelectedTemplate(optionsElem.value);
        break;
      }
      case "page-change": {
        this.updateRenderedImage().then(result => {
          console.log("updateRenderedImage got blob:", result.blob);
          this._objectURL = URL.createObjectURL(result.blob);
          for (let anchor of [this.saveImageButton, this.printButton]) {
            anchor.href = this._objectURL;
            anchor.download = `${this.templateLoader.currentTemplate.id}.png`;
          }
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
          sendBlob(result.blob, this.templateInstance.get("endpoint"), dryRun);
          break;
        }
        if (event.target == this.saveImageButton) {
          requestAnimationFrame(() => URL.revokeObjectURL(this._objectURL));
          break;
        }
      }
    }
  }
  updateRenderedImage() {
    const svgElement = this.templateLoader.svgTemplateElem;
    const dataURI = `data:image/svg+xml;utf8,${encodeURIComponent(svgElement.outerHTML)}`;
    return loadImage(dataURI).then(svgImg => updateCanvas(svgImg, this.templateInstance));
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
        console.log("Loaded templateInstance:", this.templateInstance);
        this.editorElem.configure(this.templateInstance);
      });
    }
  }

  async updateUI() {
    const devices = await getDeviceList();
    console.log("Got devices:", devices);
    if (devices.length) {
      document.getElementById("message").hidden = true;
    } else {
      document.getElementById("message").textContent = "No devices connected";
      document.getElementById("message").hidden = false;
    }
    this.configureAvailableTemplates();
    this.optionsElem.items = [...templateMap.keys()];
    await new Promise(resolve => requestAnimationFrame(resolve));
    let id = this.optionsElem.value;
    if (id) {
      this.loadSelectedTemplate(id);
    }
  }

  async updateEditor() {
    let printBtn = document.querySelector("#printBtn");
    let saveBtn = document.querySelector("#saveImageBtn");
    let canPrint = (
      currentPage &&
      devices.length &&
      editorElem.checkValidity()
    );
    saveBtn.classList.toggle("primary", !canPrint);
    printBtn.classList.toggle("primary", canPrint);
    printBtn.disabled = !canPrint;
  }

});
window.App = App;

window.getDeviceList = function getDeviceList() {
  // POST the FormData to the server using Fetch API
  return fetch(window.location.origin + '/devices', {
      method: 'GET',
  })
  .then(response => response.json())
  .then(data => {
      return data.result;
  })
  .catch(error => {
      console.error('Error:', error);
  });
}

// Function to save canvas as an image
function sendBlob(blob, endpoint, dryRun=false) {
  if (!endpoint) {
    console.warn("sendBlob, no endpoint given");
    return;
  }
  const formData = new FormData();
  if (dryRun) {
    formData.set("dryrun", true);
  }
  formData.append('image', blob, 'canvas-image.png');
  console.log("sendBlob, sending request to:", window.location.origin + endpoint);

  // POST the FormData to the server using Fetch API
  fetch(window.location.origin + endpoint, {
      method: 'POST',
      body: formData
  })
  .then(response => response.json())
  .then(data => {
      console.log('Success:', data);
  })
  .catch(error => {
      console.error('Error:', error);
  });
}


document.querySelector("#loadImageBtn").addEventListener('change', (event) => {
  const [file] = event.target.files;
  console.log("file", file);
});
