import { LitElement, html } from "./lit-core.min.js"

function areaStyle(area) {
  return `top: ${area.y}px; left: ${area.x}px; width: ${area.width}px; height: ${area.height}px;`;
}

const grey1x1_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/aiIgwAAAABJRU5ErkJggg==";

export class PageEditor extends LitElement {
  static properties = {
    page: { default: null },
    baseURL: { default: null },
    isActive: { type: Boolean, default: true },
  };

  configure(pageData) {
    this.page = pageData;
    this.baseURL = pageData.get("baseURL");
    console.log("PageEditor configured:", pageData, this.baseURL);
  }

  shouldUpdate() {
    if (!this.page || this.baseURL == null) {
      console.log("Not rendering as we've no page or config data", this.page, this.baseURL);
      return false;
    }
    return true
  }

  connectedCallback() {
    this.isActive = true;
    this.previousActiveElement = null;
    super.connectedCallback();
    this.shadowRoot.addEventListener("click", event => this.handleClick(event));
    this.ownerDocument.addEventListener("click", event => this.handleClick(event));
    this.shadowRoot.addEventListener("blur", this);
    this.shadowRoot.addEventListener("focus", this);
    this.shadowRoot.addEventListener("keyup", this);
  }

  get focusedInput() {
    const activeElement = this.shadowRoot.activeElement;
    if (activeElement?.matches(":focus")) {
      return activeElement;
    }
    return null;
  }
  get activeArea() {
    let input = this.focusedInput;
    if (input) {
      return input.closest(".area");
    }
  }
  getAreaElement(areaId) {
    return this.shadowRoot.querySelector(`[data-area="${areaId}"]`);
  }

  toggleActive(toActive) {
    const activeArea = this.activeArea;
    if (toActive && !activeArea) {
      const firstInput = this.shadowRoot.querySelector("input[name]");
      this.focusArea(firstInput.name);
    } else if (!toActive && activeArea) {
      this.blurArea(activeArea.dataset.area);
    }
    this.isActive = toActive;
  }

  handleClick(event) {
    if (this === event.target) {
      return;
    }
    if (this.shadowRoot.contains(event.target)) {
      // Handle a click inside the editor somewhere.
      let containingArea = event.target.closest(".area");
      console.log("handleClick, got containingArea: ", containingArea);
      if (!containingArea) {
        let areaElem = this.activeArea;
        if (areaElem) {
          this.blurArea(areaElem.dataset.area);
          this.page.updateArea({
            id: this.activeArea.dataset.area,
            value: areaElem.querySelector("input").value
          });
        }
        return;
      }
      if (!this.activeArea || containingArea != this.activeArea) {
        console.log("containingArea:", containingArea);
        this.focusArea(containingArea.dataset.area);
      }
    } else if (this.isActive && this.shadowRoot.activeElement) {
      // Handle a click outside the editor entirely
      console.log("faux change event, ", this.shadowRoot.activeElement);
      this.toggleActive(false);
      const areaElem = this.activeArea;
      if (areaElem) {
        this.blurArea(areaElem.dataset.area);
      }
      return;
    }
  }
  handleEvent(event) {
    if (event.type == "keyup" && event.key == "Enter") {
      const areaId = event.target.name;
      const areaElem = areaId && this.getAreaElement(areaId);
      if (!areaElem) {
        return;
      }
      event.preventDefault();
      const input = event.originalTarget;
      const prevValue = this.page.getAreaValue(areaId);
      if (prevValue !== input.value) {
      }
      this.blurArea(areaId)
      return;
    }
    if (event.type == "blur") {
      const areaId = event.target.name;
      this.blurArea(areaId);
    } else if (event.type == "focus") {
      let elem = this.focusedInput;
      if (elem?.name) {
        this.focusArea(elem?.name);
      }
    }
  }

  maybeHandleChange(event) {
    let input = event.explicitOriginalTarget || event.originalTarget || event.target;
    let areaElem = input && this.getAreaElement(input.name);
    if (!areaElem) {
      console.warn("maybeHandleChange, no editable area for input:", input);
      return;
    }
    const prevValue = this.page.getAreaValue(input.name);
    if (prevValue !== input.value) {
      this.page.updateArea({ id: input.name, value: input.value });
    }
  }

