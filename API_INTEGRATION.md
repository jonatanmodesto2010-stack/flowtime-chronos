# API de Integração Externa

Documentação completa da API REST para integração com o sistema de cobrança.

## Autenticação

Todas as requisições devem incluir um token JWT válido no header `Authorization`:

```
Authorization: Bearer <seu_token_jwt>
```

Para obter o token JWT, faça login através da interface web ou use o endpoint de autenticação do Supabase.

## Base URL

```
https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api
```

## Rate Limiting

- Limite: 1000 requisições por hora por organização
- Headers de resposta incluem: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Endpoints

### 📋 Clientes

#### Listar todos os clientes

```http
GET /clients
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "client_id": "00001",
      "client_name": "João Silva",
      "start_date": "2024-01-15",
      "is_active": true,
      "organization_id": "uuid",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1
}
```

#### Obter cliente específico

```http
GET /clients/:id
```

**Resposta:**
```json
{
  "id": "uuid",
  "client_id": "00001",
  "client_name": "João Silva",
  "start_date": "2024-01-15",
  "is_active": true,
  "tags": [
    { "name": "COBRANÇA", "color": "#ef4444" }
  ],
  "boletos_count": 3,
  "events_count": 12
}
```

#### Criar novo cliente

```http
POST /clients
Content-Type: application/json

{
  "client_name": "Maria Santos",
  "client_id": "00002",
  "start_date": "2024-02-01",
  "is_active": true
}
```

**Resposta:** Status 201
```json
{
  "data": { /* cliente criado */ },
  "message": "Client created successfully"
}
```

#### Atualizar cliente

```http
PUT /clients/:id
Content-Type: application/json

{
  "client_name": "Maria Santos Updated",
  "is_active": false
}
```

#### Deletar cliente

```http
DELETE /clients/:id
```

**Resposta:** Status 200
```json
{
  "message": "Client deleted successfully"
}
```

---

### 📅 Timeline

#### Obter timeline completa do cliente

```http
GET /clients/:id/timeline
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "line-uuid",
      "timeline_id": "client-uuid",
      "position": 0,
      "events": [
        {
          "id": "event-uuid",
          "line_id": "line-uuid",
          "event_date": "15/02/2024",
          "event_time": "14:30",
          "description": "Cliente respondeu ao contato",
          "position": "top",
          "status": "resolved",
          "icon": "📞",
          "icon_size": "text-2xl",
          "event_order": 0
        }
      ]
    }
  ]
}
```

#### Listar todos os eventos do cliente

```http
GET /clients/:id/timeline/events
```

#### Criar novo evento

```http
POST /clients/:id/timeline/events
Content-Type: application/json

{
  "event_date": "15/02/2024",
  "event_time": "14:30",
  "description": "Primeiro contato com cliente",
  "position": "top",
  "status": "created",
  "icon": "💬",
  "line_position": 0,
  "event_order": 0
}
```

**Status possíveis:**
- `created` - Criado
- `resolved` - Resolvido
- `no_response` - Sem resposta

**Posições:**
- `top` - Superior
- `bottom` - Inferior

---

### 💰 Boletos

#### Listar boletos do cliente

```http
GET /clients/:id/boletos
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "timeline_id": "client-uuid",
      "boleto_value": "1500.00",
      "due_date": "2024-03-15",
      "status": "pendente",
      "description": "Mensalidade de Março",
      "created_at": "2024-02-15T10:00:00Z"
    }
  ]
}
```

#### Criar boleto

```http
POST /clients/:id/boletos
Content-Type: application/json

{
  "boleto_value": 1500.00,
  "due_date": "2024-03-15",
  "status": "pendente",
  "description": "Mensalidade de Março"
}
```

**Status de boleto:**
- `pendente` - Pendente
- `pago` - Pago
- `atrasado` - Atrasado
- `cancelado` - Cancelado

---

### 🏷️ Tags

#### Listar tags da organização

```http
GET /tags
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "name": "COBRANÇA",
      "color": "#ef4444"
    }
  ]
}
```

#### Criar tag

```http
POST /tags
Content-Type: application/json

{
  "name": "PRIORITÁRIO",
  "color": "#f59e0b"
}
```

---

### 📊 Análise de Risco

#### Obter histórico de análises

```http
GET /clients/:id/analysis
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "timeline_id": "client-uuid",
      "risk_level": "médio",
      "risk_score": 65,
      "analysis_data": { /* dados da análise */ },
      "created_at": "2024-02-15T10:00:00Z"
    }
  ]
}
```

**Níveis de risco:**
- `baixo` - Baixo
- `médio` - Médio
- `alto` - Alto
- `crítico` - Crítico

---

## Exemplos de Código

### cURL

```bash
# Listar clientes
curl -X GET \
  'https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api/clients' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT'

# Criar cliente
curl -X POST \
  'https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api/clients' \
  -H 'Authorization: Bearer SEU_TOKEN_JWT' \
  -H 'Content-Type: application/json' \
  -d '{
    "client_name": "João Silva",
    "is_active": true
  }'
```

### JavaScript/Node.js

```javascript
const API_URL = 'https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api';
const TOKEN = 'SEU_TOKEN_JWT';

// Listar clientes
async function listClients() {
  const response = await fetch(`${API_URL}/clients`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`
    }
  });
  
  const data = await response.json();
  console.log(data);
}

// Criar cliente
async function createClient(clientData) {
  const response = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(clientData)
  });
  
  return await response.json();
}

// Criar evento
async function createEvent(clientId, eventData) {
  const response = await fetch(`${API_URL}/clients/${clientId}/timeline/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  return await response.json();
}
```

### Python

```python
import requests

API_URL = 'https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api'
TOKEN = 'SEU_TOKEN_JWT'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Listar clientes
def list_clients():
    response = requests.get(f'{API_URL}/clients', headers=headers)
    return response.json()

# Criar cliente
def create_client(client_data):
    response = requests.post(
        f'{API_URL}/clients',
        headers=headers,
        json=client_data
    )
    return response.json()

# Criar evento
def create_event(client_id, event_data):
    response = requests.post(
        f'{API_URL}/clients/{client_id}/timeline/events',
        headers=headers,
        json=event_data
    )
    return response.json()

# Exemplo de uso
clients = list_clients()
print(clients)
```

### PHP

```php
<?php

$apiUrl = 'https://ghheubvkddwggoodbytf.supabase.co/functions/v1/external-api';
$token = 'SEU_TOKEN_JWT';

// Listar clientes
function listClients($apiUrl, $token) {
    $ch = curl_init("$apiUrl/clients");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token"
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Criar cliente
function createClient($apiUrl, $token, $clientData) {
    $ch = curl_init("$apiUrl/clients");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($clientData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token",
        "Content-Type: application/json"
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Exemplo de uso
$clients = listClients($apiUrl, $token);
print_r($clients);
?>
```

---

## Códigos de Status HTTP

- `200 OK` - Sucesso
- `201 Created` - Recurso criado com sucesso
- `400 Bad Request` - Requisição inválida
- `401 Unauthorized` - Token inválido ou ausente
- `403 Forbidden` - Sem permissão
- `404 Not Found` - Recurso não encontrado
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Erro no servidor

---

## Suporte

Para dúvidas ou problemas com a API, entre em contato através do sistema de configurações.

## Changelog

### v1.0.0 (2025-01-15)
- Lançamento inicial da API
- Endpoints para clientes, timeline, boletos, tags e análises
