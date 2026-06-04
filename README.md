# DataShield Chile - Privacy & Consent Management Backend

Este repositorio contiene el núcleo del motor (Backend) de **DataShield Chile**, una plataforma diseñada para la gestión inmutable de consentimientos, trazabilidad legal y auditoría de derechos ARCO (Acceso, Rectificación, Cancelación y Oposición), alineada con las normativas vigentes de privacidad de datos.

La arquitectura está construida sobre un entorno tipado estricto con **Node.js, TypeScript y Express**, utilizando **PostgreSQL** como motor relacional transaccional.

---

## 🚀 Características Principales

* **Tipado Estricto:** Implementado al 100% en TypeScript para mitigar errores en tiempo de diseño y compilación.
* **Transacciones Atómicas (ACID):** Lógica integrada mediante `BEGIN/COMMIT/ROLLBACK` para garantizar que solo exista una política legal activa a la vez de forma segura.
* **Gestión de Derechos ARCO:** Endpoints dedicados para registrar, listar y mutar estados de solicitudes legales.
* **Configuración de CORS:** Blindado explícitamente para interactuar de forma segura con el frontend en entornos de desarrollo local.

---

## 🛠️ Stack Tecnológico

* **Runtime:** Node.js
* **Lenguaje:** TypeScript
* **Framework Web:** Express
* **Base de Datos:** PostgreSQL (`pg` driver)
* **Herramientas de Desarrollo:** `ts-node-dev`, `dotenv`

---

## 📋 Requisitos Previos

Asegúrate de contar con lo siguiente instalado en tu entorno local:

* Node.js (v18 o superior recomendado)
* PostgreSQL (v12 o superior)
* Un gestor de paquetes (NPM viene por defecto con Node)

---

## ⚙️ Configuración del Entorno

1. Clona este repositorio en tu máquina local.
2. En la raíz del directorio del backend, crea un archivo `.env` tomando como base la siguiente estructura:

```env
PORT=3000
DB_USER=tu_usuario_postgres
DB_HOST=localhost
DB_PASSWORD=tu_contraseña_segura
DB_DATABASE=datashield_db
DB_PORT=5432