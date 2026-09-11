-- pc_parceiras.token_registro nascia com encode(bytes, 'base64'), que pode
-- conter '+', '/' e '=' — inválido numa URL sem escapar. Corrige o default
-- pra base64 url-safe, mesmo padrão (sem +, /, =) que o resto do projeto
-- já usa via generateToken() em src/lib/token.js. Sem dado existente pra
-- migrar (nenhuma pc_parceiras foi criada antes da Fase P1).
alter table pc_parceiras
  alter column token_registro set default
    rtrim(translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_'), '=');
