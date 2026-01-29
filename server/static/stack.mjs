import { LitElement, html } from "./lit-core.min.js"
import { getBaseURL } from "./config.mjs"

export class LayerStack extends HTMLElement {
  get baseURL() {
    return getBaseURL();
  }
  get layers() {
    return [...this.children].map((elem, index) => {
      return {
        title: elem.title,
        index,
        elem,
      };
    });
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      for (let i=0; i<this.childElementCount;i++) {
        this.children[i].dataset.index = i;
        this.children[i].classList.add("layer");
      }
    });
  }
}
customElements.define("layer-stack", LayerStack);
