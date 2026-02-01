<?php
/**
 * Bootstrap script to generate all PWA icon sizes
 * Run this once after deploying: php scripts/bootstrap-icons.php
 */

$sizes = [72, 96, 128, 144, 152, 192, 384, 512];
$iconsDir = __DIR__ . '/../public/icons';

// Check if GD library is available
if (!function_exists('imagecreatetruecolor')) {
    echo "Error: GD library not available.\n";
    echo "Install with: sudo apt-get install php-gd\n";
    exit(1);
}

echo "Generating PWA icons...\n";

foreach ($sizes as $size) {
    $filename = "$iconsDir/icon-{$size}.png";

    // Create image
    $img = imagecreatetruecolor($size, $size);
    imagesavealpha($img, true);

    // Colors
    $bgColor = imagecolorallocate($img, 74, 144, 217); // #4a90d9
    $darkBg = imagecolorallocate($img, 26, 26, 46); // #1a1a2e
    $thermColor = imagecolorallocate($img, 74, 222, 128); // #4ade80
    $white = imagecolorallocate($img, 255, 255, 255);
    $gray = imagecolorallocate($img, 160, 160, 184);

    // Fill background
    imagefilledrectangle($img, 0, 0, $size, $size, $bgColor);

    // Draw thermometer
    $centerX = $size / 2;
    $centerY = $size / 2;
    $thermWidth = $size * 0.2;
    $thermHeight = $size * 0.55;

    // Thermometer outer tube
    $tubeLeft = $centerX - $thermWidth / 2;
    $tubeRight = $centerX + $thermWidth / 2;
    $tubeTop = $centerY - $thermHeight / 2;
    $tubeBottom = $centerY + $thermHeight / 3;

    // Draw rounded tube
    imagefilledrectangle($img, $tubeLeft, $tubeTop + $thermWidth / 2, $tubeRight, $tubeBottom, $darkBg);
    imagefilledellipse($img, $centerX, $tubeTop + $thermWidth / 2, $thermWidth, $thermWidth, $darkBg);

    // Thermometer bulb
    $bulbRadius = $thermWidth * 1.1;
    imagefilledellipse($img, $centerX, $tubeBottom + $bulbRadius / 2, $bulbRadius * 2, $bulbRadius * 2, $darkBg);

    // Mercury fill
    $mercuryTop = $centerY - $thermHeight / 4;
    $innerWidth = $thermWidth * 0.6;
    imagefilledrectangle($img, $centerX - $innerWidth / 2, $mercuryTop, $centerX + $innerWidth / 2, $tubeBottom, $thermColor);
    imagefilledellipse($img, $centerX, $tubeBottom + $bulbRadius / 2, ($bulbRadius - 4) * 2, ($bulbRadius - 4) * 2, $thermColor);

    // Temperature markings
    $markX = $tubeRight + 2;
    for ($i = 0; $i < 5; $i++) {
        $y = $tubeTop + $thermWidth / 2 + ($tubeBottom - $tubeTop - $thermWidth / 2) * $i / 4;
        $markLength = ($i % 2 == 0) ? $size * 0.06 : $size * 0.04;
        imageline($img, $markX, $y, $markX + $markLength, $y, $gray);
    }

    // Save icon
    imagepng($img, $filename);
    imagedestroy($img);

    echo "Created: icon-{$size}.png\n";
}

echo "\nIcon generation complete!\n";
echo "Icons saved to: $iconsDir\n";
