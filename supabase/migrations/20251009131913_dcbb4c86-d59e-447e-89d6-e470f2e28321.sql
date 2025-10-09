-- Remover usuários de teste, mantendo apenas Jonatan Modesto

-- Deletar user_roles dos usuários de teste
DELETE FROM public.user_roles 
WHERE user_id IN (
  'f6a9cede-f8f0-4708-9354-517562b03dcf',  -- 268510Rjhd@
  '2f2ca826-2c4a-4872-90ed-37066a4f6e13'   -- Henzo
);

-- Deletar profiles dos usuários de teste
DELETE FROM public.profiles 
WHERE id IN (
  'f6a9cede-f8f0-4708-9354-517562b03dcf',  -- 268510Rjhd@
  '2f2ca826-2c4a-4872-90ed-37066a4f6e13'   -- Henzo
);

-- Deletar organizações dos usuários de teste
DELETE FROM public.organizations 
WHERE id IN (
  'ead4fefa-827c-4e66-8109-41d096c087f4',  -- 268510Rjhd@'s Organization
  '4286d497-8462-4911-91c2-ecbe3d3a3df6'   -- Henzo's Organization
);