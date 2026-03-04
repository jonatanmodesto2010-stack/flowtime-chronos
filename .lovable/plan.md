

## Diagnostico

Pelos logs, cada pagina de 100 boletos leva ~3s (fetch IXC ~1s + 10 rodadas de 10 updates paralelos ~2s). Com 12.000+ registros = 120+ paginas = ~6 minutos. O gargalo continua sendo updates individuais -- mesmo com concorrencia 10, sao 10 queries por rodada.

## Solucao: Batch upsert via DB function + paginas maiores

### 1. Criar uma funcao SQL `batch_upsert_boletos`

Uma funcao que recebe arrays e faz UPDATE em massa com uma unica query SQL (usando `unnest`), substituindo 100 queries individuais por 1 unica.

```sql
CREATE FUNCTION batch_upsert_boletos(
  p_ids uuid[], p_values numeric[], p_dates date[], p_statuses text[]
) RETURNS void AS $$
  UPDATE client_boletos SET
    boleto_value = d.val,
    due_date = d.dd,
    status = d.st,
    updated_at = now()
  FROM unnest(p_ids, p_values, p_dates, p_statuses) AS d(id, val, dd, st)
  WHERE client_boletos.id = d.id;
$$ LANGUAGE sql SECURITY DEFINER;
```

### 2. Mesma funcao para clientes: `batch_upsert_clients`

### 3. Edge function: substituir o loop de updates

Em vez de 10 rodadas de `Promise.all`, chamar `supabaseAdmin.rpc('batch_upsert_boletos', { arrays })` -- 1 query por pagina.

### 4. Aumentar tamanho da pagina de 100 para 500

Menos paginas = menos roundtrips ao IXC e ao banco.

### Resultado esperado

- 100 updates individuais → 1 query batch por pagina
- 120 paginas de 100 → 24 paginas de 500
- Tempo estimado: de ~6min para ~30-60s

