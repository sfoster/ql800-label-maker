function withContext(instructions, ctx) {
  ctx.save();
  instructions(ctx);
  ctx.restore();
}

function loadImage(src) {
  let img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.src = src;
  });
}

async function drawQRCodeArea(ctx, area) {
  let loadedImage;
  if (area.value) {
    const paramsString = `url=${encodeURIComponent(area.value)}`;
    let url = new URL(`/url2qrcode?${paramsString}`, window.config.baseURL);
    //console.log("drawImageArea", area.value, url);
    loadedImage = await loadImage(url);
  }
  // Draw the QR Code image
  withContext((ctx) => {
    // console.log("drawQRCodeArea:", area);
    if ("opacity" in area) {
        ctx.globalAlpha = area.opacity;
    }
    ctx.translate(area.x, area.y);
    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, area.width, area.height);
    } else {
      ctx.fillStyle = "green";
      ctx.fillRect(0, 0, area.width, area.height);
    }
    // ctx.lineWidth = 1;
    // ctx.strokeStyle = "magenta";
    // ctx.strokeRect(0, 0, area.width, area.height);
  }, ctx);
}

async function drawImageArea(ctx, area) {
  let loadedImage;
  if (area.value) {
    let url = new URL(area.value, window.config.baseURL);
    loadedImage = await loadImage(url);
  }
  // Draw the ems-logo image along the bottom
  withContext((ctx) => {
    // console.log("drawImageArea:", area);
    if ("opacity" in area) {
      ctx.globalAlpha = area.opacity;
    }
    ctx.translate(area.x, area.y);
    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, area.width, area.height);
    } else {
      ctx.fillStyle = "green";
      ctx.fillRect(0, 0, area.width, area.height);
    }
  }, ctx);
}

async function drawTextArea(ctx, area) {
  withContext((ctx) => {
    //console.log("drawTextArea:", area);
    let fontSize = 64;
    ctx.font = `bold ${area.fontSize ?? area.height/2}px 'Liberation Serif'`;
    let textString = area.value || "";
    let metrics = ctx.measureText(textString);
    let textHeight = fontSize * 1.2;  // Rough estimate based on font size

    console.log(`drawTextArea: textString: ${textString}, textHeight: ${textHeight}`)
    ctx.translate(area.x, area.y);
    // ctx.lineWidth = 1;
    // ctx.strokeStyle = "magenta";
    // ctx.strokeRect(0, 0, area.width, textHeight);

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

export async function updateCanvas(page) {
  console.log("updateCanvas with:", page);
  let canvas = document.querySelector("#source-canvas");
  let resultCanvas = result.canvas;

  let ctx = canvas.getContext("2d");

  let areas = page.get("areas");
  let width = canvas.width = page.get("width");
  let height = canvas.height = page.get("height");
  canvas.style.width = page.get("displayWidth");
  canvas.style.height = page.get("displayHeight");

  let unit = page.get("unit");
  let unitMargin = page.get("unitMargin");

  resultCanvas.width = canvas.height;
  resultCanvas.height = canvas.width;
  let outputContext = resultCanvas.getContext("2d");

  // Background layer
  withContext((ctx, ) => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }, ctx);

  ctx.filter = 'grayscale(1)';
 // Set the style for the rectangle
  ctx.strokeStyle = 'black'; // Color of the outline

  let areasDrawn = [];

  for (let [areaId, area] of areas.entries()) {
    switch (area.type) {
      case "image":
        areasDrawn.push(drawImageArea(ctx, area));
        break;
      case "qrcode":
        areasDrawn.push(drawQRCodeArea(ctx, area));
        break;
      case "text":
        areasDrawn.push(drawTextArea(ctx, area));
        break;
    }
  }

  await Promise.all(areasDrawn);
  // Outline
  withContext((ctx) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#aaa";
    ctx.strokeRect(unitMargin, unitMargin, width-unitMargin*2,height-unitMargin*2);
  }, ctx);

  convertToBlackAndWhite(canvas, 0.6);

  withContext((ctx) => {
    // Rotate the destination canvas context
    ctx.translate(resultCanvas.width / 2, resultCanvas.height / 2);
    ctx.rotate(90 * Math.PI / 180); // Rotate 90 degrees
    ctx.translate(-resultCanvas.height / 2, -resultCanvas.width / 2);

    // Draw the source canvas onto the destination (portrait) canvas
    ctx.drawImage(canvas, 0, 0);
  }, outputContext);

  result.blob = await resultCanvas.convertToBlob();
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
