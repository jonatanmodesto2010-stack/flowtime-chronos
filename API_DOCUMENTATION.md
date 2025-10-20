# API de Timelines - Documentação

API REST completa para gerenciar timelines e eventos.

## Base URL

```
https://[seu-projeto].supabase.co/functions/v1
```

## Autenticação

Todas as requisições requerem autenticação via Bearer Token no header:

```
Authorization: Bearer [seu_token_jwt]
```

---

## Endpoints de Timelines

### 1. Listar Timelines

**GET** `/timelines-api`

Lista todas as timelines do usuário autenticado.

**Resposta (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Cobrança Padrão",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Obter Timeline

**GET** `/timelines-api/[id]`

Obtém uma timeline específica.

**Resposta (200):**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Cobrança Padrão",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Criar Timeline

**POST** `/timelines-api`

Cria uma nova timeline.

**Body:**
```json
{
  "name": "Nova Timeline"
}
```

**Resposta (201):**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Nova Timeline",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Atualizar Timeline

**PUT** `/timelines-api/[id]`

Atualiza uma timeline existente.

**Body:**
```json
{
  "name": "Timeline Atualizada"
}
```

**Resposta (200):**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Timeline Atualizada",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. Deletar Timeline

**DELETE** `/timelines-api/[id]`

Deleta uma timeline (e todos os seus eventos).

**Resposta (200):**
```json
{
  "message": "Timeline deleted successfully"
}
```

---

## Endpoints de Eventos

### 1. Listar Eventos

**GET** `/events-api?timeline_id=[uuid]`

Lista todos os eventos de uma timeline.

**Resposta (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "timeline_id": "uuid",
      "icon": "💬",
      "icon_size": "text-2xl",
      "date": "10/08",
      "description": "Cobrei o cliente",
      "position": "top",
      "status": "pending",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Obter Evento

**GET** `/events-api/[id]`

Obtém um evento específico.

**Resposta (200):**
```json
{
  "data": {
    "id": "uuid",
    "timeline_id": "uuid",
    "icon": "💬",
    "icon_size": "text-2xl",
    "date": "10/08",
    "description": "Cobrei o cliente",
    "position": "top",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Criar Evento

**POST** `/events-api`

Cria um novo evento.

**Body:**
```json
{
  "timeline_id": "uuid",
  "icon": "📅",
  "icon_size": "text-2xl",
  "date": "11/08",
  "description": "Cliente pediu o boleto",
  "position": "bottom",
  "status": "pending"
}
```

**Campos obrigatórios:**
- `timeline_id`
- `date`
- `description`
- `position` (valores: "top" ou "bottom")

**Campos opcionais:**
- `icon` (padrão: "💬")
- `icon_size` (padrão: "text-2xl")
- `status` (padrão: "pending", valores: "pending", "completed", "failed")

**Resposta (201):**
```json
{
  "data": {
    "id": "uuid",
    "timeline_id": "uuid",
    "icon": "📅",
    "icon_size": "text-2xl",
    "date": "11/08",
    "description": "Cliente pediu o boleto",
    "position": "bottom",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Atualizar Evento

**PUT** `/events-api/[id]`

Atualiza um evento existente.

**Body (todos os campos são opcionais):**
```json
{
  "icon": "✅",
  "icon_size": "text-3xl",
  "date": "12/08",
  "description": "Pagamento recebido",
  "position": "top",
  "status": "completed"
}
```

**Resposta (200):**
```json
{
  "data": {
    "id": "uuid",
    "timeline_id": "uuid",
    "icon": "✅",
    "icon_size": "text-3xl",
    "date": "12/08",
    "description": "Pagamento recebido",
    "position": "top",
    "status": "completed",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. Deletar Evento

**DELETE** `/events-api/[id]`

Deleta um evento.

**Resposta (200):**
```json
{
  "message": "Event deleted successfully"
}
```

---

## Códigos de Status

- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Requisição inválida
- **401**: Não autorizado
- **405**: Método não permitido
- **500**: Erro interno do servidor

## Exemplo de Uso (JavaScript)

```javascript
// Configuração
const API_BASE = 'https://seu-projeto.supabase.co/functions/v1';
const token = 'seu_token_jwt';

// Listar timelines
const response = await fetch(`${API_BASE}/timelines-api`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const { data } = await response.json();

// Criar evento
const newEvent = await fetch(`${API_BASE}/events-api`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    timeline_id: 'uuid-da-timeline',
    date: '15/08',
    description: 'Novo evento',
    position: 'top'
  })
});
```

## Segurança

- Todas as operações são protegidas por Row Level Security (RLS)
- Usuários só podem acessar suas próprias timelines e eventos
- Tokens JWT expiram após 1 hora (renove conforme necessário)
