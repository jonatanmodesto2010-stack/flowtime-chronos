-- Remover e recriar a foreign key para forçar o Supabase a reconhecer o relacionamento

-- Remover foreign key existente (se houver)
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Recriar foreign key com o relacionamento correto
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;