-- Enriquece prospecção de Ribeirão Preto com a planilha nova (Prospectar parceria RP.xlsx).
-- 3 nomes já existiam de uma pesquisa anterior sem telefone/e-mail (confirmado com o Marcos
-- que "Imobiliária Piramid" == "Piramid Imóveis" já cadastrada) — só enriquece contato +
-- observação, nunca sobrescreve segmento_foco/prioridade que já tinham texto melhor. As outras
-- 10 (imobiliárias + wealth management + entidades) são cadastro novo.
do $$
declare
  v_owner uuid;
  v_id uuid;
begin
  select id into v_owner from auth.users where email = 'mtendler@gmail.com';

  update pc_parceiras set
    responsavel_telefone = coalesce(responsavel_telefone, '(16) 2111-8888'),
    responsavel_email = coalesce(responsavel_email, 'imobiliaria@piramidimoveis.com.br')
  where id = 'f2884b8b-becf-4436-b8da-2853b9bb51b4';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, 'f2884b8b-becf-4436-b8da-2853b9bb51b4', 'Gerente Comercial / Lançamentos
Líder de vendas na Zona Sul de RP; ideal para público comprador de 2º imóvel e investidores.');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Via House Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Via House Imóveis', 'Ribeirão Preto', 'SP', 'Imobiliária (Alto Padrão)', null, '(16) 4009-8131', 'vendas@viahouse.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Diretoria Comercial / Vendas
Forte atuação em lançamentos e assessoria de investimento imobiliário na região.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Benedini Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Benedini Imóveis', 'Ribeirão Preto', 'SP', 'Imobiliária (Alto Padrão)', 'Giulliano Benedini', '(16) 98260-8000', 'giulliano.benediniimoveis@gmail.com', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Diretor / Responsável Técnico
Foco em imóveis de altíssimo padrão e carteira VIP de clientes investidores.');
  end if;

  update pc_parceiras set
    responsavel_telefone = coalesce(responsavel_telefone, '(16) 3329-8652 / (16) 99757-7878'),
    responsavel_email = coalesce(responsavel_email, 'recepcao@imovanimoveis.com.br')
  where id = '4c100f21-9b6c-42a3-9a0d-9050b4309880';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '4c100f21-9b6c-42a3-9a0d-9050b4309880', 'Gerência de Ativos e Parcerias
Foco em consultoria de ativos e locação/renda em áreas valorizadas.');

  update pc_parceiras set
    responsavel_telefone = coalesce(responsavel_telefone, '(16) 3913-0500 / (16) 99302-4291'),
    responsavel_email = coalesce(responsavel_email, 'atendimento@indiceimoveis.com.br')
  where id = '33a9fa82-dc61-4c19-ae96-01480663ae07';
  insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
  values (v_owner, '33a9fa82-dc61-4c19-ae96-01480663ae07', 'Departamento de Vendas / Co-brokerage
Especialistas em investimento para renda e imóveis de alto padrão na Zona Sul.');

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('RE/MAX Ribeirão Preto (Rede Regional)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'RE/MAX Ribeirão Preto (Rede Regional)', 'Ribeirão Preto', 'SP', 'Imobiliária (Alto Padrão)', null, '(16) 3600-0000 (Geral Rede)', 'parcerias.rp@remax.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Broker Owner / Gestor de Parcerias
Rede altamente aberta ao modelo de co-brokerage para lançamentos em São Paulo.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Monefica Wealth Management')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Monefica Wealth Management', 'Atendimento Regional RP / Fiusa', null, 'Wealth Management / Assessoria', null, '(48) 99215-3526', 'ri@monefica.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Head de Real Estate / Multi-Family Office
Atende famílias de altíssima renda e agro local com foco em preservação e diversificação.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Faros Private (BTG Pactual)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Faros Private (BTG Pactual)', 'Ribeirão Preto', 'SP', 'Wealth Management / Assessoria', null, '(11) 3383-3336 / 0800-001-2511', 'atendimento.empresas@btgpactual.com', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Head de Private Banking / Alocação
Escritório credenciado BTG Pactual com foco em grandes empresários do agronegócio regional.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Valor Investimentos (XP Private)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Valor Investimentos (XP Private)', 'Ribeirão Preto', 'SP', 'Wealth Management / Assessoria', null, '(16) 3514-0000', 'contato@valorinvestimentos.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Assessoria Real Estate / Alocador Patrimonial
Uma das maiores credenciadas XP na região; assessora investidores qualificados.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('EQI Investimentos (Unidade RP)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'EQI Investimentos (Unidade RP)', 'Ribeirão Preto', 'SP', 'Wealth Management / Assessoria', null, '0800-000-0354', 'contato@eqi.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Especialista em Ativos Real Estate
Atuação forte na estruturação e recomendação de ativos imobiliários diretos e renda.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Secovi-SP (Regional Ribeirão Preto)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'Secovi-SP (Regional Ribeirão Preto)', 'Ribeirão Preto', 'SP', 'Entidades e Associações', null, '(16) 3623-2555', 'ribeiraopreto@secovi.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Gerência Regional / Eventos
Ponto central do mercado imobiliário regional; excelente para networking e eventos.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('ACIRP (Assoc. Comercial e Industrial)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'ACIRP (Assoc. Comercial e Industrial)', 'Ribeirão Preto', 'SP', 'Entidades e Associações', null, '(16) 3512-8148 / (16) 99710-5761', 'comercial@acirp.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Coordenador de Parcerias / Comercial
Hub de empresários locais; ideal para prospecção corporativa e rodadas de negócios.');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('AELO-SP (Assoc. Loteadores - Regional RP)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, uf, segmento_foco, responsavel_nome, responsavel_telefone, responsavel_email, status_funil, origem)
    values (v_owner, 'AELO-SP (Assoc. Loteadores - Regional RP)', 'Eventos Regionais Ribeirão Preto - SP', null, 'Entidades e Associações', null, '(11) 3289-1788', 'aelo@aelo.com.br', 'nao_contatado', 'Importação de planilha (prospecção RP)')
    returning id into v_id;
    insert into pc_parceira_observacoes (owner_id, parceira_id, texto)
    values (v_owner, v_id, 'Gerência de Relacionamento
Conecta grandes desenvolvedores e investidores de terra com capital disponível no interior.');
  end if;

end $$;
