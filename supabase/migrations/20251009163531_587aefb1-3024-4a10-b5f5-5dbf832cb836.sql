-- Deletar todos os usuários EXCETO jonatanmodesto2010@gmail.com
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Pegar o ID do usuário que deve ser mantido
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'jonatanmodesto2010@gmail.com';
  
  -- Deletar user_roles de outros usuários
  DELETE FROM public.user_roles 
  WHERE user_id != target_user_id;
  
  -- Deletar timelines de outros usuários
  DELETE FROM public.client_timelines 
  WHERE user_id != target_user_id;
  
  -- Deletar profiles de outros usuários
  DELETE FROM public.profiles 
  WHERE id != target_user_id;
  
  -- Deletar organizations que não pertencem ao usuário mantido
  DELETE FROM public.organizations 
  WHERE id NOT IN (
    SELECT organization_id 
    FROM public.user_roles 
    WHERE user_id = target_user_id
  );
  
  -- Deletar usuários do auth (isso vai cascadear para outras tabelas)
  DELETE FROM auth.users 
  WHERE id != target_user_id;
END $$;