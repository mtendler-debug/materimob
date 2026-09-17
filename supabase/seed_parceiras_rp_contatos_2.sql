-- Contatos de imobiliárias de Ribeirão Preto pesquisados em 17/09/2026
-- (Imobiliarias_Ribeirao_Preto_Contatos.xlsx) — 15 linhas: 4 já existiam
-- (fundidas, "Sônia e Ramalho" == "Sônia \& Ramalho" confirmado com o
-- Marcos), 11 novas. Telefone preenchido prioriza WhatsApp (canal que o
-- Marcos realmente usa); quando telefone fixo e WhatsApp são números
-- diferentes, o que não virou o campo fica registrado na observação — na
-- mescla, se o campo já estava ocupado, é o contato NOVO da planilha que
-- vai pra observação (nunca sobrescreve o que já existia, mas também não
-- pode perder informação nova por causa disso). Linhas com 'CONFIRMAR' na
-- planilha (contato não localizado nas fontes públicas) não vão pro campo
-- de telefone — viram alerta na observação.
do $$
declare
  v_owner uuid;
  v_id uuid;
begin
  select id into v_owner from auth.users where email = 'mtendler@gmail.com';

  -- mescla: Sônia e Ramalho Imóveis
  update pc_parceiras set responsavel_telefone = '(16) 3966-2210 (confirmar linha direta)' where id = '2202b962-d25f-42b3-858b-8db5a7161d92';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '2202b962-d25f-42b3-858b-8db5a7161d92', 'Categoria (relatório executivo): Blue Chip — uma das 8 imobiliárias líderes em liquidez e concentração de investidores na região.
Telefone fixo: (16) 3966-2210
Ações já feitas (jul/2026): Visitada 2x; sede do 1º War Day (oferta com pizza); +300 ligações efetivas feitas na base dela com discador 3C Plus
Site/Rede social: soniaeramalhoimoveis.com.br');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Citroni Brokers (Citroni Imobiliária)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Citroni Brokers (Citroni Imobiliária)', 'Ribeirão Preto', 'SP', 'Blue Chip', '(16) 99609-7138', 'erickson.citroni@citronibrokers.com.br', 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Ações já feitas (jul/2026): Visitada; disparo de e-mail/WhatsApp sobre Vici Faria Lima
Site/Rede social: citronibrokers.com.br · @imobiliariacitroni');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Santa Maria Imóveis (Santa Maria Tem)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Santa Maria Imóveis (Santa Maria Tem)', 'Ribeirão Preto', 'SP', 'Blue Chip', '(16) 3620-2000', null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Ações já feitas (jul/2026): Cadastrada como nova imobiliária parceira
Site/Rede social: santamariatem.com.br');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Cardinali (unidade Ribeirão Preto)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Cardinali (unidade Ribeirão Preto)', 'Ribeirão Preto', 'SP', 'Blue Chip', null, null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Contato direto não confirmado nas fontes públicas — confirmar antes de abordar (ver Site/Rede Social).
Ações já feitas (jul/2026): Visitada 2x; cadastrada. Unidade nova (aberta em ago/2025) ligada à matriz de São Carlos - contato direto de RP não localizado on-line, recomendo confirmar pelo Instagram @icardinali.rp ou telefone da matriz no site
Site/Rede social: cardinali.com.br (matriz São Carlos) · @icardinali.rp');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Imobiliária Trade')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Imobiliária Trade', 'Ribeirão Preto', 'SP', 'Blue Chip', '(16) 93500-3076', null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Telefone fixo: (16) 3102-3800 / (16) 99242-8157
Ações já feitas (jul/2026): Visitada 2x; cadastrada
Site/Rede social: imobiliariatrade.com.br · @tradeimob');
  end if;

  -- mescla: Fortes Guimarães
  update pc_parceiras set responsavel_telefone = '(16) 3602-8030' where id = '11ce4648-b594-4a57-8ef7-7304599dbe8b';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '11ce4648-b594-4a57-8ef7-7304599dbe8b', 'Categoria (relatório executivo): Blue Chip — uma das 8 imobiliárias líderes em liquidez e concentração de investidores na região.
