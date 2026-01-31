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

  // Handle file drop for image regions
  async handleFileDrop(event, regionId) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      console.warn('Dropped file is not an image');
      return;
    }

    // Convert file to data URI
    const dataUri = await this.fileToDataURI(file);

    // Update template model
    this.template.updateRegion({ id: regionId, value: dataUri });
  }

  // Convert file to data URI
  fileToDataURI(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Handle drag over to allow drop
  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  }

  // Handle drag leave
  handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
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
    const labelDefaults = {
      'qrCode': 'QR Code URL',
      'image': 'Image',
      'labelText': 'Label Text',
      'emsLogo': 'Logo Image URL'
    };
    return region.labelText || labelDefaults[region.id] || region.id;
  }

  // Render appropriate editor based on region type
  renderRegionEditor(region) {
    // Check if region is an image type (image or qrcode)
    if (region.regionType === 'image' || region.regionType === 'qrcode') {
      return this.renderImageEditor(region);
    }
    // Default to text editor for string regions
    return this.renderTextEditor(region);
  }

  // Render image editor with drag-and-drop support
  renderImageEditor(region) {
    return html`
      <div class="form-field image-field">
        <label for="input-${region.id}">${this.getRegionLabel(region)}</label>
        <div class="image-editor">
          <div
            class="drop-zone"
            @drop="${(e) => this.handleFileDrop(e, region.id)}"
            @dragover="${this.handleDragOver}"
            @dragleave="${this.handleDragLeave}"
            @mouseenter="${this.handleFormFieldHover}"
            @mouseleave="${this.handleFormFieldHoverOut}"
          >
            <div class="drop-zone-text">
              <span class="drop-icon">📁</span>
              <span>Drop image here</span>
            </div>
          </div>
          <div class="url-input-wrapper">
            <input
              id="input-${region.id}"
              type="text"
              name="${region.id}"
              value="${region.value || ''}"
              placeholder="${region.placeholder || 'Or enter URL / data URI'}"
              @change="${this.handleInputChange}"
              @mouseenter="${this.handleFormFieldHover}"
              @mouseleave="${this.handleFormFieldHoverOut}"
            >
          </div>
        </div>
      </div>
    `;
  }

  // Render simple text editor
  renderTextEditor(region) {
    return html`
      <div class="form-field">
        <label for="input-${region.id}">${this.getRegionLabel(region)}</label>
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
    `;
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
    return Object.values(regions).map(region => this.renderRegionEditor(region));
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
