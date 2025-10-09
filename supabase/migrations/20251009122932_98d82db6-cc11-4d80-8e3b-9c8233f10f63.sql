-- Remover usuário henzopinheiro23@gmail.com do sistema
-- Isso vai cascadear e remover o profile também

DELETE FROM auth.users 
WHERE id = '84c83979-230f-4420-a078-7cea29e2516d';