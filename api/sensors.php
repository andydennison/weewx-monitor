<?php
/**
 * API endpoint for getting current sensor data
 * Returns the latest reading for all configured sensors
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Load configuration
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

// Connect to database
$dbPath = $config['database_path'];
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database not found', 'path' => $dbPath]);
    exit;
}

try {
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'message' => $e->getMessage()]);
    exit;
}

$sensors = [];
$alerts = [];

foreach ($config['sensors'] as $sensor) {
    $tempField = $sensor['temp_field'];
    $humidField = $sensor['humidity_field'];

    // Get the latest reading for this sensor
    $query = "
        SELECT
            datetime as timestamp,
            datetime(datetime,'unixepoch','localtime') as datetime_local,
            round({$tempField}, 1) as temperature,
            round({$humidField}, 1) as humidity
        FROM archive
        WHERE {$tempField} IS NOT NULL
        ORDER BY datetime DESC
        LIMIT 1
    ";

    $result = $db->query($query);
    $row = $result->fetchArray(SQLITE3_ASSOC);

    if ($row) {
        $sensorData = [
            'id' => $sensor['id'],
            'name' => $sensor['name'],
            'icon' => $sensor['icon'],
            'location' => $sensor['location'],
            'temperature' => floatval($row['temperature']),
            'humidity' => $row['humidity'] !== null ? floatval($row['humidity']) : null,
            'timestamp' => intval($row['timestamp']),
            'datetime' => $row['datetime_local'],
            'thresholds' => $sensor['thresholds']
        ];

        // Check for threshold violations
        $temp = $sensorData['temperature'];
        $thresholds = $sensor['thresholds'];

        if ($temp < $thresholds['temp_min']) {
            $alerts[] = [
                'sensor_id' => $sensor['id'],
                'sensor_name' => $sensor['name'],
                'type' => 'temp_low',
                'message' => "{$sensor['name']} is too cold: {$temp}°F (min: {$thresholds['temp_min']}°F)",
                'value' => $temp,
                'threshold' => $thresholds['temp_min']
            ];
            $sensorData['alert'] = 'cold';
        } elseif ($temp > $thresholds['temp_max']) {
            $alerts[] = [
                'sensor_id' => $sensor['id'],
                'sensor_name' => $sensor['name'],
                'type' => 'temp_high',
                'message' => "{$sensor['name']} is too hot: {$temp}°F (max: {$thresholds['temp_max']}°F)",
                'value' => $temp,
                'threshold' => $thresholds['temp_max']
            ];
            $sensorData['alert'] = 'hot';
        }

        $sensors[] = $sensorData;
    }
}

$db->close();

// Calculate temperature differential between floors
$upstairsTemps = [];
$downstairsTemps = [];

foreach ($sensors as $sensor) {
    if ($sensor['location'] === 'upstairs') {
        $upstairsTemps[] = $sensor['temperature'];
    } else {
        $downstairsTemps[] = $sensor['temperature'];
    }
}

$differential = null;
if (count($upstairsTemps) > 0 && count($downstairsTemps) > 0) {
    $avgUpstairs = array_sum($upstairsTemps) / count($upstairsTemps);
    $avgDownstairs = array_sum($downstairsTemps) / count($downstairsTemps);
    $differential = [
        'upstairs_avg' => round($avgUpstairs, 1),
        'downstairs_avg' => round($avgDownstairs, 1),
        'difference' => round($avgUpstairs - $avgDownstairs, 1)
    ];
}

echo json_encode([
    'success' => true,
    'home_name' => $config['home_name'],
    'sensors' => $sensors,
    'alerts' => $alerts,
    'differential' => $differential,
    'timestamp' => time()
], JSON_PRETTY_PRINT);
