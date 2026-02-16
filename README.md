# QL-800 QR Label Maker

Browser-based label design tool and batch generator for Brother QL-800 label printers. Create labels with QR codes, text, and images using SVG templates.

## Features

- 🎨 **Web UI** - Interactive browser-based label editor
- 📦 **Batch Generation** - Create hundreds of labels from CSV files
- 🖨️ **Direct Printing** - Send labels to Brother QL-800 printer
- 🏷️ **Multiple Templates** - Support for 17x54mm and 29x90mm labels
- ⚡ **SVG-Based** - Flexible template system with custom regions

## Tools Provided

### 1. Web UI (`server/`)
Interactive label editor for designing and printing individual labels.

### 2. Batch Generator (`batch-generator/`)
Command-line tool to generate label PNGs in bulk from CSV data.

### 3. Batch Printer (`batch-generator/print-batch.sh`)
Bash script to send multiple labels to printer at once.

---

## Quick Start

### Web UI

**1. Install Python dependencies:**
```bash
cd server
pip install -r requirements.txt
```

**2. Start the server:**
```bash
python server.py
```

**3. Open in browser:**
```
http://localhost:5000
```

**4. Design your label:**
- Select a template from the dropdown
- Enter QR code URL and label text
- Click "Save Image" or "Print to QL-800"

---

### Batch Label Generation

**1. Install Node.js dependencies:**
```bash
cd batch-generator
npm install
```

**2. Ensure Flask server is running** (in another terminal):
```bash
cd ../server
python server.py
```

**3. Create a CSV file** with columns matching template regions:

You need at least "Name" and "Inventory URL". 
```csv
ID,Name,Quantity,Status,Assigned To,Location,Details URL,Agreement URL,Inventory URL,Owner,Notes
51,AnyCubic Photon S Resin printer,1,Unknown,,Room 3,,,https://euglink.org/bwvYX8,EMS,
69,Steel Locker 166,1,Ready to use,,Room 3/Versatile,,,https://euglink.org/Bwwk2S,EMS,
```

**4. Generate labels:**
```bash
npm run generate -- --csv your-data.csv --template ems-29x90-qrcode
```

**5. Print the batch:**
```bash
./print-batch.sh
```

Labels will be saved in `./batch-generator/output/`

## Printer Setup

The Brother QL-800 printer must be connected via USB. The tools use `brother_ql` CLI to communicate with the printer.

**Test printer connection:**
```bash
brother_ql --backend pyusb discover
```

**Manual print command:**
```bash
brother_ql --backend pyusb --model QL-800 \
  --printer 'usb://0x04f9:0x209b' \
  print -l 29x90 label.png
```

## Documentation

- **Batch Generator Details:** See `batch-generator/README.md`
- **Template Creation:** See SVG files in `server/static/label-templates/`

## Requirements

- **Python 3.12+** with Flask, qrcode, pyusb, brother_ql
- **Node.js 18+** with Puppeteer
- **Brother QL-800 printer** (for printing features)

## Project Structure

```
ql800-qrlabel-maker/
├── server/                    # Flask web server
│   ├── server.py              # Main Flask app
│   ├── templates/index.html   # Web UI
│   ├── static/                # JS modules, CSS, templates
│   └── requirements.txt       # Python dependencies
├── batch-generator/           # Batch generation tools
│   ├── generate.js            # Main batch tool
│   ├── print-batch.sh         # Batch printer script
│   ├── package.json           # Node.js dependencies
│   └── README.md              # Detailed documentation
└── README.md                  # This file
```
