

## Diagnóstico

O botão "Parar" não funciona porque o frontend tenta atualizar o status do log para `cancelled` na tabela `integration_sync_log`, mas a **política RLS bloqueia a operação**. A policy "Service role can manage sync logs" é do tipo **RESTRICTIVE** (não permissiva), o que significa que ela restringe em vez de permitir. O cliente autenticado com anon key só tem permissão de SELECT, não UPDATE. O update falha silenciosamente, e a edge function nunca vê o status `cancelled`.

## Solução

Duas mudanças:

### 1. Criar RLS policy para permitir UPDATE do status pelo usuário
Adicionar uma policy que permita membros da organização atualizar logs de sync da sua organização (apenas o campo status).

```sql
CREATE POLICY "Members can cancel sync logs"
ON public.integration_sync_log
FOR UPDATE
TO authenticated
USING (organization_id = get_user_organization(auth.uid()))
WITH CHECK (organization_id = get_user_organization(auth.uid()));
```

### 2. Verificar cancelamento com mais frequência na edge function
Atualmente só verifica a cada 100 registros (por página). Adicionar verificação a cada 10 registros dentro do loop `for` em `syncClients` e `syncBoletos`, para resposta mais rápida ao cancelamento.

**Arquivo:** `supabase/functions/ixc-sync/index.ts`
- Dentro do `for` loop de `syncClients` (linha ~117): verificar `checkCancelled` a cada 10 registros
- Dentro do `for` loop de `syncBoletos` (linha ~203): mesma verificação

