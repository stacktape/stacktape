<?php

$port = getenv('PORT') ?: '3000';

echo "PHP container started on port $port\n";

$server = stream_socket_server("tcp://0.0.0.0:$port", $errno, $errstr);

while ($conn = stream_socket_accept($server, -1)) {
    $request = fread($conn, 8192);

    if (strpos($request, '/error') !== false) {
        throw new \RuntimeException("PHP container RuntimeException with stack trace");
    }

    $body = "OK";
    $response = "HTTP/1.1 200 OK\r\nContent-Length: " . strlen($body) . "\r\n\r\n$body";
    fwrite($conn, $response);
    fclose($conn);
}
