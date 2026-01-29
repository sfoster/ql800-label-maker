export function loadImage(src) {
  let img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (ex) => {
      console.error("loadImage error:", ex);
      reject(img);
    };
    img.src = src;
  });
}

export function sanitizeFilename(filename) {
  filename = filename
    .replace(/[\\/]/g, "_")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/[\x00-\x1f\x7f-\x9f:*?|"<>;,+=\[\]]+/g, " ")
    .replace(/^[\s\u180e.]+|[\s\u180e.]+$/g, "");
  filename = filename.replace(/\s{1,4000}/g, "-");
  filename = filename.replace(/\-{1,4000}/g, "-");
  return filename;
}

export async function imageUrlToDataURI(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
