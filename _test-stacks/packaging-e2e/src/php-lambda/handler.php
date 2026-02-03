<?php

require_once __DIR__ . '/vendor/autoload.php';

use Monolog\Logger;

function handler($event, $context)
{
    // Use Monolog to verify dependency was packaged
    $logger = new Logger('test');
    return [
        "statusCode" => 200,
        "body" => "php ok - monolog v" . Logger::API
    ];
}