Telefone fixo: (16) 3602-8000 / (16) 3602-8010
Ações já feitas (jul/2026): Mapeada como Blue Chip no relatório executivo; não consta visita registrada nos relatórios diários - oportunidade em aberto
Site/Rede social: fortesguimaraes.com.br');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Landportus')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Landportus', 'Ribeirão Preto', 'SP', 'Blue Chip', '(16) 98139-7170', 'nilsonap@hotmail.com', 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Ações já feitas (jul/2026): Visitada; cadastrada
Site/Rede social: lanportus.com.br · @lanportusrp');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Prospect Negócios Imobiliários')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Prospect Negócios Imobiliários', 'Ribeirão Preto - SP', null, 'Blue Chip', '(16) 98116-1902', null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Telefone fixo: (16) 3637-5385
Ações já feitas (jul/2026): Visitada 2x; cadastrada logo na 1ª semana
Site/Rede social: imobiliariaprospect.com.br');
  end if;

  -- mescla: Martinelli Imobiliária
  update pc_parceiras set responsavel_email = 'martinelli@imoveismartinelli.com.br' where id = '79f0f0b1-241d-4a8d-8ede-583516069d4b';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '79f0f0b1-241d-4a8d-8ede-583516069d4b', 'Categoria (relatório executivo): Visitada.
Contato (planilha, campo já ocupado): (16) 98167-7777
Telefone fixo: (16) 3965-4242
Ações já feitas (jul/2026): Visitada na 1ª semana
Site/Rede social: imoveismartinelli.com.br');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('MyBroker Ribeirão Preto')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'MyBroker Ribeirão Preto', 'Ribeirão Preto', 'SP', 'Visitada', '(16) 99229-0019', null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Contato direto não confirmado nas fontes públicas — confirmar antes de abordar (ver Site/Rede Social).
Ações já feitas (jul/2026): Visitada na 1ª semana
Site/Rede social: mybroker.com.br/agencia/ribeirao-preto · @mybrokerribeirao');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Andreotti Negócios Imobiliários')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Andreotti Negócios Imobiliários', 'Ribeirão Preto - SP (alto e médio padrão)', null, 'Visitada', null, null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Contato direto não confirmado nas fontes públicas — confirmar antes de abordar (ver Site/Rede Social).
Ações já feitas (jul/2026): Visitada na 1ª semana; contato direto não localizado on-line - recomendo abordar via Instagram/Facebook
Site/Rede social: andreottimobiliaria.com.br · @andreotti_imoveis · facebook.com/Andreottimoveis');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Pagano Imobiliária')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Pagano Imobiliária', 'Ribeirão Preto', 'SP', 'Visitada', '(16) 97400-8686', null, 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Telefone fixo: (16) 2133-2000
Ações já feitas (jul/2026): Visitada 2x
Site/Rede social: imobiliariapagano.com.br · @imobiliariapagano');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Aliança Imóveis (Alliance)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Aliança Imóveis (Alliance)', 'Ribeirão Preto', 'SP', 'Visitada', '(16) 98825-1000 / (16) 98857-1000 (locação: (16) 99264-4000)', 'atendimento@aliancaimoveisrp.com.br', 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Telefone fixo: (16) 3234-9000
Ações já feitas (jul/2026): Visitada 2x; cadastrada
Site/Rede social: aliancaimoveisrp.com.br');
  end if;

  -- mescla: Lago Imóveis
  update pc_parceiras set responsavel_telefone = 'Vendas: (16) 98861-6110 / Locação: (16) 93618-2196 / Lançamentos: (16) 99153-1059', responsavel_email = 'gerente.vendas@lagoimobiliaria.com.br' where id = '2d20e6b0-7ec1-4c9f-a4f0-411a76b42bc4';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '2d20e6b0-7ec1-4c9f-a4f0-411a76b42bc4', 'Categoria (relatório executivo): Visitada.
Telefone fixo: (16) 3211-8330
Ações já feitas (jul/2026): Visitada 2x
Site/Rede social: lagoimobiliaria.com.br');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Cassius Negócios Imobiliários')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Cassius Negócios Imobiliários', 'Ribeirão Preto', 'SP', 'Visitada', '(16) 99789-3110', 'marcelo@cassiusimoveis.com.br', 'nao_contatado', 'Importação de planilha (contatos RP set/2026)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Ações já feitas (jul/2026): Visitada e cadastrada na 2ª semana
Site/Rede social: cassiusimoveis.com.br · @cassius.negociosimobiliarios');
  end if;

end $$;
