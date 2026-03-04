

## Plano: Destacar clientes bloqueados com fundo avermelhado e tag "BLOQUEADO"

### O que muda

No arquivo `src/pages/Clients.tsx`, na renderização de cada card de cliente (linhas 547-585):

1. **Fundo avermelhado**: Clientes com `is_active === false` (e não finalizados) terão a classe `bg-red-500/10 hover:bg-red-500/15 border border-red-500/30` no card, em vez do `bg-card` padrão.

2. **Tag "BLOQUEADO"**: Substituir o badge atual "Inativo" por um badge mais visível com texto "BLOQUEADO", usando `bg-red-500/20 text-red-400 font-semibold` e um estilo mais destacado.

### Alteração pontual

```tsx
// Card className: adicionar condição para bloqueados
className={`... ${
  isCompleted(client.status) 
    ? 'bg-muted/50 hover:bg-muted/60 opacity-70 grayscale' 
    : !client.is_active 
      ? 'bg-red-500/10 hover:bg-red-500/15 border border-red-500/30' 
      : 'bg-card hover:bg-card/80'
}`}

// Badge: trocar "Inativo" por "BLOQUEADO"
!client.is_active && (
  <div className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex-shrink-0 font-semibold uppercase">
    🔒 BLOQUEADO
  </div>
)
```

Apenas 1 arquivo alterado: `src/pages/Clients.tsx`.

