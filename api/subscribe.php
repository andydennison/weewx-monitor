<?php
/**
 * API endpoint for managing push notification subscriptions
 * POST: Subscribe/unsubscribe from push notifications
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$subscriptionsPath = __DIR__ . '/../config/subscriptions.json';

// Ensure subscriptions file exists
if (!file_exists($subscriptionsPath)) {
    file_put_contents($subscriptionsPath, json_encode(['subscriptions' => []]));
}

$data = json_decode(file_get_contents($subscriptionsPath), true);
if (!$data) {
    $data = ['subscriptions' => []];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return subscription count (not the actual subscriptions for security)
    echo json_encode([
        'success' => true,
        'count' => count($data['subscriptions'])
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['subscription'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid subscription data']);
        exit;
    }

    $subscription = $input['subscription'];
    $endpoint = $subscription['endpoint'] ?? '';

    if (empty($endpoint)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid subscription endpoint']);
        exit;
    }

    // Check if subscription already exists
    $exists = false;
    foreach ($data['subscriptions'] as $sub) {
        if ($sub['endpoint'] === $endpoint) {
            $exists = true;
            break;
        }
    }

    if (!$exists) {
        $data['subscriptions'][] = [
            'endpoint' => $endpoint,
            'keys' => $subscription['keys'] ?? [],
            'subscribed_at' => time(),
            'last_notified' => null
        ];

        file_put_contents($subscriptionsPath, json_encode($data, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        'success' => true,
        'message' => 'Subscription saved'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['endpoint'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request']);
        exit;
    }

    $endpoint = $input['endpoint'];
    $data['subscriptions'] = array_filter($data['subscriptions'], function ($sub) use ($endpoint) {
        return $sub['endpoint'] !== $endpoint;
    });
    $data['subscriptions'] = array_values($data['subscriptions']);

    file_put_contents($subscriptionsPath, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'message' => 'Unsubscribed successfully'
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
