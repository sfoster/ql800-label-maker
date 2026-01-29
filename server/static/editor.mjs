import { LitElement, html } from "./lit-core.min.js"

function regionStyle(region) {
  const regionBox = region.box;
  return `top: ${regionBox.top}px; left: ${regionBox.left}px; width: ${regionBox.width}px; height: ${regionBox.height}px;`;
}

export class TemplateEditor extends LitElement {
  static properties = {
    template: { default: null },
    baseURL: { default: null },
  };

  configure(templateData) {
    this.template = templateData;
    this.baseURL = this.ownerDocument.documentURI;
  }

  shouldUpdate() {
    if (!this.template || this.baseURL == null) {
      console.log("Not rendering as we've no template or config data", this.template, this.baseURL);
      return false;
    }
    return true
  }

  // Handle form input changes
  handleInputChange(event) {
    const input = event.target;
    const regionId = input.name;
    const newValue = input.value;
    // Update template model
    this.template.updateRegion({ id: regionId, value: newValue });
  }

  // Handle hover on form fields to highlight preview regions
  handleFormFieldHover(event) {
    const input = event.target;
    const regionId = input.name;

    // Add highlight class to corresponding preview region
    this.highlightPreviewRegion(regionId);
  }

  // Handle hover out
  handleFormFieldHoverOut(event) {
    this.clearHighlights();
  }

  // Highlight preview region
  highlightPreviewRegion(regionId) {
    const region = this.shadowRoot.querySelector(`[data-region="${regionId}"]`);
    if (region) {
      region.classList.add('highlighted');
    }
  }

  // Clear all highlights
  clearHighlights() {
    this.shadowRoot.querySelectorAll('.preview-region.highlighted').forEach(el => {
      el.classList.remove('highlighted');
    });
  }

  // Get user-friendly label for region
  getRegionLabel(region) {
    const labels = {
      'qrCode': 'QR Code URL',
      'labelText': 'Label Text',
      'emsLogo': 'Logo Image URL'
    };
    return labels[region.id] || region.id;
  }

  // Render preview regions (for hover outlines only)
  renderPreviewRegions(viewData, parentRect) {
    const regions = viewData.regions || [];
    return Object.values(regions).map(region => html`
      <div class="preview-region"
           data-region="${region.id}"
           style="${regionStyle(region)}"
           title="${this.getRegionLabel(region)}">
      </div>
    `);
  }

  // Render form fields (actual inputs)
  renderFormFields(viewData) {
    const regions = viewData.regions || [];
    return Object.values(regions).map(region => html`
      <div class="form-field">
        <label for="input-${region.id}">${this.getRegionLabel(region)} (${region.regionType})</label>
        <input
          id="input-${region.id}"
          type="text"
          name="${region.id}"
          value="${region.value || ''}"
          placeholder="${region.placeholder || ''}"
          @change="${this.handleInputChange}"
          @mouseenter="${this.handleFormFieldHover}"
          @mouseleave="${this.handleFormFieldHoverOut}"
        >
      </div>
    `);
  }

  render() {
    let viewData = this.template.properties;
    let editorCSSURL = new URL("editor.css", this.baseURL);
    return html`
      <link
        rel="stylesheet"
        href="${editorCSSURL}"
      />
      <div class="editor-container">
        <!-- Preview section (read-only) -->
        <div class="preview-section">
          <div class="template-preview"
               style="width: ${viewData.displayWidth ?? viewData.width}px; height: ${viewData.displayHeight ?? viewData.height}px">
            ${this.renderPreviewRegions(viewData)}
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
customElements.define("template-editor", TemplateEditor);
