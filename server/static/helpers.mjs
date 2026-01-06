export function loadImage(src) {
  let img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      console.log("loadImage resolved");
      resolve(img);
    };
    img.onerror = (ex) => {
      console.error("loadImage error:", ex);
      reject(img);
    };
    img.src = src;
  });
}
