<?php
/**
 * API endpoint for managing sensor thresholds
 * GET: Retrieve current thresholds
 * POST: Update thresholds for a sensor
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$configPath = __DIR__ . '/../config/sensors.json';

if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}

$config = json_decode(file_get_contents($configPath), true);
if (!$config) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid configuration']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return all sensor thresholds
    $thresholds = [];
    foreach ($config['sensors'] as $sensor) {
        $thresholds[] = [
            'id' => $sensor['id'],
            'name' => $sensor['name'],
            'location' => $sensor['location'],
            'thresholds' => $sensor['thresholds']
        ];
    }
    echo json_encode([
        'success' => true,
        'sensors' => $thresholds,
        'notification_settings' => $config['notification_settings']
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Update thresholds
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    // Update sensor thresholds
    if (isset($input['sensor_id']) && isset($input['thresholds'])) {
        $sensorId = $input['sensor_id'];
        $newThresholds = $input['thresholds'];

        $found = false;
        foreach ($config['sensors'] as &$sensor) {
            if ($sensor['id'] === $sensorId) {
                // Validate thresholds
                if (isset($newThresholds['temp_min'])) {
                    $sensor['thresholds']['temp_min'] = floatval($newThresholds['temp_min']);
                }
                if (isset($newThresholds['temp_max'])) {
                    $sensor['thresholds']['temp_max'] = floatval($newThresholds['temp_max']);
                }
                if (isset($newThresholds['humidity_min'])) {
                    $sensor['thresholds']['humidity_min'] = floatval($newThresholds['humidity_min']);
                }
                if (isset($newThresholds['humidity_max'])) {
                    $sensor['thresholds']['humidity_max'] = floatval($newThresholds['humidity_max']);
                }
                $found = true;
                break;
            }
        }
        unset($sensor);

        if (!$found) {
            http_response_code(404);
            echo json_encode(['error' => 'Sensor not found']);
            exit;
        }
    }

    // Update notification settings
    if (isset($input['notification_settings'])) {
        $ns = $input['notification_settings'];
        if (isset($ns['check_interval_minutes'])) {
            $config['notification_settings']['check_interval_minutes'] = intval($ns['check_interval_minutes']);
        }
        if (isset($ns['cooldown_minutes'])) {
            $config['notification_settings']['cooldown_minutes'] = intval($ns['cooldown_minutes']);
        }
        if (isset($ns['enabled'])) {
            $config['notification_settings']['enabled'] = (bool)$ns['enabled'];
        }
    }

    // Save configuration
    $result = file_put_contents($configPath, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save configuration']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Thresholds updated successfully',
        'config' => $config
    ], JSON_PRETTY_PRINT);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
