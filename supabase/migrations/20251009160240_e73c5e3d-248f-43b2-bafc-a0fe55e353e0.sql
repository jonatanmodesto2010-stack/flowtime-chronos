-- Adicionar coluna de telefone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT;

-- Adicionar validação no schema de zod será feito no código
COMMENT ON COLUMN public.profiles.phone IS 'Número de telefone do usuário';