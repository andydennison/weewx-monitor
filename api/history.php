<?php
/**
 * API endpoint for getting historical sensor data
 * Supports different time ranges for trend charts
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Get parameters
$sensorId = isset($_GET['sensor']) ? $_GET['sensor'] : 'all';
$range = isset($_GET['range']) ? $_GET['range'] : '24h';
$interval = isset($_GET['interval']) ? $_GET['interval'] : 'auto';

// Load configuration
$configPath = __DIR__ . '/../config/sensors.json';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuration file not found']);
    exit;
}

$config = json_decode(file_get_contents($configPath), true);

// Connect to database
$dbPath = $config['database_path'];
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database not found']);
    exit;
}

try {
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Calculate time range
$now = time();
switch ($range) {
    case '6h':
        $startTime = $now - (6 * 3600);
        $groupInterval = 300; // 5 minutes
        break;
    case '12h':
        $startTime = $now - (12 * 3600);
        $groupInterval = 600; // 10 minutes
        break;
    case '24h':
        $startTime = $now - (24 * 3600);
        $groupInterval = 900; // 15 minutes
        break;
    case '7d':
        $startTime = $now - (7 * 24 * 3600);
        $groupInterval = 3600; // 1 hour
        break;
    case '30d':
        $startTime = $now - (30 * 24 * 3600);
        $groupInterval = 14400; // 4 hours
        break;
    default:
        $startTime = $now - (24 * 3600);
        $groupInterval = 900;
}

// Build sensor list
$sensorsToQuery = [];
if ($sensorId === 'all') {
    $sensorsToQuery = $config['sensors'];
} else {
    foreach ($config['sensors'] as $sensor) {
        if ($sensor['id'] === $sensorId) {
            $sensorsToQuery[] = $sensor;
            break;
        }
    }
}

if (empty($sensorsToQuery)) {
    http_response_code(400);
    echo json_encode(['error' => 'Sensor not found']);
    exit;
}

$result = [
    'success' => true,
    'range' => $range,
    'start_time' => $startTime,
    'end_time' => $now,
    'sensors' => []
];

foreach ($sensorsToQuery as $sensor) {
    $tempField = $sensor['temp_field'];
    $humidField = $sensor['humidity_field'];

    // Query with aggregation for smoother charts
    $query = "
        SELECT
            (datetime / {$groupInterval}) * {$groupInterval} as time_bucket,
            datetime(((datetime / {$groupInterval}) * {$groupInterval}),'unixepoch','localtime') as datetime_local,
            round(AVG({$tempField}), 1) as avg_temp,
            round(MIN({$tempField}), 1) as min_temp,
            round(MAX({$tempField}), 1) as max_temp,
            round(AVG({$humidField}), 1) as avg_humidity
        FROM archive
        WHERE datetime >= {$startTime}
          AND {$tempField} IS NOT NULL
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
    ";

    $queryResult = $db->query($query);
    $dataPoints = [];

    while ($row = $queryResult->fetchArray(SQLITE3_ASSOC)) {
        $dataPoints[] = [
            'timestamp' => intval($row['time_bucket']),
            'datetime' => $row['datetime_local'],
            'temperature' => floatval($row['avg_temp']),
            'temp_min' => floatval($row['min_temp']),
            'temp_max' => floatval($row['max_temp']),
            'humidity' => $row['avg_humidity'] !== null ? floatval($row['avg_humidity']) : null
        ];
    }

    // Calculate statistics
    $temps = array_column($dataPoints, 'temperature');
    $stats = null;
    if (count($temps) > 0) {
        $stats = [
            'min' => min($temps),
            'max' => max($temps),
            'avg' => round(array_sum($temps) / count($temps), 1),
            'current' => end($temps)
        ];
    }

    $result['sensors'][] = [
        'id' => $sensor['id'],
        'name' => $sensor['name'],
        'location' => $sensor['location'],
        'data' => $dataPoints,
        'stats' => $stats,
        'thresholds' => $sensor['thresholds']
    ];
}

$db->close();

echo json_encode($result, JSON_PRETTY_PRINT);
