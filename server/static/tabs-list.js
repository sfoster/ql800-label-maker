import { LitElement, html } from "./lit-core.min.js"

export class TabsList extends LitElement {
  static properties = {
    selectedIndex: { default: 0 },
  };
  get baseURL() {
    return window.config.baseURL;
  }
  get tabs() {
    return [...this.children].map((elem, index) => {
      return {
        title: elem.title,
        selected: index == this.selectedIndex,
        elem,
      };
    });
  }

  connectedCallback() {
    super.connectedCallback();
    let selectedIndex = Array.from(this.children).findIndex(elem => !elem.hidden);
    this.selectedIndex = Math.min(0, selectedIndex);
  }

  shouldUpdate(changedProperties) {
    console.log("shouldUpdate", changedProperties, changedProperties.has("selectedIndex"));
    if (!changedProperties.has("selectedIndex")) {
      return false;
    }
    this.updateComplete.then(() => {
      const changeEvent = new CustomEvent('tab-selected', {
        detail: this.children[this.selectedIndex],
        bubbles: true,
        composed: true  // This is important for crossing the shadow boundary
      });
      this.dispatchEvent(changeEvent);
    });
    return true;
  }

  render() {
    console.log("Render with children:", this.selectedIndex, this.children);
    for (let i=0; i<this.childElementCount;i++) {
      console.log("Setting hidden: ", typeof this.selectedIndex, typeof i);
      this.children[i].hidden = this.selectedIndex !== i;
    }
    return html`
      <link
        rel="stylesheet"
        href="${this.baseURL}/tabs-list.css"
      />
      <ul class="tabs">
      ${this.tabs.map((tab, index) => {
        return html`<li data-index="${index}" class="${tab.selected ? 'selected' : ''}" @click="${this.onTabSelect}">${tab.title}</li>`
      })}
      </ul>
      <div class="wrapper">
        <slot></slot>
      </div>
    `;
  }

  onTabSelect(event) {
    if (event.type == "click") {
      let index = Array.from(event.target.parentNode.children).indexOf(event.target);
      if (index > -1) {
        this.selectedIndex = index;
      }
    }
  }
}
customElements.define("tabs-list", TabsList);
