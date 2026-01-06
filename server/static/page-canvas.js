import { loadImage } from "./helpers.mjs"

function withContext(instructions, ctx) {
  ctx.save();
  instructions(ctx);
  ctx.restore();
}

export const result = {
  canvas: new OffscreenCanvas(10, 10),
  blob: null,
};

export async function updateCanvas(img, template) {
  let canvas = document.querySelector("#source-canvas");
  let resultCanvas = result.canvas;
  let ctx = canvas.getContext("2d");

  let width = canvas.width = template.get("width");
  let height = canvas.height = template.get("height");
  canvas.style.width = template.get("displayWidth");
  canvas.style.height = template.get("displayHeight");

  resultCanvas.width = canvas.height;
  resultCanvas.height = canvas.width;
  let outputContext = resultCanvas.getContext("2d");

  // Background layer
  withContext((ctx, ) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, ctx);

  ctx.filter = 'grayscale(1)';
  // render the SVG template to the canvas
  ctx.drawImage(img, 0, 0);

  withContext((ctx) => {
    // Rotate the destination canvas context
    ctx.translate(resultCanvas.width / 2, resultCanvas.height / 2);
    ctx.rotate(90 * Math.PI / 180); // Rotate 90 degrees
    ctx.translate(-resultCanvas.height / 2, -resultCanvas.width / 2);

    // Draw the source canvas onto the destination (portrait) canvas
    ctx.drawImage(canvas, 0, 0);
  }, outputContext);

  result.blob = await resultCanvas.convertToBlob();
  return result;
};
