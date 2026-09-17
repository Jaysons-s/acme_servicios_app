<?php
// config.php - Configuración de conexión a la base de datos

$host = "localhost";
$db_name = "acme_servicios";
$username = "root";      // Cambia esto por tu usuario de MySQL
$password = "";          // Cambia esto por tu password de MySQL
$charset = "utf8mb4";

try {
    $dsn = "mysql:host={$host};dbname={$db_name};charset={$charset}";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error de conexión a la base de datos: " . $e->getMessage()
    ]);
    exit;
}
