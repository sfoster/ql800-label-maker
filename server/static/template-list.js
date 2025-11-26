import { LitElement, html } from "./lit-core.min.js"

export class TemplateList extends LitElement {
  static properties = {
    items: {}
  };
  get picker() {
    return this.shadowRoot.querySelector("select");
  }
  get selectedIndex() {
    return this.picker?.selectedIndex;
  }
  set selectedIndex(newIndex) {
    if (this.picker) {
      this.picker.selectedIndex = newIndex;
    }
  }
  get value() {
    return this.picker?.value;
  }
  set value(newValue) {
    if (this.picker) {
      this.picker.value = newValue;
    }
  }
  handleChange(event) {
    const changeEvent = new CustomEvent('template-change', {
      bubbles: true,
      composed: true  // This is important for crossing the shadow boundary
    });
    this.dispatchEvent(changeEvent);
  }
  render() {
    console.log("TemplateList, rendering items:", this.items);
    if (!this.items?.length) {
      return html`
        <select disabled style="min-width: 14em">
          <option value="">No items</option>
        </select>
      `;
    }

    return html`
      <select @change="${this.handleChange}">
      ${this.items.map((item) => {
        let viewData = Object.fromEntries(item);
        return html`<option value="${viewData.name}">${viewData.name} (${viewData.height}x${viewData.width})</li>`
      })}
      </select>
    `;
  }
}
customElements.define("template-list", TemplateList);
