<?php
// Permitir peticiones desde tu app de Ionic
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Responder de inmediato a la verificación preflight OPTIONS del navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Activar reporte de errores internos para atraparlos en JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    // Revisa cómo se llama tu archivo de conexión real en esa carpeta (ej. config.php o conexion.php)
    require_once __DIR__ . '/config.php';

    // Si tu variable de conexión PDO se llama distinto (ej. $conexion o $conn), cámbiala aquí
    $db = isset($pdo) ? $pdo : (isset($conexion) ? $conexion : (isset($conn) ? $conn : null));

    if (!$db) {
        throw new Exception("No se encontró la variable de conexión a la base de datos.");
    }

    $sql = "SELECT DATE(created_at) AS fecha, COUNT(*) AS total 
            FROM contactos 
            GROUP BY DATE(created_at) 
            ORDER BY fecha ASC";

    $stmt = $db->prepare($sql);
    $stmt->execute();
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $datos
    ]);
} catch (Throwable $e) {
    // Enviar el error real dentro del JSON para saber si falla MySQL o PHP
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
exit();