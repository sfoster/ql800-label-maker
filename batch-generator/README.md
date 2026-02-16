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

The CSV file column headers get mapped to template region IDs. 

The mapping is by column name not index and extra columns are fine. For the `ems-29x90-qrcode` template it expects something like:

```csv
ID,Name,Quantity,Status,Assigned To,Location,Details URL,Agreement URL,Inventory URL,Owner,Notes
51,AnyCubic Photon S Resin printer,1,Unknown,,Room 3,,,https://euglink.org/bwvYX8,EMS,
69,Steel Locker 166,1,Ready to use,,Room 3/Versatile,,,https://euglink.org/Bwwk2S,EMS,
83,Steel Locker 180,1,Ready to use,,Room 3/Versatile,,,https://euglink.org/LTPAud,EMS,
```

This output is from our inventory spreadsheet. Probably it should be generalized and we add a simple mapping script to get the source data into a shape that matches what the templates need. 

## Output

Files are named based on the `label-text` field (sanitized) or fall back to `label_0001.png`, `label_0002.png`, etc.

## Prerequisites

- Flask server must be running on `http://localhost:5000`
- Template must be available in the web UI

## Testing

```bash
# Test basic connectivity
npm test

# Generate from example CSV
npm run example
```

## Printing

After generating labels, use the included print script:

```bash
# Print all labels from output directory
./print-batch.sh

# Print from custom directory
./print-batch.sh ./my-labels

# Print with different label size
./print-batch.sh ./output 17x54
```

The script will ask for confirmation before printing and show progress for each label.
