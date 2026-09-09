-- Seed: portfólio Chaincorp, Tabelão de setembro/2026
-- Fonte: Tabelao_Chaincorp_Setembro_2026 (Canal de Parcerias & Relações Comerciais)
-- Rodar depois das migrações do módulo Parcerias.
-- Ajuste o e-mail do owner se necessário.

do $$
declare
  v_owner uuid;
  v_pina uuid; v_vici uuid; v_vip uuid; v_full uuid; v_blue uuid;
begin
  select id into v_owner from auth.users where email = 'mtendler@gmail.com' limit 1;
  if v_owner is null then
    raise exception 'Owner não encontrado. Ajuste o e-mail no seed.';
  end if;

  -- Config e regras de enquadramento (limites em branco: preencher após confirmação com o jurídico da incorporadora)
  insert into pc_config (owner_id, validade_registro_dias, conflito_escopo, limite_registros_por_hora_token)
  values (v_owner, 90, 'empreendimento', 30)
  on conflict (owner_id) do nothing;

  insert into pc_regras_enquadramento (owner_id, enquadramento, veda_proprietario_de_imovel, exige_comprovacao, texto_orientacao, vigente_desde, fonte)
  values
    (v_owner, 'HIS-2', true, true, 'Unidade com restrição de renda familiar e de titularidade. Confirmar elegibilidade do comprador com a incorporadora antes de registrar.', current_date, 'A confirmar com o jurídico da Chaincorp'),
    (v_owner, 'HMP',   true, true, 'Unidade com restrição de renda familiar. Confirmar elegibilidade do comprador com a incorporadora antes de registrar.', current_date, 'A confirmar com o jurídico da Chaincorp');

  -- Empreendimentos
  insert into pc_empreendimentos (id, owner_id, incorporadora, nome, bairro, zona, endereco, entrega_prevista, estagio, comissao_pf_pct, comissao_pj_pct, comissao_obs, tabela_referencia, tabela_data)
  values
    (gen_random_uuid(), v_owner, 'Chaincorp Incorporações', 'Pina 1875', 'Perdizes', 'Oeste', 'R. Apinajés, 1875, Perdizes, São Paulo/SP', '2028-10-01', 'obras', 2, 4, null, 'Tabelão Chaincorp setembro/2026', '2026-09-01')
  returning id into v_pina;

  insert into pc_empreendimentos (id, owner_id, incorporadora, nome, bairro, zona, endereco, entrega_prevista, estagio, comissao_pf_pct, comissao_pj_pct, comissao_obs, tabela_referencia, tabela_data)
  values
    (gen_random_uuid(), v_owner, 'Chaincorp Incorporações', 'Vici Faria Lima', 'Pinheiros', 'Oeste', 'R. dos Carlins, 422, Pinheiros, São Paulo/SP', '2029-04-01', 'obras', 2, 4, null, 'Tabelão Chaincorp setembro/2026', '2026-09-01')
  returning id into v_vici;

  insert into pc_empreendimentos (id, owner_id, incorporadora, nome, bairro, zona, endereco, entrega_prevista, estagio, comissao_pf_pct, comissao_pj_pct, comissao_obs, tabela_referencia, tabela_data)
  values
    (gen_random_uuid(), v_owner, 'Chaincorp Incorporações', 'Vip Vila Prudente', 'Vila Prudente', 'Leste', 'R. Américo Vespucci, 958, Vila Prudente, São Paulo/SP', '2028-08-01', 'obras', 2, 4, null, 'Tabelão Chaincorp setembro/2026', '2026-09-01')
  returning id into v_vip;

  insert into pc_empreendimentos (id, owner_id, incorporadora, nome, bairro, zona, endereco, entrega_prevista, estagio, comissao_pf_pct, comissao_pj_pct, comissao_obs, tabela_referencia, tabela_data)
  values
    (gen_random_uuid(), v_owner, 'Chaincorp Incorporações', 'Full Jardim São Paulo', 'Jardim São Paulo', 'Norte', 'R. Julia Lopes de Almeida, 99, Jardim São Paulo, São Paulo/SP', '2026-12-01', 'obras', 2, 5, 'PJ até 5% + bônus, conforme regulamento vigente', 'Tabelão Chaincorp setembro/2026', '2026-09-01')
  returning id into v_full;

  insert into pc_empreendimentos (id, owner_id, incorporadora, nome, bairro, zona, endereco, entrega_prevista, estagio, comissao_pf_pct, comissao_pj_pct, comissao_obs, tabela_referencia, tabela_data)
  values
    (gen_random_uuid(), v_owner, 'Chaincorp Incorporações', 'Blue Park Jardim São Paulo', 'Jardim São Paulo', 'Norte', 'R. Parque Domingos Luís, 77, Jardim São Paulo, São Paulo/SP', '2027-05-01', 'obras', 2, 5, 'PJ até 5% + bônus, conforme regulamento vigente', 'Tabelão Chaincorp setembro/2026', '2026-09-01')
  returning id into v_blue;

  -- Unidades
  -- Colunas: empreendimento, identificacao, torre, metragem, tipologia, dormitorios, vagas, enquadramento, uso_residencial, condicao, valor_m2, valor_total, destaque_rede
  insert into pc_unidades (owner_id, empreendimento_id, identificacao, torre, metragem_privativa, tipologia, dormitorios, vagas, enquadramento, uso_residencial, condicao_pagamento, valor_m2, valor_total, destaque_rede)
  values
    -- Pina 1875 (enquadramento não sinalizado no tabelão; assumido R2V, confirmar com a incorporadora)
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 20.00, 'Studio Garden', 0, 0, 'R2V', true, 'À vista', null, 250000.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 35.00, 'Studio Garden', 0, 0, 'R2V', true, 'À vista', 12500.00, 437500.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 18.00, 'Studio', 0, 0, 'R2V', true, 'À vista', null, 225000.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 23.00, 'Studio', 0, 0, 'R2V', true, '20% entrada + 80% obra', null, 317400.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 26.00, '1 Dorm.', 1, 0, 'R2V', true, '20% entrada + 80% obra', 13800.00, 358800.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 40.00, '1 Dorm.', 1, 0, 'R2V', true, '20% entrada + 80% obra', null, 552000.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 37.00, '2 Dorm.', 2, 0, 'R2V', true, '40% obra + 60% financiamento', null, 592000.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 49.00, '2 Dorm.', 2, 0, 'R2V', true, '40% obra + 60% financiamento', 16000.00, 784000.00, true),
    (v_owner, v_pina, 'Qualquer unidade', 'Única', 58.00, 'Loja Térreo + Vaga', null, 1, 'NR', false, '40% obra + 60% financiamento', null, 928000.00, false),

    -- Vici Faria Lima
    (v_owner, v_vici, 'Qualquer unidade', 'Única', 25.00, 'Studio HIS-2', 0, 0, 'HIS-2', true, 'À vista', 13480.00, 337000.00, true),
    (v_owner, v_vici, 'Qualquer unidade', 'Única', 25.00, 'Studio HIS-2', 0, 0, 'HIS-2', true, '10% entrada + 30% obra + 60% financiamento', 15344.00, 383600.00, true),
    (v_owner, v_vici, 'Laje 1 (1º andar)', 'Única', 648.22, 'Laje corporativa', null, 0, 'NR', false, 'Verificar', 18000.00, 11668000.00, false),
    (v_owner, v_vici, 'Lajes 2º ao 5º andar (4 lajes, valor unitário)', 'Única', 660.00, 'Laje corporativa', null, 0, 'NR', false, 'Verificar', 18000.00, 11880000.00, false),
    (v_owner, v_vici, 'Loja', 'Única', 1128.40, 'Loja pavimento térreo', null, 0, 'NR', false, 'Verificar', 18001.00, 20312000.00, false),

    -- Vip Vila Prudente (unidades sem sinalização HIS/HMP assumidas R2V, confirmar)
    (v_owner, v_vip, '146', 'Única', 25.00, '1 Dorm.', 1, 0, 'R2V', true, 'Verificar', 12752.00, 318795.78, true),
    (v_owner, v_vip, '18', 'Única', 29.00, '1 Dorm.', 1, 0, 'R2V', true, 'Verificar', 12486.00, 362101.35, true),
    (v_owner, v_vip, '92', 'Única', 37.00, '2 Dorm.', 2, 0, 'R2V', true, 'Verificar', 9475.00, 350569.98, true),
    (v_owner, v_vip, '91', 'Única', 40.00, '2 Dorm.', 2, 0, 'R2V', true, 'Verificar', 9894.00, 395752.20, true),
    (v_owner, v_vip, '14', 'Única', 34.00, 'Duplex 1 Dorm.', 1, 0, 'NR', true, 'Verificar', 11279.00, 383486.65, true),
    (v_owner, v_vip, 'L-1', 'Única', 100.00, 'Loja Térreo', null, 0, 'NR', false, 'Verificar', 8887.00, 888738.98, false),

    -- Full Jardim São Paulo
    (v_owner, v_full, '1301', 'Torre Única', 36.00, '2 Dorm.', 2, 0, 'HMP', true, 'Verificar', 12279.00, 442050.28, true),
    (v_owner, v_full, '303', 'Torre Única', 45.19, 'Garden 2 Dorm.', 2, 0, 'HMP', true, 'Verificar', 10240.00, 462745.60, true),

    -- Blue Park Jardim São Paulo
    (v_owner, v_blue, '13', 'Única', 61.00, 'Garden 3 Dorm. (1 Suíte)', 3, 1, 'NR', true, 'Verificar', 11115.00, 678025.68, true),
    (v_owner, v_blue, '14', 'Única', 74.00, 'Garden 3 Dorm. (1 Suíte)', 3, 1, 'NR', true, 'Verificar', 10491.00, 776327.68, true),
    (v_owner, v_blue, '23', 'Única', 53.00, '3 Dorm. (1 Suíte)', 3, 1, 'NR', true, 'Verificar', 12295.00, 651655.82, true),
    (v_owner, v_blue, '92', 'Única', 53.00, '3 Dorm. (1 Suíte)', 3, 1, 'HMP', true, 'Verificar', 14987.00, 794336.72, true),
    (v_owner, v_blue, '24', 'Única', 56.00, '3 Dorm. (1 Suíte)', 3, 1, 'NR', true, 'Verificar', 11823.00, 662075.79, true),
    (v_owner, v_blue, '101', 'Única', 40.00, '2 Dorm.', 2, 0, 'HMP', true, 'Verificar', 14693.00, 587716.04, true);

  -- Empreendimentos: observações do tabelão
  update pc_empreendimentos set observacoes = 'Todas as unidades do tabelão são promocionais. Consultar disponibilidade e condições para outras unidades. Comissionamento, campanhas e bônus sujeitos ao regulamento vigente.'
  where owner_id = v_owner and tabela_data = '2026-09-01';
end $$;
