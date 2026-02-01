#!/bin/bash
# Generate PWA icons from SVG source
# Requires: ImageMagick (convert) or Inkscape

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ICONS_DIR="$PROJECT_DIR/public/icons"
SVG_SOURCE="$ICONS_DIR/icon.svg"

# Icon sizes needed for PWA
SIZES=(72 96 128 144 152 192 384 512)

echo "Generating PWA icons..."

# Check for available tools
if command -v convert &> /dev/null; then
    CONVERTER="imagemagick"
elif command -v inkscape &> /dev/null; then
    CONVERTER="inkscape"
else
    echo "Error: Neither ImageMagick nor Inkscape found."
    echo "Please install one of them:"
    echo "  sudo apt-get install imagemagick"
    echo "  OR"
    echo "  sudo apt-get install inkscape"
    exit 1
fi

echo "Using $CONVERTER for conversion..."

for SIZE in "${SIZES[@]}"; do
    OUTPUT="$ICONS_DIR/icon-${SIZE}.png"
    echo "Creating ${SIZE}x${SIZE} icon..."

    if [ "$CONVERTER" = "imagemagick" ]; then
        convert -background none -density 300 -resize "${SIZE}x${SIZE}" "$SVG_SOURCE" "$OUTPUT"
    else
        inkscape --export-type=png --export-filename="$OUTPUT" -w "$SIZE" -h "$SIZE" "$SVG_SOURCE"
    fi

    if [ -f "$OUTPUT" ]; then
        echo "  Created: $OUTPUT"
    else
        echo "  Failed to create: $OUTPUT"
    fi
done

echo ""
echo "Icon generation complete!"
echo "Icons are in: $ICONS_DIR"
