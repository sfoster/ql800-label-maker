#!/usr/bin/env node
/**
 * Proof of Concept: Verify we can control the web UI via Puppeteer
 *
 * This script:
 * 1. Launches a headless browser
 * 2. Navigates to the Flask app
 * 3. Waits for the App to initialize
 * 4. Accesses window.__app to verify control
 * 5. Prints diagnostic information
 */

import puppeteer from 'puppeteer';

const SERVER_URL = 'http://localhost:5000';

async function main() {
  console.log('🚀 Launching headless browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Listen for console messages from the page
  page.on('console', msg => {
    console.log('  [Browser Console]:', msg.text());
  });

  console.log(`📡 Navigating to ${SERVER_URL}...`);
  await page.goto(SERVER_URL, { waitUntil: 'networkidle2' });

  console.log('⏳ Waiting for App to initialize...');

  // Wait for the App singleton to be available
  await page.waitForFunction(() => {
    return window.__app && window.__app.templateLoader;
  }, { timeout: 10000 });

  console.log('✅ App initialized! Checking status...\n');

  // Extract diagnostic info from the page
  const diagnostics = await page.evaluate(() => {
    const app = window.__app;
    return {
      hasApp: !!app,
      hasTemplateLoader: !!app?.templateLoader,
      hasTemplateInstance: !!app?.templateInstance,
      currentTemplate: app?.templateInstance?.id || 'none',
      availableTemplates: app?.templateLoader ? Array.from(window.templateMap?.keys() || []) : [],
      devices: app?.devices?.length || 0
    };
  });

  console.log('📊 Diagnostics:');
  console.log('  - App available:', diagnostics.hasApp);
  console.log('  - Template loader ready:', diagnostics.hasTemplateLoader);
  console.log('  - Current template:', diagnostics.currentTemplate);
  console.log('  - Available templates:', diagnostics.availableTemplates.join(', '));
  console.log('  - Connected devices:', diagnostics.devices);

  // Try to access a template's regions if one is loaded
  if (diagnostics.hasTemplateInstance) {
    console.log('\n🔍 Inspecting template regions...');

    const regions = await page.evaluate(() => {
      const template = window.__app.templateInstance;
      if (!template?.properties?.regions) return null;

      const regionInfo = {};
      for (const [id, region] of Object.entries(template.properties.regions)) {
        regionInfo[id] = {
          type: region.regionType,
          label: region.labelText,
          currentValue: region.value
        };
      }
      return regionInfo;
    });

    if (regions) {
      console.log('  Available regions:');
      for (const [id, info] of Object.entries(regions)) {
        console.log(`    - ${id} (${info.type}): "${info.currentValue}"`);
      }
    }
  } else {
    console.log('\n⚠️  No template loaded. This is expected on first load.');
    console.log('   The UI requires user to select a template from dropdown.');
  }

  console.log('\n✨ Proof of concept successful!');
  console.log('   Next step: Load a template and update regions programmatically.\n');

  await browser.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
