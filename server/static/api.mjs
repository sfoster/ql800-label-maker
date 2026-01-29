/**
 * @module api
 * @description Server API communication for device management and printing
 */

export async function getDeviceList() {
  try {
    const response = await fetch(window.location.origin + '/devices', {
      method: 'GET',
    });
    const data = await response.json();
    console.log("/devices got result:", data);
    return data.result;
  } catch (error) {
    console.error('Error fetching device list:', error);
    throw error;
  }
}

export async function sendBlob(blob, endpoint, dryRun = false) {
  if (!endpoint) {
    console.warn("sendBlob: no endpoint given");
    return;
  }

  const formData = new FormData();
  if (dryRun) {
    formData.set("dryrun", true);
  }
  formData.append('image', blob, 'canvas-image.png');

  console.log("sendBlob: sending request to:", window.location.origin + endpoint);

  try {
    const response = await fetch(window.location.origin + endpoint, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    console.log('Print request success:', data);
    return data;
  } catch (error) {
    console.error('Print request error:', error);
    throw error;
  }
}

// Expose for console debugging
if (typeof window !== 'undefined') {
  window.__api = { getDeviceList, sendBlob };
}
