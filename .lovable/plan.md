

## Plano: Corrigir erro 500 na integração IXC

### Problema identificado

Dois problemas na Edge Function `ixc-sync`:

**1. Autenticação do usuário quebrada:** O código usa `supabaseUser.auth.getClaims()` que não existe no SDK do Supabase. Isso causa um erro antes mesmo de tentar conectar ao IXC. Precisa trocar por `supabaseUser.auth.getUser()`.

**2. IXC retornando HTML:** Pela screenshot, o IXC está em `ixc.glorianet.com.br`. O servidor está retornando a página de login HTML em vez de JSON da API. Isso indica que:
- O `IXC_API_URL` pode estar incorreto (ex: incluindo `/app` no final)
- O `IXC_API_TOKEN` pode estar em formato incorreto (precisa ser `token_do_usuario:` codificado em Base64)

### Correções

1. **Trocar `getClaims` por `getUser`** na edge function para corrigir a autenticação
2. **Melhorar logs** para mostrar exatamente qual URL está sendo chamada e qual resposta está vindo
3. **Adicionar validação da URL** removendo paths extras como `/app` que possam ter sido incluídos

### Sobre as credenciais IXC

O formato correto do token IXC é: o token da API do usuário IXC (encontrado em Configurações > Meu Perfil no IXC), seguido de `:`, codificado em Base64. A URL deve ser apenas o domínio base, ex: `https://ixc.glorianet.com.br`.

