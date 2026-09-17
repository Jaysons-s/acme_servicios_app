<?php
// index.php - API REST CRUD para "contactos"
// Métodos soportados: GET, POST, PUT, PATCH, DELETE, OPTIONS

// ---------- CORS ----------
header("Access-Control-Allow-Origin: *"); // En producción, cambia * por tu dominio del front
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// El navegador manda un OPTIONS antes de peticiones "no simples" (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// ---------- Helpers ----------
function responder($success, $message, $data = null, $codigoHttp = 200) {
    http_response_code($codigoHttp);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data"    => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function obtenerBody() {
    $input = json_decode(file_get_contents("php://input"), true);
    return is_array($input) ? $input : [];
}

function validarContacto($body, $esParcial = false) {
    $errores = [];
    $campos = ['nombre', 'email', 'telefono', 'mensaje'];

    foreach ($campos as $campo) {
        if (!$esParcial && empty($body[$campo])) {
            $errores[] = "El campo '{$campo}' es obligatorio.";
        }
    }

    if (!empty($body['email']) && !filter_var($body['email'], FILTER_VALIDATE_EMAIL)) {
        $errores[] = "El correo electrónico no es válido.";
    }

    return $errores;
}

// ---------- Router ----------
$metodo = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? intval($_GET['id']) : null;

try {
    switch ($metodo) {

        // ---------------- GET: listar todos o uno solo ----------------
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM contactos WHERE id = :id");
                $stmt->execute(['id' => $id]);
                $contacto = $stmt->fetch();

                if (!$contacto) {
                    responder(false, "Contacto no encontrado.", null, 404);
                }
                responder(true, "Contacto encontrado.", $contacto, 200);
            } else {
                $stmt = $pdo->query("SELECT * FROM contactos ORDER BY id DESC");
                $contactos = $stmt->fetchAll();
                responder(true, "Listado de contactos.", $contactos, 200);
            }
            break;

        // ---------------- POST: crear ----------------
        case 'POST':
            $body = obtenerBody();
            $errores = validarContacto($body);

            if (!empty($errores)) {
                responder(false, implode(' ', $errores), null, 422);
            }

            $sql = "INSERT INTO contactos (nombre, empresa, email, telefono, mensaje)
                    VALUES (:nombre, :empresa, :email, :telefono, :mensaje)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'nombre'   => $body['nombre'],
                'empresa'  => $body['empresa'] ?? null,
                'email'    => $body['email'],
                'telefono' => $body['telefono'],
                'mensaje'  => $body['mensaje'],
            ]);

            $nuevoId = $pdo->lastInsertId();
            $stmt = $pdo->prepare("SELECT * FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $nuevoId]);

            responder(true, "Contacto creado correctamente.", $stmt->fetch(), 201);
            break;

        // ---------------- PUT: actualizar completo ----------------
        case 'PUT':
            if (!$id) {
                responder(false, "Debes indicar el id del contacto (?id=).", null, 400);
            }

            $body = obtenerBody();
            $errores = validarContacto($body);

            if (!empty($errores)) {
                responder(false, implode(' ', $errores), null, 422);
            }

            $stmt = $pdo->prepare("SELECT id FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if (!$stmt->fetch()) {
                responder(false, "Contacto no encontrado.", null, 404);
            }

            $sql = "UPDATE contactos
                    SET nombre = :nombre, empresa = :empresa, email = :email,
                        telefono = :telefono, mensaje = :mensaje
                    WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'nombre'   => $body['nombre'],
                'empresa'  => $body['empresa'] ?? null,
                'email'    => $body['email'],
                'telefono' => $body['telefono'],
                'mensaje'  => $body['mensaje'],
                'id'       => $id
            ]);

            $stmt = $pdo->prepare("SELECT * FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);

            responder(true, "Contacto actualizado correctamente.", $stmt->fetch(), 200);
            break;

        // ---------------- PATCH: actualizar parcial ----------------
        case 'PATCH':
            if (!$id) {
                responder(false, "Debes indicar el id del contacto (?id=).", null, 400);
            }

            $body = obtenerBody();
            $errores = validarContacto($body, true); // parcial

            if (!empty($errores)) {
                responder(false, implode(' ', $errores), null, 422);
            }

            $stmt = $pdo->prepare("SELECT * FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $actual = $stmt->fetch();

            if (!$actual) {
                responder(false, "Contacto no encontrado.", null, 404);
            }

            $camposActualizables = ['nombre', 'empresa', 'email', 'telefono', 'mensaje'];
            $sets = [];
            $params = ['id' => $id];

            foreach ($camposActualizables as $campo) {
                if (array_key_exists($campo, $body)) {
                    $sets[] = "{$campo} = :{$campo}";
                    $params[$campo] = $body[$campo];
                }
            }

            if (empty($sets)) {
                responder(false, "No se enviaron campos para actualizar.", null, 400);
            }

            $sql = "UPDATE contactos SET " . implode(', ', $sets) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $stmt = $pdo->prepare("SELECT * FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);

            responder(true, "Contacto actualizado parcialmente.", $stmt->fetch(), 200);
            break;

        // ---------------- DELETE: eliminar ----------------
        case 'DELETE':
            if (!$id) {
                responder(false, "Debes indicar el id del contacto (?id=).", null, 400);
            }

            $stmt = $pdo->prepare("SELECT id FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if (!$stmt->fetch()) {
                responder(false, "Contacto no encontrado.", null, 404);
            }

            $stmt = $pdo->prepare("DELETE FROM contactos WHERE id = :id");
            $stmt->execute(['id' => $id]);

            responder(true, "Contacto eliminado correctamente.", null, 200);
            break;

        // ---------------- Método no soportado ----------------
        default:
            responder(false, "Método HTTP no soportado.", null, 405);
            break;
    }
} catch (PDOException $e) {
    responder(false, "Error en la base de datos: " . $e->getMessage(), null, 500);
} catch (Exception $e) {
    responder(false, "Error inesperado: " . $e->getMessage(), null, 500);
}
