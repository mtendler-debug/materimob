-- Modelos de critérios "do sistema" — visíveis a todo corretor, sem dono
-- (user_id null). Continuam ao lado dos modelos que cada corretor já monta
-- e salva pra si mesmo; só quem já é responsável pelo modelo pode
-- editar/excluir o próprio, e ninguém edita/exclui um modelo do sistema
-- pela tela (só direto no banco, mesmo espírito de platform_admins).
alter table av_criteria_presets alter column user_id drop not null;

drop policy "Users manage own criteria presets" on av_criteria_presets;

create policy "Corretor vê seus modelos e os do sistema" on av_criteria_presets
  for select using (auth.uid() = user_id or user_id is null);

create policy "Corretor cria só os próprios modelos" on av_criteria_presets
  for insert with check (auth.uid() = user_id);

create policy "Corretor edita só os próprios modelos" on av_criteria_presets
  for update using (auth.uid() = user_id);

create policy "Corretor exclui só os próprios modelos" on av_criteria_presets
  for delete using (auth.uid() = user_id);
