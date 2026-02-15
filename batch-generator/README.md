# Batch Label Generator

Generates label images from CSV data using headless browser automation.

## How It Works

1. Launches a headless Chrome browser via Puppeteer
2. Loads your web UI with the specified template
3. For each CSV row:
   - Updates template regions with CSV data
   - Waits for rendering to complete
   - Extracts PNG blob
   - Saves to output directory

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
node generate.js --csv your-data.csv --template ems-29x90-qrcode
```

### All Options

```bash
node generate.js \
  --csv data.csv \
  --template ems-29x90-qrcode \
  --output ./labels \
  --delay 500
```

**Options:**
- `--csv <file>` - CSV file with label data (required)
- `--template <id>` - Template ID (default: ems-29x90-qrcode)
- `--output <dir>` - Output directory (default: ./output)
- `--delay <ms>` - Delay between labels in ms (default: 500)

### NPM Scripts

```bash
# Run with example CSV
npm run example

# Custom CSV
npm run generate -- --csv my-labels.csv

# Show help
npm run generate -- --help
```

## CSV Format

The CSV file should have **column headers matching template region IDs**.

For the `ems-29x90-qrcode` template:

```csv
qrcode-image,label-text
https://example.com/item1,Item #001
https://example.com/item2,Item #002
```

### Finding Region IDs

1. Open the template SVG file in `server/static/label-templates/`
2. Look for `data-region-type` attributes
3. Use the element's `id` as the column header

Example from `29x90-qrcode-label-html-text.svg`:
```xml
<image id="qrcode-image" data-region-type="qrcode-image" ... />
<div id="label-text" data-region-type="text" ... />
```

Column headers: `qrcode-image`, `label-text`

## Output

Files are named based on the `label-text` field (sanitized) or fall back to `label_0001.png`, `label_0002.png`, etc.

## Prerequisites

- Flask server must be running on `http://localhost:5000`
- Template must be available in the web UI

## Testing

```bash
# Test basic connectivity
npm test

# Generate a single test label
npm run test-single

# Generate from example CSV
npm run example
```

## Troubleshooting

**"No template loaded"** - Ensure the Flask server is running and the template ID is correct.

**"Region not found"** - CSV column headers must exactly match template region IDs (case-sensitive).

**Rendering timeout** - Increase `--delay` if labels have complex images or slow QR code generation.
