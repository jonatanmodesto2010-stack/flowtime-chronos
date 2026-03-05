

## Plano: Adaptar o EventModal verticalmente

### O que será feito
Ajustar o EventModal (position='left') para caber melhor na tela verticalmente, adicionando `max-h-[90vh]` com scroll interno no conteúdo, e reduzindo os paddings e gaps para torná-lo mais compacto.

### Mudanças em `src/components/EventModal.tsx`

1. **Container do modal** (linha ~155-159): Adicionar `max-h-[90vh] flex flex-col` para limitar a altura e permitir flex layout
2. **Header** (linha ~161): Reduzir padding de `p-6` para `p-4`
3. **Área de conteúdo** (linha ~173): Reduzir padding de `p-6` para `p-4`, adicionar `overflow-y-auto flex-1` para scroll quando necessário
4. **Gaps internos** (linha ~174): Reduzir gap de `gap-4` para `gap-3`
5. **Textarea** (linha ~258): Reduzir altura de `h-20` para `h-16`
6. **Labels**: Reduzir margin-bottom de `mb-2` para `mb-1`

Isso garante que o modal caiba na vertical sem cortar conteúdo, usando scroll interno quando necessário.

