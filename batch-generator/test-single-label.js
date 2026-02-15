#!/usr/bin/env node
/**
 * Test: Generate a single label image
 *
 * This script:
 * 1. Loads a specific template
 * 2. Updates region values
 * 3. Waits for rendering
 * 4. Extracts the PNG
 * 5. Saves to file
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const SERVER_URL = 'http://localhost:5000';
const TEMPLATE_ID = 'ems-29x90-qrcode'; 
const OUTPUT_DIR = './output';

async function main() {
  console.log('🚀 Launching headless browser...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor console for debugging
  page.on('console', msg => {
    const text = msg.text();
    // Filter out noisy logs
    if (!text.includes('JSHandle')) {
      console.log('  [Browser]:', text);
    }
  });

  console.log('📡 Loading web UI...');
  await page.goto(`${SERVER_URL}?template=${TEMPLATE_ID}`, { waitUntil: 'networkidle2' });

  // Wait for App to initialize
  await page.waitForFunction(() => window.__app?.editorReady, { timeout: 10000 });
  console.log('✅ App ready\n');

  // Get available templates
  console.log('🔍 Finding available templates...');
  const templates = await page.evaluate(() => {
    const app = window.__app;
    // templateMap is in the closure, but we can trigger configureAvailableTemplates
    // which populates it, then check optionsElem
    return window.document.querySelector("template-list")?.items || [];
  });

  console.log('  Available templates:', templates.join(', '));

  if (templates.length === 0) {
    console.log('⚠️  No templates found. The UI might need user interaction to load them.');
    console.log('   Checking if we can trigger template configuration...\n');
  }
  if (!templates.includes(TEMPLATE_ID)) {
    console.log(`⚠️  template: ${TEMPLATE_ID} not available.`);
  }

  // Wait for template to load and render
  await page.waitForFunction(() => {
    return window.__app.editorReady;
    //  && window.__app.templateInstance && window.__app.hasImage;
  }, { timeout: 10000 });

  console.log('✅ Template loaded\n');

  // Get current region values
  console.log('🔍 Current region values:');
  const regions = await page.evaluate(() => {
    const template = window.__app.templateInstance;
    const regionData = {};
    for (const [id, region] of Object.entries(template.properties.regions)) {
      regionData[id] = {
        type: region.regionType,
        value: region.value
      };
    }
    return regionData;
  });

  for (const [id, info] of Object.entries(regions)) {
    console.log(`  - ${id} (${info.type}): "${info.value}"`);
  }

  // Update regions with test data
  console.log('\n✏️  Updating regions with test data...');
  const testData = {
    'qrcode-image': 'https://example.com/item/12345',
    'label-text': 'TEST ITEM #12345'
  };

  for (const [regionId, newValue] of Object.entries(testData)) {
    console.log(`  - Setting ${regionId} = "${newValue}"`);
    await page.evaluate(({ id, value }) => {
      const app = window.__app;
      if (app.templateInstance) {
        app.templateInstance.updateRegion({ id, value });
      }
    }, { id: regionId, value: newValue });
  }

  // Wait for rendering to complete after updates
  console.log('\n⏳ Waiting for rendering...');
  await page.waitForFunction(() => {
    return window.__app.hasImage && window.__app._resultBlob;
  }, { timeout: 10000 });

  console.log('✅ Rendering complete\n');

  // Extract the PNG blob
  console.log('💾 Extracting PNG...');
  const imageBuffer = await page.evaluate(async () => {
    const blob = window.__app._resultBlob;
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  });

  // Save to file
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const filename = 'test-label.png';
  const filepath = path.join(OUTPUT_DIR, filename);

  const buffer = Buffer.from(imageBuffer, 'base64');
  await fs.writeFile(filepath, buffer);

  console.log(`✅ Saved: ${filepath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(2)} KB\n`);

  console.log('✨ Success! Label generated.\n');

  await browser.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
