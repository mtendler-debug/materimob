-- Carga inicial: parceiras de Ribeirão Preto/Sertãozinho/Jaboticabal
do $$
declare v_owner uuid;
begin
  select id into v_owner from auth.users where email = 'mtendler@gmail.com';

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Fortes Guimarães')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Fortes Guimarães', 'Ribeirão Preto', 'Alto padrão / lançamentos — atua como consultora de incorporadoras (capta áreas, monta estratégia de vendas de lançamentos, inclusive fora de RP)', 'Sérgio Ricardo, João Paulo e Carlos Henrique Rossi Fortes Guimarães (irmãos, sócios-administradores)', null, 'alta', 'Já faz na prática o que a Chaincorp precisa: vender lançamento de incorporadora fora da praça de origem. Estrutura comercial pronta para esse tipo de operação.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Índice Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Índice Imóveis', 'Ribeirão Preto', 'Médio/alto padrão + nicho de imóveis compactos para público universitário', 'Eduardo Sassi Santucci e Patrícia Zambroni Santucci (casal fundador, sócios-administradores)', '(16) 3913-0500', 'alta', 'O nicho universitário já é experiência real em vender unidade compacta/investimento — exatamente o formato dos studios da Chaincorp (18-49m²).', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Larraz Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Larraz Imóveis', 'Ribeirão Preto', 'Lançamentos de alto padrão (torres exclusivas) + também MCMV Premium; portfólio diversificado incluindo investimento', 'Eduardo Simões Larraz Ferreira e Rodrigo Simões Larraz Ferreira (administradores)', '(16) 4141-2228', 'alta', 'Já vende ''na planta'' de múltiplas construtoras e fala a língua de financiamento/investimento — baixa curva de aprendizado para o produto Chaincorp.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Nosralla Negócios Imobiliários')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Nosralla Negócios Imobiliários', 'Jaboticabal / Ribeirão Preto', 'Alto padrão + já trabalha em parceria com fundos imobiliários, construtoras e imobiliárias em São Paulo capital', 'Hélio Nosralla Netto e Lúcia Helena Soncino Nosralla (administradores)', null, 'alta', 'É a única da lista com ponte declarada para o mercado de SP capital — encurta a distância cultural entre cliente do interior e produto compacto em bairro de SP.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Boulevard Imobiliária')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Boulevard Imobiliária', 'Ribeirão Preto', 'Alto padrão — condomínios fechados (Alto do Vale, Vila do Golf, Alphaville), majoritariamente revenda e locação', 'Samir Augusto Curi (administrador); sócios Guilherme de Sá Demenato e José Carlos Calil', '(16) 3516-7767', 'media', 'Público certo (renda alta), mas motor de negócio é revenda/locação — vai precisar de apoio para vender ''na planta'' e explicar o modelo de investimento.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Habiarte (imoveisribeirao.com)')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Habiarte (imoveisribeirao.com)', 'Ribeirão Preto', 'Incorporadora-imobiliária de alto padrão em bairros planejados (Villarica, Ilhas do Sul)', null, null, 'media', 'Perfil de cliente e prática de vender lançamento combinam bem; falta identificar o contato certo para abordagem.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Martinelli Imobiliária')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Martinelli Imobiliária', 'Ribeirão Preto', 'Tradicional, grande carteira (8 mil+ imóveis), forte em locação', 'Hélio Martinelli Junior (administrador)', '(16) 3965-4242', 'media', 'Volume e capilaridade grandes, mas o negócio é locação — vai exigir capacitação específica da equipe para vender produto de investimento em SP.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Lago Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Lago Imóveis', 'Ribeirão Preto', 'Tradicional desde 1987, mix médio/alto (carteira de 18 mil+ imóveis), com algum alto padrão (Villa Montese)', 'Carlos Roberto Patelli (sócio) e Stela Mara Patelli (administradora)', null, 'media', 'Base de clientes grande e mista; útil como canal de volume, mas não é especialista em investimento ou lançamento fora da praça.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Sônia & Ramalho')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Sônia & Ramalho', 'Ribeirão Preto', 'Residencial/comercial padrão médio-alto, sem especialização clara', null, null, 'baixa', 'Perfil de atuação genérico — sem sinal de experiência com lançamento ou investimento fora da praça.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Piramid Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Piramid Imóveis', 'Ribeirão Preto', 'Locação + imóveis prontos/usados + lançamentos, sem nicho definido', null, null, 'baixa', 'Atua com lançamentos mas sem especialização de público-investidor — priorizar só se a lista acima não for suficiente.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Imovan Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Imovan Imóveis', 'Ribeirão Preto', 'Locação e venda, mix padrão médio/alto', null, null, 'baixa', 'Sem sinal de experiência com produto de investimento ou lançamento fora da praça.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Multiprime Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Multiprime Imóveis', 'Ribeirão Preto', 'Popular/MCMV, avaliação técnica, leilão Caixa, correspondente bancário', 'Kátia Cristina Kitagawa (administradora)', '(16) 3632-6000', 'baixa', 'Ticket do cliente típico é baixo para o produto Chaincorp atual — manter no radar só se a Chaincorp lançar algo de ticket mais popular.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('NN Consultoria Imobiliária')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'NN Consultoria Imobiliária', 'Ribeirão Preto', 'Especialista em MCMV, parceira de construtoras como MRV; atua também em Sorocaba e Campinas', 'Nélio Alencar Ferreira Mattos e Nilo de Almeida Souza Mattos (administradores)', null, 'baixa', 'Forte em MCMV, não em investimento de ticket médio/alto — baixa aderência ao portfólio atual da Chaincorp.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Mais Imóveis Ribeirão Preto')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Mais Imóveis Ribeirão Preto', 'Ribeirão Preto', 'Especializada em MCMV, subsídios e financiamento', null, null, 'baixa', 'Mesmo raciocínio do segmento MCMV: ticket do público não combina com o produto atual da Chaincorp.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('iPlano Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'iPlano Imóveis', 'Ribeirão Preto', 'Lançamentos MCMV ''Premium'' (ticket um pouco mais alto dentro da faixa popular)', null, null, 'baixa', 'Mesmo raciocínio do segmento MCMV — vale reavaliar se a Chaincorp lançar produto de entrada.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Castro Imobiliária')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Castro Imobiliária', 'Sertãozinho', 'Tradicional, carteira grande (800+ imóveis), popular/médio, venda e locação', 'Marina da Silva Castro e Samuel Silva Castro (administradores); Priscilla Silva Castro de Zeballos (sócia)', null, 'media', 'Sertãozinho é polo sucroalcooleiro com bolsões de renda alta (donos de usina, fornecedores); vale testar o discurso de investimento com essa carteira antes de descartar.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Hurbane Negócios Imobiliários')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Hurbane Negócios Imobiliários', 'Sertãozinho', 'Foco em lançamentos', null, null, 'media', 'Já vende ''na planta'' localmente — testar se tem clientes com apetite para diversificar em SP.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Expandh Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Expandh Imóveis', 'Sertãozinho', 'Foco em lançamentos', null, null, 'media', 'Mesmo racional da Hurbane — foco em lançamento é o ponto de partida certo, falta avaliar o perfil de cliente.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Imobiliária LAR')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Imobiliária LAR', 'Sertãozinho', 'Tradicional, venda e locação', null, null, 'baixa', 'Sem sinal de especialização em lançamento ou investimento.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

  if not exists (select 1 from pc_parceiras where owner_id = v_owner and lower(nome_fantasia) = lower('Alto do Cristo Imóveis')) then
    insert into pc_parceiras (owner_id, nome_fantasia, cidade, segmento_foco, responsavel_nome, responsavel_telefone, prioridade, prioridade_justificativa, prioridade_calculada_em, status_funil, origem)
    values (v_owner, 'Alto do Cristo Imóveis', 'Sertãozinho', 'Construção e venda de terrenos/imóveis', null, null, 'baixa', 'Perfil mais voltado a terreno/construção própria do que intermediação de lançamento de terceiros.', now(), 'nao_contatado', 'Pesquisa pública (set/2026)');
  end if;

end $$;
