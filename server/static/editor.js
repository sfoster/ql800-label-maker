import { LitElement, html } from "./lit-core.min.js"

function areaStyle(area) {
  return `top: ${area.y}px; left: ${area.x}px; width: ${area.width}px; height: ${area.height}px;`;
}

export class PageEditor extends LitElement {
  static properties = {
    page: { default: null },
    baseURL: { default: null },
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

  // Handle form input changes
  handleInputChange(event) {
    const input = event.target;
    const areaId = input.name;
    const newValue = input.value;

    console.log(`Input changed: ${areaId} = ${newValue}`);

    // Update page model
    this.page.updateArea({ id: areaId, value: newValue });

    // Canvas re-render happens automatically via page-change event
  }

  // Handle hover on form fields to highlight preview areas
  handleFormFieldHover(event) {
    const input = event.target;
    const areaId = input.name;

    // Add highlight class to corresponding preview area
    this.highlightPreviewArea(areaId);
  }

  // Handle hover out
  handleFormFieldHoverOut(event) {
    this.clearHighlights();
  }

  // Highlight preview area
  highlightPreviewArea(areaId) {
    const area = this.shadowRoot.querySelector(`[data-area="${areaId}"]`);
    if (area) {
      area.classList.add('highlighted');
    }
  }

  // Clear all highlights
  clearHighlights() {
    this.shadowRoot.querySelectorAll('.preview-area.highlighted').forEach(el => {
      el.classList.remove('highlighted');
    });
  }

  // Get user-friendly label for area
  getAreaLabel(area) {
    const labels = {
      'qrCode': 'QR Code URL',
      'labelText': 'Label Text',
      'emsLogo': 'Logo Image URL'
    };
    return labels[area.id] || area.id;
  }

  // Render preview areas (for hover outlines only)
  renderPreviewAreas(viewData) {
    const areas = viewData.areas || [];
    return areas.map(area => html`
      <div class="preview-area"
           data-area="${area.id}"
           style="${areaStyle(area)}"
           title="${this.getAreaLabel(area)}">
      </div>
    `);
  }

  // Render form fields (actual inputs)
  renderFormFields(viewData) {
    const areas = viewData.areas || [];
    return areas.map(area => html`
      <div class="form-field">
        <label for="input-${area.id}">${this.getAreaLabel(area)}</label>
        <input
          id="input-${area.id}"
          type="text"
          name="${area.id}"
          value="${area.value || ''}"
          placeholder="${area.placeholder || ''}"
          ?required="${area.required}"
          @change="${this.handleInputChange}"
          @mouseenter="${this.handleFormFieldHover}"
          @mouseleave="${this.handleFormFieldHoverOut}"
        >
      </div>
    `);
  }

  render() {
    let viewData = Object.fromEntries(this.page);
    viewData.areas = [...this.page.get("areas").values()];

    return html`
      <link
        rel="stylesheet"
        href="${this.baseURL}/editor.css"
      />
      <div class="editor-container">
        <!-- Preview section (read-only) -->
        <div class="preview-section">
          <div class="page-preview"
               style="width: ${viewData.displayWidth}; height: ${viewData.displayHeight}">
            ${this.renderPreviewAreas(viewData)}
          </div>
        </div>

        <!-- Form section (editable) -->
        <div class="form-section">
          <h3>Label Fields</h3>
          ${this.renderFormFields(viewData)}
        </div>
      </div>
    `;
  }

  checkValidity() {
    return Array.from(this.shadowRoot.querySelectorAll(".form-field > input")).every(inp => inp.checkValidity());
  }
}
customElements.define("page-editor", PageEditor);