  focusArea(areaId) {
    console.trace("focusArea");
    const prevInput = this.previousActiveElement;
    const areaElem = this.getAreaElement(areaId);
    console.log(`focusArea, areaId: ${areaId}, areaElem:`, areaElem);
    const input = areaElem.querySelector("input");
    if (input !== this.shadowRoot.activeElement) {
      input.focus();
    }
    if (prevInput && areaId !== prevInput.name) {
      this.blurArea(prevInput.name);
    }
    this.previousActiveElement = input;
    areaElem.classList.toggle("active", true)
  }

  blurArea(areaId, forceBlur) {
    if (!this.activeArea || this.activeArea.dataset.area !== areaId) {
      return;
    }
    const areaElem = this.getAreaElement(areaId);
    const input = areaElem.querySelector("input");
    if (forceBlur && input === this.shadowRoot.activeElement) {
      input.blur();
    }
    this.maybeHandleChange({
      explicitOriginalTarget: input
    });
    this.previousActiveElement = null;
    areaElem.classList.toggle("active", false);
    this.isActive = this.ownerDocument.activeElement == this;
  }

  valueOf(name) {
    return this.shadowRoot.querySelector(`input[name="${name}"]`)?.value;
  }

  imageArea(area) {
    console.log("imageArea, value:", area.value);
    let imgSrc = area.value ? new URL(area.value, this.baseURL) : grey1x1_url;
    return html`<div class="area image-area" data-area="${area.id}" style=${ areaStyle(area) } title="${area.id} (${area.type})">
      <input
        type="text" value="${area.value || ''}" class="url-input" name="${area.id}"
        @change="${this.maybeHandleChange}"
        @focus="${this.handleEvent}"
       >
    </div>`;
  }

  qrcodeArea(area) {
    console.log("qrcodeArea, value:", area.value);
    let imgSrc = grey1x1_url;
    if (area.value) {
      const paramsString = `url=${encodeURIComponent(area.value)}`;
      imgSrc = new URL(`/url2qrcode?${paramsString}`, this.baseURL);
    }

    return html`<div class="area image-area" data-area="${area.id}" style=${ areaStyle(area) } title="${area.id} (${area.type})">
      <input
        type="text" value="${area.value || ''}" class="url-input" name="${area.id}"
        @change="${this.maybeHandleChange}"
        @focus="${this.handleEvent}"
       >
    </div>`;
  }

  textArea(area) {
    return html`<div class="area text-area" data-area="${area.id}" style=${ areaStyle(area) } title="${area.id} (${area.type})">
      <input
        type="text" value="${area.value || ''}" class="url-input" name="${area.id}"
        style="font-size: ${area.fontSize ?? area.height/2}px"
        placeholder="${area.placeholder || ''}"
        @change="${this.maybeHandleChange}"
        @focus="${this.handleEvent}"
       >
    </div>`;
  }

  urlArea(area) {
    return html`<div class="area url-area" data-area="${area.id}" style=${ areaStyle(area) } title="${area.id} (${area.type})">
      <input
        type="text" value="${area.value || ''}" class="url-input" name="${area.id}"
        @change="${this.maybeHandleChange}"
        @focus="${this.handleEvent}"
       >
    </div>`;
  }

  // type: type,
  // x: x,
  // y: y,
  // width: width,
  // height: height

  render() {
    let viewData = Object.fromEntries(this.page);
    let areas = this.page.get("areas");
    return html`
      <link
        rel="stylesheet"
        href="${this.baseURL}/editor.css"
      />
      <div class="page-editor ${this.isActive ? 'active' : ''}" style="width: ${viewData.width}px; height: ${viewData.height}px" data-name="${viewData.name}">
        ${[...areas.values()].map((area) => {
          switch (area.type) {
            case "image":
              return this.imageArea(area);
            case "qrcode":
              return this.qrcodeArea(area);
            case "url":
              return this.urlArea(area);
            case "text":
              return this.textArea(area);
            default:
              console.log("Unknown area type:", area.type, area);
          }
          })
        }
      </div>
    `;
  }

  checkValidity() {
    return Array.from(this.shadowRoot.querySelectorAll(".area > input")).every(inp => inp.checkValidity());
  }
}
customElements.define("page-editor", PageEditor);
