import { loadImage } from "./helpers.mjs"

function withContext(instructions, ctx) {
  ctx.save();
  instructions(ctx);
  ctx.restore();
}

async function drawQRCodeArea(ctx, region) {
  let loadedImage;
  if (region.value) {
    const paramsString = `url=${encodeURIComponent(region.value)}`;
    let url = new URL(`/url2qrcode?${paramsString}`, window.config.baseURL);
    //console.log("drawImageArea", region.value, url);
    loadedImage = await loadImage(url);
  }
  // Draw the QR Code image
  withContext((ctx) => {
    // console.log("drawQRCodeArea:", region);
    if ("opacity" in region) {
        ctx.globalAlpha = region.opacity;
    }
    ctx.translate(region.x, region.y);
    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, region.width, region.height);
    } else {
      ctx.fillStyle = "green";
      ctx.fillRect(0, 0, region.width, region.height);
    }
    // ctx.lineWidth = 1;
    // ctx.strokeStyle = "magenta";
    // ctx.strokeRect(0, 0, region.width, region.height);
  }, ctx);
}

async function drawImageArea(ctx, region) {
  let loadedImage;
  if (region.value) {
    let url = new URL(region.value, window.config.baseURL);
    loadedImage = await loadImage(url);
  }
  // Draw the ems-logo image along the bottom
  withContext((ctx) => {
    // console.log("drawImageArea:", region);
    if ("opacity" in region) {
      ctx.globalAlpha = region.opacity;
    }
    ctx.translate(region.x, region.y);
    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, region.width, region.height);
    } else {
      ctx.fillStyle = "green";
      ctx.fillRect(0, 0, region.width, region.height);
    }
  }, ctx);
}

async function drawTextArea(ctx, region) {
  withContext((ctx) => {
    //console.log("drawTextArea:", region);
    let fontSize = 64;
    ctx.font = `bold ${region.fontSize ?? region.height/2}px 'Liberation Serif'`;
    let textString = region.value || "";
    let metrics = ctx.measureText(textString);
    let textHeight = fontSize * 1.2;  // Rough estimate based on font size

    console.log(`drawTextArea: textString: ${textString}, textHeight: ${textHeight}`)
    ctx.translate(region.x, region.y);
    // ctx.lineWidth = 1;
    // ctx.strokeStyle = "magenta";
    // ctx.strokeRect(0, 0, region.width, textHeight);

    ctx.fillStyle = "black";
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
    ctx.fillText(textString, 0, 0);
  }, ctx);
}

export const result = {
  canvas: new OffscreenCanvas(10, 10),
  blob: null,
};

export async function updateCanvas(img, template) {
  console.log("updateCanvas with:", template);
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

 // // Set the style for the rectangle
 //  ctx.strokeStyle = 'black'; // Color of the outline

  // convertToBlackAndWhite(canvas, 0.6);

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

function convertToBlackAndWhite(canvas, threshold=0.5) {
  let ctx = canvas.getContext('2d');
  let threshold8 = threshold * 255;

  // Get the image data from the entire canvas
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let data = imageData.data;

  // Loop through each pixel in the image data
  for (let i = 0; i < data.length; i += 4) {
    // Get the RGB values
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Convert to grayscale using basic average
    let grayscale = (r + g + b) / 3;

    // Apply the threshold to determine if the pixel should be black or white
    if (grayscale > threshold8) {
      data[i] = 255; // Red
      data[i + 1] = 255; // Green
      data[i + 2] = 255; // Blue
    } else {
      data[i] = 0; // Red
      data[i + 1] = 0; // Green
      data[i + 2] = 0; // Blue
    }
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}
