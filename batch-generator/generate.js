#!/usr/bin/env node
/**
 * Batch Label Generator
 *
 * Generates label images from a CSV file using headless browser automation.
 *
 * Usage:
 *   node generate.js --csv data.csv --template ems-29x90-qrcode --output ./labels
 *
 * CSV Format:
 *   The CSV should have columns matching the template's region IDs.
 *   Example for ems-29x90-qrcode template:
 *     qrcode-image,label-text
 *     https://example.com/item1,Item #001
 *     https://example.com/item2,Item #002
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const SERVER_URL = 'http://localhost:5000';

let templateRegionIds = [];

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    csv: null,
    template: 'ems-29x90-qrcode',
    output: './output',
    delay: 500, // ms delay between updates to ensure rendering completes
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      options.csv = args[i + 1];
      i++;
    } else if (args[i] === '--template' && args[i + 1]) {
      options.template = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--delay' && args[i + 1]) {
      options.delay = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Batch Label Generator

Usage:
  node generate.js --csv <file> --template <id> [options]

Options:
  --csv <file>        CSV file with label data (required)
  --template <id>     Template ID (default: ems-29x90-qrcode)
  --output <dir>      Output directory (default: ./output)
  --delay <ms>        Delay between updates (default: 500ms)
  --help, -h          Show this help

CSV Format:
  First row should contain region IDs as column headers.
  Each subsequent row generates one label.

Example:
  qrcode-image,label-text
  https://example.com/item1,Item #001
  https://example.com/item2,Item #002
`);
      process.exit(0);
    }
  }

  if (!options.csv) {
    console.error('❌ Error: --csv argument is required\n');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  return options;
}

// map template regions to spreadsheet column names
function getColumnNameForTemplateRegionId(regionId) {
  switch (regionId) {
    case "qrcode-image":
      return "Inventory URL";
    case "label-text":
      return "Name";
  }
  // return undefined for unknown regionId
}

// Load and parse CSV file
async function loadCSV(filepath) {
  const content = await fs.readFile(filepath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

function getTemplateRegionValuesFromRowData(rowData, labelIndex) {
  // gather up the values for each region in the template
  const templateValues = {};
  console.log(`getting values for template regions: ${templateRegionIds.join(", ")}, using rowData: ${JSON.stringify(rowData)}`);
  for (let id of templateRegionIds) {
    let col = getColumnNameForTemplateRegionId(id);
    let val = rowData[col];
    if (!val) {
      // Abort on an empty string (any empty cells in the spreadsheet/csv)
      // TODO: Maybe add a required-ness thing to the template? Its ok to print without
      // label text, but for the qrcode labels, it makes no sense to not have the URL 
      throw new Error(`Missing data in column: ${col} (template region id: ${id})`);
    }
    templateValues[id] = val;
  }
  return templateValues;
}

// Generate a single label
async function generateLabel(page, rowData, index) {
  console.log(`  📄 Label ${index + 1}...`);
  const templateValues = getTemplateRegionValuesFromRowData(rowData, index);

  // Update all regions from CSV data
  await page.evaluate(async (data) => {
    const app = window.__app;

    // populate the form and generate the label image
    for (let [id, val] of Object.entries(data)) {
      // Set up listener for label-ready BEFORE making changes
      const labelReadyPromise = new Promise((resolve) => {
        document.addEventListener('label-ready', resolve, { once: true });
      });
      app.templateInstance.updateRegion({ id, value: val });
      // Wait for label-ready event
      await labelReadyPromise;
    }
  }, templateValues);


  // Extract PNG as base64
  const imageBuffer = await page.evaluate(async () => {
    const blob = window.__app._resultBlob;
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  });

  return Buffer.from(imageBuffer, 'base64');
}

// Generate filename from row data
function generateFilename(rowData, index) {
  // Try to use label text if available, otherwise use index
  const labelText = rowData['label-text'] || rowData['labelText'];
  if (labelText) {
    // Sanitize filename
    const clean = labelText
      .replace(/[^a-z0-9_\-\.]/gi, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    return `${clean}.png`;
  }
  // Fallback to index-based naming
  return `label_${String(index + 1).padStart(4, '0')}.png`;
}

async function main() {
  const options = parseArgs();

  console.log('🏷️  Batch Label Generator\n');
  console.log(`📂 CSV file: ${options.csv}`);
  console.log(`📋 Template: ${options.template}`);
  console.log(`💾 Output: ${options.output}\n`);

  // Load CSV data
  console.log('📖 Reading CSV...');
  const records = await loadCSV(options.csv);
  console.log(`✅ Found ${records.length} records\n`);

  if (records.length === 0) {
    console.log('⚠️  No records to process');
    return;
  }

  // Show column mapping
  const columns = Object.keys(records[0]);
  console.log('📊 CSV columns (will map to template regions):');
  columns.forEach(col => console.log(`  - ${col}`));

  // Create output directory
  await fs.mkdir(options.output, { recursive: true });

  // Launch browser
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Log all browser console output for debugging
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    // Prefix with type for clarity
    console.log(`  [Browser ${type}]:`, text);
  });

  // Load the web UI with template
  console.log('📡 Loading web UI with template...');
  await page.goto(`${SERVER_URL}?template=${options.template}`, {
    waitUntil: 'networkidle2'
  });

  // Wait for editor to be ready AND template to be loaded
  await page.waitForFunction(() => {
    return window.__app?.editorReady &&
           window.__app?.templateInstance?.properties?.regions;
  }, { timeout: 10000 });
  console.log('✅ Editor ready\n');

  // Verify template regions match CSV columns
  console.log('🔍 Verifying template regions...');
  templateRegionIds = await page.evaluate(() => {
    return Object.keys(window.__app.templateLoader.templateRegions);
  });

  console.log('  Template regions:', templateRegionIds.join(', '));

  const columnNames = templateRegionIds.filter(id => getColumnNameForTemplateRegionId(id));
  const unmatchedRegions = columnNames.filter(id => columns.includes(id));
  if (unmatchedRegions.length > 0) {
    console.log('  ⚠️  Missing csv column(s) for this template\' regions:', unmatchedColumns.join(', '));
    console.log('     Check the .csv input or pick a different template.\n');
    return;
  }

  // Generate labels
  console.log(`\n🏭 Generating ${records.length} labels...\n`);

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      // Generate the label
      const buffer = await generateLabel(page, record, i);

      // Validate the buffer before writing
      if (!buffer || buffer.length === 0) {
        throw new Error('Generated PNG is empty (0 bytes)');
      }

      // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      if (!buffer.subarray(0, 8).equals(pngSignature)) {
        throw new Error('Generated buffer is not a valid PNG');
      }

      // Save to file
      const filename = generateFilename(record, i);
      const filepath = path.join(options.output, filename);
      await fs.writeFile(filepath, buffer);

      results.push({ success: true, filename });
      console.log(`     ✅ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);

    } catch (error) {
      results.push({ success: false, error: error.message, record });
      console.log(`     ❌ Failed: ${error.message}`);
      console.log(`        Row data:`, JSON.stringify(record));
    }
  }

  await browser.close();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  console.log(`\n✨ Complete!`);
  console.log(`   Successful: ${successful}/${records.length}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Output: ${options.output}\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
