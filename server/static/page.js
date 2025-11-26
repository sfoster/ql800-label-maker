// Create a page with areas
const pages = new Map();

function registerPage(pageProperties = {}, areas) {
  let page = new PageModel();
  page.batch({ ...pageProperties, areas }, false);
  pages.set(pageProperties.name, page);
}

const Emitter = new class _Emitter {
  constructor() {
    this._scheduled = {};
  }
  scheduleNotify(name) {
    if (!this._scheduled[name]) {
      this._scheduled[name] = true;
      Promise.resolve().then(() => {
        delete this._scheduled[name];
        const changeEvent = new CustomEvent('page-change', { detail: name });
        console.log("scheduleNotify, dispatchEvent for name:", name, changeEvent);
        window.document.documentElement.dispatchEvent(changeEvent);
      });
    }
  }
}

class PageModel extends Map {
  _shouldNotify = true;
  get id() {
    return this.get("name");
  }
  set(name, value) {
    if (this.get(name) !== value) {
      if (name == "areas") {
        const areas = new Map();
        for (let area of value) {
          areas.set(area.id, area);
        }
        super.set(name, areas);
      } else {
        super.set(name, value);
      }
      Emitter.scheduleNotify(this.id);
    }
  }
  updateArea({ id, value }, shouldNotify=true) {
    console.log("updateArea", this.get("areas"));
    let area = this.get("areas")?.get(id);
    if (area) {
      area.value = value;
      if (shouldNotify) {
        Emitter.scheduleNotify(this.id);
      }
    }
  }
  getAreaValue(id) {
    return this.get("areas")?.get(id)?.value;
  }
  batch(nameValues, shouldNotify=true) {
    this._shouldNotify = false;
    for (let [name, value] of Object.entries(nameValues)) {
      this.set(name, value);
    }
    this._shouldNotify = true;
    if (shouldNotify) {
      Emitter.scheduleNotify(this.id);
    }
  }
}

function getPages() {
  return pages;
}

// Create an area
function createArea(type, x, y, width, height) {
    return {
        type: type,
        x: x,
        y: y,
        width: width,
        height: height
    };
}

export {
  registerPage,
  getPages,
  createArea,
};