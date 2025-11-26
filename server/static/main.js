// Import something from page.mjs
import { registerPage, getPages } from "./page.js";
import { PageEditor } from "./editor.js";
import { LayerStack } from "./stack.js";
import { TemplateList } from "./template-list.js";
import { updateCanvas, result } from "./page-canvas.js";
const blankImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const resultCanvas = result.canvas;

(function() {
  // The label printer prints in portrait orientation, but we think of this as a
  // letterbox kind of format so we'll rotate in a post-processing step
  const label_w = 991;
  const label_h = 306;
  const unit = label_h/29; // unit length in mm, if the canvas is 29x90 = 306x991
  const displayScaleFactor = 0.375;
  const displayUnit = unit * displayScaleFactor;
  const imageWidth = label_w - unit*31;
  const imageScale = imageWidth / 866;
  const imageHeight = 64 * imageScale;

  const aspectRatio = label_w/label_h;

  registerPage({
    name: "29x90 label",
    endpoint: "/print/29x90",
    width: 991,
    height: 306,
    displayWidth: `90mm`,
    displayHeight: `29mm`,
    baseURL: config.baseURL,
    unit, unitMargin: unit/2,
  }, [
    {
      // the square QR Code image on the left
      x: 0, y: 0, width: unit*29, height: unit*29,
      type: "qrcode", id: "qrCode",
      value: "https://wiki.eugenemakerspace.com/",
      required: true,
    },
    {
      // The label text
      x: unit*30, y: label_h/2 - unit*2 - imageHeight/2, width: label_w-unit*31, height: unit*9,
      type: "text", id: "labelText",
      fontSize: 60,
      placeholder: "EMS Wiki",
      value: "",
      required: false,
    },
    {
      // The EMS Logo image along the bottom
      x: unit*29, y: label_h - imageHeight - unit*3, width: imageWidth, height: imageHeight,
      opacity: 1,
      type: "image", id: "emsLogo",
      value: "images/EMS-Logo-Header-bw2.png",
      required: false,
    },
  ]);
})();

(function(shouldRegister) {
  if (!shouldRegister) {
    return;
  }
  const label_w = 306;
  const label_h = 306;
  const unit = label_h/29; // unit length in mm, if the canvas is 29x29 = 306x306

  registerPage({
    name: "29x29 label",
    endpoint: "/print/29x29",
    width: 306, height: 306, baseURL: config.baseURL,
  }, [
    { x: unit, y: unit, width: unit*27, height: unit*27, type: "qrcode", id: "qrCode" },
  ]);
})(false);

let displayPages;
let editorElem = document.querySelector("page-editor");
let optionsElem = document.querySelector("template-list");
let refreshButton = document.querySelector(".picker button.refresh");
let devices;

async function updatePicker() {
  devices = await getDeviceList();
  console.log("Got devices:", devices);
  if (devices.length) {
    document.getElementById("message").hidden = true;
  } else {
    document.getElementById("message").textContent = "No devices connected";
    document.getElementById("message").hidden = false;
  }
  optionsElem.items = [...getPages().values()];
  await new Promise(resolve => requestAnimationFrame(resolve));
  let id = optionsElem.value;
  if (id) {
    selectPageTemplate(id);
  }
  updateEditor();
}

async function updateEditor() {
  let currentPage = getCurrentPage();
  if (currentPage) {
    await updateCanvas( displayPages.get(optionsElem.value) );
  }
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

async function initialize() {
  displayPages = window.displayPages = getPages();
  console.log("Prepared displayItems:", displayPages);

  optionsElem.addEventListener("template-change", () => {
    selectPageTemplate(optionsElem.value);
  });

  await updatePicker();
  refreshButton.addEventListener("click", () => updatePicker());
}

const getCurrentPage = window.getCurrentPage = () => {
  return displayPages?.get(optionsElem.value);
};

document.documentElement.addEventListener("page-change", () => updateEditor());

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

document.querySelector("#printBtn").addEventListener('click', (event) => {
  const dryRun = location.search.toLowerCase().includes("dryrun");
  const currentPage = getCurrentPage();
  if (!currentPage) {
    return;
  }
  sendBlob(result.blob, currentPage.get("endpoint"), dryRun);
});

document.querySelector("#saveImageBtn").addEventListener('click', (event) => {
  const imageUrl = URL.createObjectURL(result.blob);
  const anchor = event.target;
  anchor.href = imageUrl;
  anchor.download = "label.png";
  requestAnimationFrame(() => URL.revokeObjectURL(imageUrl));
}, true);

document.querySelector("#loadImageBtn").addEventListener('change', (event) => {
  const [file] = event.target.files;
  console.log("file", file);
});

function selectPageTemplate(id) {
  if (!id) {
    id = optionsElem.value;
  }
  if (id) {
    console.log("Configuring editor to use page:", id, displayPages.get(id));
    editorElem.configure(displayPages.get(id));
  }
}

initialize();