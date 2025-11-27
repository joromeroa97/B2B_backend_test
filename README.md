# 🧾 B2B Caso Tecnico

By: Jandry Romero

Este repositorio implementa una solución backend basada en microservicios, totalmente dockerizada, para la gestión de clientes, productos y órdenes, incluyendo:

APIs independientes (customers-api, orders-api)

Base de datos MySQL inicializada automáticamente

Comunicación interna segura entre servicios vía SERVICE_TOKEN

Autenticación JWT

Manejo de stock y transacciones

Idempotencia para confirmación de órdenes

Opción de orquestación con un Lambda local (serverless-offline)

# 📚 Índice

1. Arquitectura

2. Tecnologías usadas

3. Requisitos previos

4. Estructura del proyecto

5. Cómo levantar todo con Docker

6. Migraciones

7. Variables de entorno

8. APIs

9. Probar el flujo completo

10. Idempotencia

11. Orchestrator Lambda (opcional)

12. Conclusiones

13. Invocar lambda desde AWS.

# 🏛️ Arquitectura

La arquitectura incluye:

MySQL (Docker) → Base de datos principal

customers-api (Docker) → Manejo de clientes + login + endpoint interno /internal/customers/:id

orders-api (Docker) → Manejo de productos, creación de órdenes, confirmación idempotente

Comunicación interna:

orders → customers (validación de clientes)

ambos → MySQL (tabla compartida)

Opcional: Lambda Orchestrator (serverless offline) para procesar flujo completo

# 🧰 Tecnologías usadas

- Componente	Tecnología
- Lenguaje	Node.js 20
- Base de datos	MySQL 8
- Contenedores	Docker + docker-compose
- API	Express.js
- Seguridad	JWT + SERVICE_TOKEN
- Migraciones	Scripts JS
- Orquestación	AWS Lambda (emulado con serverless-offline)

# 📦 Estructura del proyecto

- prueba-backend-b2b/
  - customers-api/
    - src/
    - Dockerfile
    - .env.example
  - orders-api/
    - src/
    - Dockerfile
    - .env.example
  - db/
    - schema.sql
  - docker-compose.yml
  - lambda-orchestrator/ (opcional)


# 🐳 Cómo levantar todo con Docker

Desde la raíz del proyecto:
```
docker compose up -d --build
```

Esto levanta:

MySQL → puerto 3307

customers-api → puerto 3001

orders-api → puerto 3002

Verifica:
```
docker compose ps
```

# 🔧 Migraciones

Luego de levantar los contenedores, ejecuta:
```
docker compose exec customers-api npm run migrate

docker compose exec orders-api npm run migrate
```

Para verificar tablas:
```
docker compose exec mysql 
mysql -u b2b_user -p b2b_pass -e 
USE b2b_db; 
SHOW TABLES;
```
Para alimentar la base con los seeds:
```
mysql -u b2b_user -p b2b_db < customers-api/seed.sql
```
La clave es b2b_pass
```
mysql -u b2b_user -p b2b_db < orders-api/seed.sql
```
La clave es b2b_pass

# 🔐 Variables de entorno

## customers-api (.env)
- PORT=3001
- DB_HOST=mysql
- DB_PORT=3306
- DB_USER=b2b_user
- DB_PASSWORD=b2b_pass
- DB_NAME=b2b_db

- JWT_SECRET=super-secret-key
- SERVICE_TOKEN=internal-service-token
- ADMIN_USER=admin
- ADMIN_PASSWORD=admin123

## orders-api (.env)
- PORT=3002
- DB_HOST=mysql
- DB_PORT=3306
- DB_USER=b2b_user
- DB_PASSWORD=b2b_pass
- DB_NAME=b2b_db

- JWT_SECRET=super-secret-key
- SERVICE_TOKEN=internal-service-token
- CUSTOMERS_API_BASE=http://customers-api:3001

# 🚀 APIs

## Customers-api

### Método	Ruta	Descripción

POST	/auth/login	Login (JWT)

GET	/customers	Lista clientes

POST	/customers	Crear cliente

GET	/customers/:id	Obtener cliente

PUT	/customers/:id	Actualizar cliente

DELETE	/customers/:id	Eliminar cliente

GET	/internal/customers/:id	Endpoint interno protegido

## Orders-api

### Método	Ruta	Descripción

POST	/products	Crear producto

GET	/products	Listar productos

POST	/orders	Crear orden (valida stock, transacción)

POST	/orders/:id/confirm	Confirmar orden (idempotente)

🧪 Probar el flujo completo

1️⃣ Obtener JWT
```
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```
2️⃣ Crear customer
```
curl --request POST \
  --url http://localhost:3001/customers \
  --header 'Authorization: Bearer <TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
  "name": "ACME Corp",
  "email": "acme@example.com",
  "phone": "0999999999"
}'
```
3️⃣ Crear producto
```
curl -X POST http://localhost:3002/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU1","name":"Product","price_cents":1500,"stock":10}'
```
4️⃣ Crear orden
```
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      { "product_id": 1, "qty": 2 }
    ]
  }'
```
5️⃣ Confirmar orden (idempotente)
```
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: test-123" \
  -H "Content-Type: application/json"
```

Repetir confirmación con el mismo idempotency key devuelve la misma respuesta sin duplicar operaciones.

# 🔁 Idempotencia

Implementada en:

- Tabla idempotency_keys.

- Control de concurrencia.

- Prevención de doble actualización de stock.

- Respuesta cacheada usando la misma llave.

Garantiza que si una confirmación falla a mitad, el cliente puede:

- Retry safely sin efectos colaterales.

# ☁️ Orchestrator Lambda (opcional)

El proyecto incluye un orquestador que:

Valida cliente (via customers-api)

Crea orden (via orders-api)

Confirma orden (idempotente)

Devuelve payload consolidado

Se ejecuta con:

```
cd lambda-orchestrator
npx serverless offline
```


Luego puede exponerse públicamente con ngrok:

```
ngrok http 3003
```

# 🎉 Conclusión

Con esta versión:

- Todo el backend corre en Docker.

- Las APIs se comunican entre sí por red interna.

- MySQL se inicializa automáticamente.

- El sistema es portable, reproducible y listo para deploy.

- Orchestrator disponible para flujos avanzados.

# ☁️🟧 Invocar Lambda Orchestrator desde AWS

La forma mas sencilla y recomendable para este caso de uso tecnico, seria realizarlo desde un API Gateway en AWS. Es decir, el API Gateway recibe el request y lo transforma en un evento JSON para luego proceder a consumir la ruta designada para crear y confirmar la orden.

Un cURL de ejemplo del consumo seria algo asi:
```
curl -X POST \
  https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_JWT" \
  -d '{
    "customer_id":1,
    "items":[{"product_id":1,"qty":2}],
    "idempotency_key":"abc-123"
  }'
```
