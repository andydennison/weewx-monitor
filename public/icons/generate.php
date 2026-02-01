<?php
/**
 * Dynamic PNG icon generator
 * This creates placeholder icons if the real ones don't exist
 *
 * Usage: Access /icons/generate.php?size=192 to generate a 192x192 icon
 */

$size = isset($_GET['size']) ? intval($_GET['size']) : 192;

// Validate size
$validSizes = [72, 96, 128, 144, 152, 192, 384, 512];
if (!in_array($size, $validSizes)) {
    $size = 192;
}

// Check if GD library is available
if (!function_exists('imagecreatetruecolor')) {
    header('Content-Type: text/plain');
    echo "GD library not available. Install with: sudo apt-get install php-gd";
    exit;
}

// Create image
$img = imagecreatetruecolor($size, $size);
imagesavealpha($img, true);

// Colors
$bgColor = imagecolorallocate($img, 74, 144, 217); // #4a90d9
$thermColor = imagecolorallocate($img, 74, 222, 128); // #4ade80
$white = imagecolorallocate($img, 255, 255, 255);

// Fill background with rounded appearance
imagefilledrectangle($img, 0, 0, $size, $size, $bgColor);

// Draw thermometer (simplified)
$centerX = $size / 2;
$centerY = $size / 2;
$thermWidth = $size * 0.15;
$thermHeight = $size * 0.5;

// Thermometer tube
$tubeLeft = $centerX - $thermWidth / 2;
$tubeRight = $centerX + $thermWidth / 2;
$tubeTop = $centerY - $thermHeight / 2;
$tubeBottom = $centerY + $thermHeight / 3;

imagefilledrectangle($img, $tubeLeft, $tubeTop, $tubeRight, $tubeBottom, $white);

// Thermometer bulb
$bulbRadius = $thermWidth * 0.8;
imagefilledellipse($img, $centerX, $tubeBottom + $bulbRadius / 2, $bulbRadius * 2, $bulbRadius * 2, $white);

// Mercury fill
$mercuryTop = $centerY - $thermHeight / 4;
imagefilledrectangle($img, $tubeLeft + 3, $mercuryTop, $tubeRight - 3, $tubeBottom, $thermColor);
imagefilledellipse($img, $centerX, $tubeBottom + $bulbRadius / 2, ($bulbRadius - 3) * 2, ($bulbRadius - 3) * 2, $thermColor);

// Output
header('Content-Type: image/png');
header('Cache-Control: public, max-age=31536000');

// Save to file if it doesn't exist
$filename = __DIR__ . "/icon-{$size}.png";
if (!file_exists($filename)) {
    imagepng($img, $filename);
}

imagepng($img);
imagedestroy($img);
