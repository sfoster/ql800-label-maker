#!/bin/bash
##
# Batch Print Labels
#
# Sends all PNG files in a directory to the Brother QL-800 printer.
#
# Usage:
#   ./print-batch.sh [directory] [label-size]
#
# Examples:
#   ./print-batch.sh                    # Print from ./output, default 29x90
#   ./print-batch.sh ./output 17x54     # Print 17x54 labels
#   ./print-batch.sh ./labels 29x90     # Print from custom directory
#

set -e  # Exit on error

# Configuration
PRINTER_MODEL="QL-800"
PRINTER_USB="usb://0x04f9:0x209b"
BACKEND="pyusb"

# Parse arguments
IMAGE_DIR="${1:-./output}"
LABEL_SIZE="${2:-29x90}"

# Validate directory exists
if [ ! -d "$IMAGE_DIR" ]; then
  echo "❌ Error: Directory '$IMAGE_DIR' does not exist"
  exit 1
fi

# Find all PNG files
mapfile -t images < <(find "$IMAGE_DIR" -maxdepth 1 -name "*.png" -type f | sort)

if [ ${#images[@]} -eq 0 ]; then
  echo "❌ No PNG files found in $IMAGE_DIR"
  exit 1
fi

echo "🖨️  Batch Print to Brother QL-800"
echo ""
echo "   Directory: $IMAGE_DIR"
echo "   Label size: $LABEL_SIZE"
echo "   Printer: $PRINTER_USB"
echo "   Images: ${#images[@]}"
echo ""

# Confirm before printing
read -p "Print ${#images[@]} labels? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🚀 Printing..."
echo ""

# Track results
success=0
failed=0

# Disable exit-on-error for the printing loop
set +e

# Print each image
for image in "${images[@]}"; do
  filename=$(basename "$image")
  echo -n "  📄 $filename ... "

  if brother_ql \
    --backend "$BACKEND" \
    --model "$PRINTER_MODEL" \
    --printer "$PRINTER_USB" \
    print -l "$LABEL_SIZE" "$image" 2>&1 | grep -q "Printing was successful"; then
    echo "✅"
    success=$((success + 1))
  else
    echo "❌ Failed"
    failed=$((failed + 1))
  fi

  # Small delay between prints to avoid overwhelming the printer
  sleep 0.5
done

# Re-enable exit-on-error
set -e

echo ""
echo "✨ Complete!"
echo "   Successful: $success/${#images[@]}"
if [ $failed -gt 0 ]; then
  echo "   Failed: $failed"
fi
echo ""
