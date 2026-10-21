-- =====================================================================
-- CHAINCORP HUB · Script 2 de 2: dados iniciais
-- Rode depois do Script 1. Pode rodar de novo: não duplica registros.
-- =====================================================================

insert into public.hub_admins_iniciais (email) values ('marcos@chaincorp.com.br'), ('mtendler@gmail.com') on conflict do nothing;

insert into public.hub_config (chave, valor) values ('comissao_percentual', null) on conflict do nothing;

-- Imobiliárias visitadas em Ribeirão Preto e Sertãozinho (set-out/2026)
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Santa Maria', 'Ribeirão Preto', 'em_negociacao', 'media', 'Fernando', null, '2026-09-21', 'SM Tem Soluções Imobiliárias LTDA', '27.898.359/0001-84 (a confirmar)', '14.193-J', 'Av. Independência, 2325', null, 'Reunião marcada para 08/10.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Lina', 'Ribeirão Preto', 'prospect', null, 'Recepção', null, '2026-09-21', null, null, null, null, null, 'Reagendar com a liderança comercial.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Galleria Imóveis', 'Ribeirão Preto', 'prospect', null, 'Marcelo', null, '2026-09-21', 'Galeria Imobiliária Comércio e Administração de Bens LTDA', '11.463.519/0001-22', '21.464-J', 'Av. Presidente Vargas, 175, Jardim América', 'contato@galeriaimobiliaria.com.br', 'Proposta focada em leads para SP.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Lago Imobiliária', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-21', 'Lago Imóveis LTDA', '57.708.554/0001-65', '37.857-J', 'Av. Presidente Vargas, 407, Jardim América', 'lancamentos@lagoimobiliaria.com.br', null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Boulevard Imobiliária', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-21', 'S.A.C. Boulevard Imóveis LTDA - ME', '24.271.688/0001-02', '29.023-J', 'Av. Presidente Vargas, 716, Jardim América', null, 'Carteira de locação com perfil investidor. Dor: perde a venda quando o cliente compra direto com a construtora.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Cardinali', 'Ribeirão Preto', 'prospect', null, 'Desiree / gestora Naiara', null, '2026-09-22', 'Imobiliária Cardinali Ribeirão Preto LTDA', '61.815.605/0001-25', null, 'Rua Eliseu Guilherme, 370, Jardim Sumaré', 'admcardinali@icardinali.com.br', 'Agendar com a gestora.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Campo Moderno', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-22', 'Campo Moderno Topografia e Projetos', '09.563.763/0001-15', null, 'Rua Floriano Peixoto, 1238, Alto da Boa Vista', 'comercial@campomoderno.com.br', null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Aliança Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-22', null, null, '35.591-J', 'Av. Nove de Julho, 1815, Jardim América', 'atendimento@aliancaimoveisrp.com.br', null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Fortes Guimarães', 'Ribeirão Preto', 'em_negociacao', 'alta', null, null, '2026-09-22', 'Novaemp Ribeirão Preto Empreend. Imob. Ltda', '10.329.689/0001-56 (a confirmar)', 'J 20680', 'Av. Itatiaia, 888, Alto da Boa Vista', null, 'Treinamento e jantar remarcados para novembro a pedido da imobiliária.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Líder Master', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-22', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Martinelli', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-22', 'Martinelli Empreendimentos Imobiliários Ltda', '01.703.236/0001-57', '22.285-J', 'Av. Prof. João Fiúsa, 1051, Alto da Boa Vista', 'martinelli@imoveismartinelli.com.br', null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Benedini', 'Ribeirão Preto', 'prospect', 'alta', null, null, '2026-09-22', 'Henrique Benedini Imóveis Ltda - ME', '37.968.897/0001-51', 'J 40333', 'Rua Dr. João Gomes Rocha, 635, Jardim Irajá', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Piramid', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-22', 'Piramid Imóveis Ltda', '00.685.077/0001-42', '15.102-J', 'Av. Carlos Consoni, 880, Jardim Canadá', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Rocca Imóveis', 'Ribeirão Preto', 'prospect', null, 'Amanda', null, '2026-09-22', null, null, null, null, null, 'Agendar novo encontro.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Ribeirão Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-23', 'Ribeirao Imoveis Ltda', '35.099.304/0001-32', null, 'Av. Prof. João Fiúsa, 1147', null, 'Revisitada em 29-30/09; pediu retorno em outra oportunidade.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Sônia & Ramalho', 'Ribeirão Preto', 'treinada', 'alta', 'Tati e Rodrigo', 19, '2026-09-30', 'Sônia e Ramalho Imóveis Ltda', '11.815.332/0001-40', '21.608-J', 'Av. Costábile Romano, 1451, Ribeirânia', 'financeiro@soniaeramalhoimoveis.com.br', 'Treinada em 30/09.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Imobiliária Trade', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-23', 'Imobiliária Trade Ltda', '19.965.345/0001-08', '25.805-J', 'Rua Capitão Adélmio Norberto da Silva, 776, Alto da Boa Vista', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Bolsa de Imóveis', 'Ribeirão Preto', 'prospect', null, 'Jader', null, '2026-09-23', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Citroni Brokers', 'Ribeirão Preto', 'em_negociacao', 'alta', null, 30, '2026-09-23', 'Citroni Brokers Imobiliária Ltda', '28.947.493/0001-90', '41.204-J', 'Rua Dr. Carlos Chagas, 295, Jardim Botânico', 'erickson.citroni@citronibrokers.com.br', 'Treinamento a formalizar.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Cassius Negócios Imobiliários', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-23', null, null, '46.687-J', 'Av. Wladimir Meirelles Ferreira, 1525, Sala 05, Jardim Botânico', 'marcelo@cassiusimoveis.com.br', null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('MyBroker Imóveis', 'Ribeirão Preto', 'em_negociacao', 'media', 'Nelson Ferreira', 15, '2026-09-23', 'My Broker Imóveis Ribeirão Preto Ltda', '47.071.497/0001-00', '41.356 (CJ)', 'Av. João Fiusa, 1332', null, 'Reunião marcada para 08/10.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Lanportus', 'Ribeirão Preto', 'treinada', 'alta', 'Nilson (sócio) · gerente Marcelo', 30, '2026-10-02', 'N. P. Negócios Imobiliários LTDA', '44.373.812/0001-58', null, 'Rua Hudson, 139, Jardim Canadá', null, 'Treinada em 02/10. Evento para investidores em 28/10.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Prospect Imobiliária', 'Ribeirão Preto', 'treinada', 'alta', 'Mateus (sócio)', 15, '2026-09-29', 'Prospect Negócios Imobiliários', null, null, 'Zona Sul · (16) 98116-1902', null, 'Treinada em 29/09. Coquetel para 20 investidores em 27/10.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Jardins Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-23', 'Jardins Imobiliária RP', null, '037506J', 'Rua Galileu Galilei, 1005, Jardim Irajá', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Pagano Imóveis', 'Ribeirão Preto', 'prospect', null, 'Sócia', null, '2026-09-23', 'Imobiliária Pagano LTDA', '50.490.036/0002-50', '3375J', 'Av. José Adolfo Bianco Molina, 2291, Jardim Canadá', null, 'Sócia estava fora da cidade.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Índice Imóveis', 'Ribeirão Preto', 'prospect', 'alta', null, null, '2026-09-24', 'Índice Imóveis LTDA', '09.094.169/0001-22', '20.059-J', 'Rua Joaquim Antônio Nascimento, 69, Jardim Canadá', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('NC Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', null, null, null, null, null, 'Nome a confirmar com Daniel.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Andreotti Negócios Imobiliários', 'Ribeirão Preto', 'treinada', 'media', 'Evandro (sócio)', 10, '2026-09-29', null, null, null, null, null, 'Treinada em 29/09.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Classic Imobiliária (Grupo SZ)', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', 'Classic Imóveis RP', '59.589.815/0001-09 (a confirmar)', '33.242-J', 'Av. Norma Valério Corrêa, 705, Jardim Botânico', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Etéria Imobiliária', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Paulo Rodini Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', 'Paulo Rodini Imóveis Ltda', '08.169.931/0001-20', null, 'Av. Carlos Consoni, 781, Jardim Canadá', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('NN Consultoria Imobiliária', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', 'NN Consultoria Imobiliária Ribeirão Preto Ltda', '49.418.927/0001-35', '43.279-J', 'Av. Professor João Fiúsa, 104, Alto da Boa Vista', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Junia Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', 'Junia Melo Assessoria Imobiliária Ltda', '08.279.211/0001-17', '19.762-J', 'Rua Magda Perona Frossard, 770, Sala 06, Nova Aliança', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Pazotti', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', 'Rodrigo Vaz Pazotti', '24.444.779/0001-00', '30.160-J', 'Rua Moreira de Oliveira, 567, Alto da Boa Vista', null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Darko Imobiliária', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-24', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('CJC Imóveis', 'Sertãozinho', 'prospect', null, null, null, '2026-09-25', null, null, null, null, null, 'Portas fechadas durante a visita.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Lar Imóveis', 'Sertãozinho', 'prospect', null, null, null, '2026-09-25', null, null, null, null, null, 'Proprietários ausentes.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Batizoco e Meira', 'Sertãozinho', 'prospect', null, null, null, '2026-09-25', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Ribram Imobiliária', 'Sertãozinho', 'prospect', 'baixa', 'Ana (proprietária)', 3, '2026-09-25', null, null, null, null, null, 'Foco em casas e locação; perfil não prioritário.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Olivares Imob', 'Sertãozinho', 'prospect', null, 'Corretor', 3, '2026-09-25', null, null, null, null, null, 'Foco em terrenos.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Castro Imobiliária / Remax', 'Sertãozinho', 'prospect', null, null, null, '2026-09-25', null, null, null, null, null, 'Responsáveis em reunião em Ribeirão.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('GW Imóveis', 'Sertãozinho', 'prospect', null, 'Recepcionista', null, '2026-09-25', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Phercon', 'Sertãozinho', 'sem_interesse', null, null, null, '2026-09-25', 'Phercon Construtora e Administradora de Bens LTDA', '00.563.752/0001-60', null, 'Rua Aprígio de Araújo, 946, Centro', null, 'Construtora; sem interesse no momento.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Galvão Gimenez Empreendimentos Imobiliários', 'Sertãozinho', 'prospect', null, null, null, '2026-09-25', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Master Consultoria Imobiliária', 'Sertãozinho', 'prospect', null, 'Recepcionista (contato do responsável coletado)', null, '2026-09-25', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Imobiliária Habitat', 'Sertãozinho', 'em_negociacao', 'alta', 'Marcos e Carlos (sócios)', 10, '2026-09-25', null, null, null, null, null, 'Pediu o contrato social da Chaincorp para validar a parceria. Grupo de transmissão com ~60 corretores.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('KF Negócios Imobiliários', 'Ribeirão Preto', 'em_negociacao', 'alta', 'Márcio (sócio-diretor)', 10, '2026-09-28', null, null, null, null, null, 'Reunião de aprofundamento encaminhada.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Habiteto Imóveis', 'Ribeirão Preto', 'prospect', null, 'Cristiane', null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('JC Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Imobiliária Tiago Lopes / Casa Verde', 'Ribeirão Preto', 'em_negociacao', 'alta', 'Felícia (proprietária)', 8, '2026-09-28', null, null, null, null, null, 'Treinamento alinhado.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Varanda Nova Imobiliária', 'Ribeirão Preto', 'em_negociacao', 'media', 'Proprietário', null, '2026-09-28', null, null, null, null, null, 'Interesse em ofertar o Verya; perguntou sobre segurança da SCP.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Rossini Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Canadá Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Massoneto Imóveis', 'Ribeirão Preto', 'sem_interesse', null, null, null, '2026-09-29', null, null, null, null, null, 'Foco exclusivo em terrenos.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Maqtem Imóveis', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Pros Imobiliária', 'Ribeirão Preto', 'prospect', null, 'Suzana', null, '2026-09-28', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Casa JFC', 'Ribeirão Preto', 'prospect', null, 'Recepção', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Remax (unidade)', 'Ribeirão Preto', 'prospect', null, 'Recepção', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('IBM Prime', 'Ribeirão Preto', 'prospect', null, 'Recepção', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Remax We', 'Ribeirão Preto', 'prospect', null, 'Felipe (gerente de vendas)', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Remax Full', 'Ribeirão Preto', 'em_negociacao', 'alta', 'Felipe Roman (sócio)', 14, '2026-09-29', null, null, null, null, null, 'Gostou da proposta, aguardando retorno.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Realize-se', 'Ribeirão Preto', 'em_negociacao', 'alta', 'Sérgio (gerente) e Marcio (proprietário)', 50, '2026-09-29', null, null, null, null, null, '50 corretores em 7 equipes; treinamento sugerido.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Meu Imóvel RP', 'Ribeirão Preto', 'sem_interesse', null, 'Joana', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Vivancy', 'Ribeirão Preto', 'prospect', null, null, null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Veguel', 'Ribeirão Preto', 'prospect', null, 'Sócios', null, '2026-09-29', null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Via House', 'Ribeirão Preto', 'em_negociacao', 'alta', 'Luiz Trindade (proprietário)', 8, '2026-10-06', null, null, null, null, null, 'Treinamento com 6 a 8 corretores a confirmar.') on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Larraz', 'Ribeirão Preto', 'prospect', 'alta', null, null, null, null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;
insert into public.imobiliarias (nome, cidade, situacao, prioridade, contato, corretores, ultimo_contato, razao_social, cnpj, creci_j, endereco, email, notas) values ('Nosralla', 'Ribeirão Preto', 'prospect', 'alta', null, null, null, null, null, null, null, null, null) on conflict ((lower(nome))) do nothing;

-- As quatro imobiliárias já treinadas entram como ativas no Hub
update public.imobiliarias set ativa_no_hub = true where nome in ('Lanportus','Prospect Imobiliária','Sônia & Ramalho','Andreotti Negócios Imobiliários');

-- Portfólio Chaincorp
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('verya', 'Verya Jardins', 'Av. Rebouças, 1.444 · Jardins', 'Pré-lançamento', '{SCP,R2V,HMP,HIS-2}', '#0B3D91', '#1A73E8', 1) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('vici', 'Vici Faria Lima', 'Pinheiros', 'Em comercialização', '{HIS-2}', '#00563F', '#0F9D58', 2) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('pina', 'Pina 1875 by 360 Suítes', 'Rua Apinajés · Perdizes', 'Em comercialização', '{R2V,"360 Suítes"}', '#5B2A86', '#9C5BD1', 3) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('rooftop', 'Rooftop Perdizes', 'Rua Iperoig · Perdizes', 'Em aprovação', '{HIS-2,HMP,R2V}', '#7A3E00', '#E8710A', 4) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('full', 'Full Jardim São Paulo', 'Jardim São Paulo', 'Entrega dez/2026', '{"Pronto em breve"}', '#004D61', '#12A4AF', 5) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('blue', 'Blue Park', 'Jardim São Paulo', 'Em comercialização', '{}', '#123C69', '#4A90D9', 6) on conflict (id) do nothing;
insert into public.lancamentos (id, nome, local, fase, tags, cor1, cor2, ordem) values ('vip', 'VIP Vila Prudente', 'Vila Prudente', 'Em comercialização', '{"96 unidades"}', '#3C1F1F', '#B3261E', 7) on conflict (id) do nothing;

-- Textos padrão dos kits de WhatsApp (o Marketing edita no Hub)
insert into public.copies (lancamento_id, tese, texto) values ('verya', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('verya', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('verya', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vici', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vici', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vici', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('pina', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('pina', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('pina', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('rooftop', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('rooftop', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('rooftop', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('full', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('full', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('full', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('blue', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('blue', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('blue', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vip', 'investimento', '*{nome}* | {local}

Oportunidade de investimento com a Chaincorp: produto pensado para renda e valorização em uma das regiões mais disputadas de São Paulo.

Book, plantas e condições neste link:
{link}

Qualquer dúvida, me chama por aqui.
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vip', 'moradia', '*{nome}* | {local}

Um endereço para viver bem, com transporte, serviços e lazer a poucos passos.

Conheça o projeto completo:
{link}

Posso separar as plantas que combinam com você?
{corretor}') on conflict do nothing;
insert into public.copies (lancamento_id, tese, texto) values ('vip', 'escassez', '*{nome}* | {fase}

As melhores unidades costumam sair nos primeiros dias. Tenho acesso antecipado à tabela e às plantas.

Garanta sua prioridade:
{link}

Me responde aqui que eu já reservo um horário.
{corretor}') on conflict do nothing;

-- Agenda comercial
do $$ begin if not exists (select 1 from public.eventos) then
  insert into public.eventos (data, quando_texto, titulo, detalhe, imobiliaria_id, status) values ('2026-10-08'::date, null, 'Reuniões MyBroker e Santa Maria', 'Nelson Ferreira e Fernando', (select id from public.imobiliarias where nome = 'MyBroker Imóveis'), 'confirmado');
  insert into public.eventos (data, quando_texto, titulo, detalhe, imobiliaria_id, status) values ('2026-10-27'::date, null, 'Coquetel para investidores · Prospect', '20 investidores na sede da Prospect', (select id from public.imobiliarias where nome = 'Prospect Imobiliária'), 'confirmado');
  insert into public.eventos (data, quando_texto, titulo, detalhe, imobiliaria_id, status) values ('2026-10-28'::date, null, 'Evento para investidores · Lanportus', 'Alinhar com o gerente Marcelo', (select id from public.imobiliarias where nome = 'Lanportus'), 'confirmado');
  insert into public.eventos (data, quando_texto, titulo, detalhe, imobiliaria_id, status) values (null, 'Esta semana', 'Treinamento Via House', '6 a 8 corretores · confirmar com Luiz Trindade', (select id from public.imobiliarias where nome = 'Via House'), 'a_confirmar');
  insert into public.eventos (data, quando_texto, titulo, detalhe, imobiliaria_id, status) values (null, 'Novembro', 'Treinamento e jantar · Fortes Guimarães', 'Remarcado para novembro a pedido da imobiliária', (select id from public.imobiliarias where nome = 'Fortes Guimarães'), 'a_confirmar');
  insert into public.eventos (tipo, data, titulo, status, imobiliaria_id) values
    ('treinamento','2026-09-29','Treinamento Prospect Imobiliária','realizado',(select id from public.imobiliarias where nome = 'Prospect Imobiliária')),
    ('treinamento','2026-09-29','Treinamento Andreotti','realizado',(select id from public.imobiliarias where nome = 'Andreotti Negócios Imobiliários')),
    ('treinamento','2026-09-30','Treinamento Sônia & Ramalho','realizado',(select id from public.imobiliarias where nome = 'Sônia & Ramalho')),
    ('treinamento','2026-10-02','Treinamento Lanportus','realizado',(select id from public.imobiliarias where nome = 'Lanportus'));
  update public.eventos set tipo = 'treinamento' where titulo like 'Treinamento%';
  update public.eventos set tipo = 'evento' where titulo like 'Coquetel%' or titulo like 'Evento%';
end if; end $$;

-- Academia de Vendas: trilhas, aulas, quiz e biblioteca de abordagem
do $$ declare t bigint; begin
  insert into public.trilhas (titulo, descricao, nivel, ordem, lancamento_id) values ('Nível 1 · Conheça a Chaincorp e o Hub', 'O ponto de partida de todo parceiro: quem é a Chaincorp, o que ela vende e como a parceria funciona no dia a dia.', 1, 1, null) on conflict ((lower(titulo))) do nothing returning id into t;
  if t is not null then
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Quem é a Chaincorp', 'leitura', 8, 'A Chaincorp Incorporações desenvolve apartamentos e studios compactos, de 18 a 87 m², em bairros centrais de São Paulo: Pinheiros, Perdizes, Vila Madalena, Vila Prudente, Jardim São Paulo, Jardins e Tatuapé.

O posicionamento é de oportunidade de investimento em regiões de alta demanda, não de habitação popular. Para o corretor do interior, isso abre uma conversa nova com clientes que já investem e procuram renda, valorização e diversificação fora da própria cidade.

Guarde três ideias:
1. Localização central é o argumento principal.
2. Produto compacto conversa com locação e com o primeiro imóvel de filhos que vão estudar ou trabalhar em São Paulo.
3. A Chaincorp mantém um canal oficial de parcerias com coordenadores dedicados à sua região.', 1);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'O portfólio atual', 'leitura', 6, 'Empreendimentos disponíveis para a rede parceira:

· Verya Jardins · Av. Rebouças, 1.444 · pré-lançamento, comercializado via SCP com unidade determinada
· Vici Faria Lima · Pinheiros
· Pina 1875 by 360 Suítes · Perdizes
· Rooftop Perdizes · em aprovação
· Full Jardim São Paulo · entrega prevista para dez/2026
· Blue Park · Jardim São Paulo
· VIP Vila Prudente

Cada lançamento tem kit de WhatsApp, book e pitch na área Kits de abordagem. Antes de apresentar, confira sempre a tabela vigente com o seu coordenador.', 2);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Como funciona a parceria', 'leitura', 6, '1. Sua imobiliária é cadastrada e aprovada no Hub.
2. Cada corretor cria o próprio acesso e é aprovado pelo gestor da imobiliária.
3. Você usa os kits para abordar clientes. Cada envio gera um link rastreável que mostra quando o cliente abriu o material.
4. Com o cliente interessado, você preenche a Ficha Cadastral Oficial dentro do Hub.
5. A Mesa de Crédito da Chaincorp analisa a ficha e você acompanha cada etapa até a minuta.

O coordenador de parcerias da sua região é o seu ponto de contato para treinamentos, eventos e dúvidas comerciais.', 3);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Como usar o Hub no celular', 'material', 5, 'Abra o Hub pelo navegador do celular e salve na tela inicial. As áreas mais usadas no dia a dia são Kits de abordagem, para disparar materiais, e Minhas propostas, para acompanhar a esteira.

Dica: dispare sempre pelo botão verde do kit. Assim o link sai com o seu rastreio e o acesso do cliente aparece no seu painel.', 4);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Qual é o posicionamento principal do portfólio Chaincorp?', '["Habitação popular com subsídio", "Compactos em bairros centrais de SP como oportunidade de investimento", "Casas em condomínio no interior", "Salas comerciais"]'::jsonb, 1, 'O portfólio é de studios e apartamentos compactos em regiões centrais de São Paulo, posicionados como investimento.', 1);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'O que acontece quando você dispara um kit pelo Hub?', '["Nada é registrado", "O cliente recebe um link rastreável e o acesso aparece no seu painel", "A Chaincorp liga para o cliente", "A proposta é enviada automaticamente"]'::jsonb, 1, 'Cada disparo gera um link /p/ exclusivo; quando o cliente abre, o acesso é contado para você.', 2);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Quem analisa a Ficha Cadastral depois que você envia?', '["O gestor da sua imobiliária", "O próprio cliente", "A Mesa de Crédito da Chaincorp", "O cartório"]'::jsonb, 2, 'A ficha entra na esteira da Mesa de Crédito, que avança as etapas até a minuta.', 3);
  end if;
  insert into public.trilhas (titulo, descricao, nivel, ordem, lancamento_id) values ('Nível 2 · Enquadramento HIS-2, HMP e R2V', 'Enquadrar certo é o que evita perder a venda na análise de crédito. Domine as faixas e saiba qual material usar com cada cliente.', 2, 2, null) on conflict ((lower(titulo))) do nothing returning id into t;
  if t is not null then
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'HIS-2 e HMP: as faixas de renda', 'video', 12, 'As unidades enquadradas como HIS-2 atendem famílias com renda de até 6 salários mínimos. As unidades HMP atendem famílias com renda de até 10 salários mínimos.

O enquadramento é uma regra urbanística do imóvel, por isso a renda do comprador precisa ser compatível com a categoria da unidade escolhida. Na dúvida, consulte a Mesa de Crédito antes de apresentar a unidade.

Assista ao vídeo de apoio e anote as perguntas para o próximo encontro com o seu coordenador.', 1);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'R2V e o cliente investidor', 'leitura', 6, 'As unidades R2V não têm trava de renda. São a linha natural para o investidor que busca renda com locação e não se enquadra, ou não quer se enquadrar, nas faixas HIS-2 e HMP.

Pergunte logo no início da conversa: o imóvel é para investir, para morar ou para um filho? A resposta define a linha de produto e o material que você vai enviar.', 2);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Modelo 1 e Modelo 2: qual material enviar', 'leitura', 5, 'Modelo 1 · R2V · investidores. Linguagem de rentabilidade, localização e liquidez.

Modelo 2 · R2V, HMP e HIS-2 · moradores, famílias e locação de longo prazo. Linguagem de qualidade de vida e acesso à cidade.

Escolher o modelo certo antes do primeiro envio aumenta a chance de o cliente abrir e responder.', 3);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Os erros que derrubam uma venda', 'roteiro', 6, '1. Apresentar unidade HIS-2 ou HMP sem confirmar a renda familiar bruta.
2. Considerar renda que o cliente não consegue comprovar.
3. Esquecer de perguntar se é o primeiro imóvel próprio.
4. Enviar o material de moradia para um cliente investidor, e vice-versa.
5. Deixar a documentação para depois da reserva.

Cheque esses cinco pontos antes de preencher a Ficha Cadastral.', 4);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Unidades HIS-2 atendem famílias com renda de até:', '["3 salários mínimos", "6 salários mínimos", "10 salários mínimos", "Sem limite"]'::jsonb, 1, 'HIS-2 vai até 6 salários mínimos de renda familiar.', 1);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Unidades HMP atendem famílias com renda de até:', '["6 salários mínimos", "8 salários mínimos", "10 salários mínimos", "15 salários mínimos"]'::jsonb, 2, 'HMP vai até 10 salários mínimos.', 2);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Qual linha não tem trava de renda?', '["HIS-2", "HMP", "R2V", "Nenhuma"]'::jsonb, 2, 'R2V não tem restrição de renda e é a linha natural do investidor.', 3);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Para um cliente investidor que busca renda com locação, o material indicado é:', '["Modelo 1 (R2V)", "Modelo 2 (moradia)", "Nenhum, só a tabela", "O contrato"]'::jsonb, 0, 'O Modelo 1 fala com o investidor: rentabilidade, localização e liquidez.', 4);
  end if;
  insert into public.trilhas (titulo, descricao, nivel, ordem, lancamento_id) values ('Nível 3 · Abordagem pelo WhatsApp com os kits', 'Como transformar um contato frio em uma conversa, usando as três teses, os links rastreáveis e um follow-up disciplinado.', 3, 3, null) on conflict ((lower(titulo))) do nothing returning id into t;
  if t is not null then
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'As três teses: investimento, moradia e escassez', 'leitura', 7, 'Investimento: para quem já tem patrimônio e quer renda. Fale de localização, demanda por locação e liquidez.

Moradia: para quem vai morar ou colocar um filho em São Paulo. Fale de rotina, transporte e segurança.

Escassez: para quem já demonstrou interesse e está adiando. Fale de prioridade na escolha da unidade e de condições de lançamento.

Cada kit do Hub tem as três versões prontas. Escolha antes de disparar.', 1);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Disparar o kit e ler os acessos', 'material', 5, '1. Em Kits de abordagem, escolha o lançamento e a tese.
2. Baixe a arte 1:1 ou 9:16 se quiser enviar a imagem junto.
3. Toque em Disparar no WhatsApp e escolha o contato.
4. Acompanhe em Meu desempenho quando o cliente abre o link.

Um acesso sem resposta é um sinal de interesse. É a hora do follow-up.', 2);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Follow-up em 48 horas', 'roteiro', 5, 'Se o cliente abriu o link e não respondeu, envie em até 48 horas:

"Oi, [nome]! Vi que você deu uma olhada no material do [empreendimento]. Ficou alguma dúvida que eu possa esclarecer? Posso separar as plantas que fazem mais sentido para o seu objetivo."

Se não abriu, troque a tese e envie um segundo kit uma semana depois.', 3);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Qualificar antes de apresentar', 'roteiro', 6, 'Quatro perguntas que economizam tempo:
1. O imóvel é para investir, morar ou para um filho?
2. Qual a renda familiar bruta aproximada?
3. Já tem imóvel próprio?
4. Pretende pagar com recursos próprios, financiamento ou os dois?

Com as respostas, você escolhe a linha (HIS-2, HMP ou R2V) e o kit certo.', 4);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'O cliente abriu o link mas não respondeu. O melhor próximo passo é:', '["Esperar ele chamar", "Fazer follow-up em até 48 horas", "Enviar o mesmo link de novo no mesmo dia", "Desistir do cliente"]'::jsonb, 1, 'Um acesso sem resposta indica interesse; o follow-up em até 48 horas aproveita o momento.', 1);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Para um cliente que vai colocar o filho para estudar em SP, a tese mais indicada é:', '["Escassez", "Investimento", "Moradia", "Nenhuma"]'::jsonb, 2, 'A tese de moradia fala de rotina, transporte e segurança.', 2);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Por que disparar sempre pelo botão do Hub?', '["Porque é mais bonito", "Porque o link sai rastreado e o acesso aparece no seu painel", "Porque o WhatsApp exige", "Não faz diferença"]'::jsonb, 1, 'Sem o link do Hub não há como medir o interesse do cliente.', 3);
  end if;
  insert into public.trilhas (titulo, descricao, nivel, ordem, lancamento_id) values ('Nível 4 · Da ficha à minuta', 'O caminho da proposta dentro da Chaincorp, a documentação obrigatória e como acompanhar cada etapa.', 4, 4, null) on conflict ((lower(titulo))) do nothing returning id into t;
  if t is not null then
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'A Ficha Cadastral Oficial', 'material', 6, 'A ficha tem três etapas no Hub:
1. Enquadramento: papel na compra (adquirente, co-adquirente ou fiador), objetivo e primeiro imóvel.
2. Dados pessoais e financeiros: nome completo sem abreviações, CPF, celular e renda bruta mensal.
3. Checklist documental.

Nome abreviado ou CPF com erro devolvem a ficha. Confira com o documento em mãos.', 1);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Checklist documental', 'roteiro', 4, 'Obrigatórios para a ficha seguir para análise:
· Cópia de RG e CPF
· Comprovante de residência atualizado
· Comprovante de rendimentos ou holerites
· Comprovante de TED ou Pix do sinal

Peça tudo ao cliente de uma vez, com uma mensagem só.', 2);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Acompanhando a esteira', 'leitura', 4, 'Etapas: Fichas Recebidas, Em Análise Documental, Aprovado PV, Aprovado Crédito e Apto para Minuta.

Você acompanha em Minhas propostas, com atualização em tempo real. Se a ficha voltar uma etapa, fale com o seu coordenador para entender a pendência.', 3);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Qual destes documentos é obrigatório na ficha?', '["Certidão de casamento", "Comprovante de TED ou Pix do sinal", "Declaração de imposto de renda dos últimos 5 anos", "Nenhum"]'::jsonb, 1, 'O comprovante do sinal faz parte do checklist obrigatório.', 1);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Qual é a última etapa da esteira?', '["Fichas Recebidas", "Aprovado PV", "Aprovado Crédito", "Apto para Minuta"]'::jsonb, 3, 'Apto para Minuta encerra a esteira de análise.', 2);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'O nome do proponente na ficha deve ser:', '["Abreviado para caber", "Completo, sem abreviações", "Só o primeiro nome", "O apelido"]'::jsonb, 1, 'Nome abreviado devolve a ficha.', 3);
  end if;
  insert into public.trilhas (titulo, descricao, nivel, ordem, lancamento_id) values ('Produto · Verya Jardins', 'Tudo o que você precisa para apresentar o Verya Jardins, na Av. Rebouças, com segurança.', 5, 5, 'verya') on conflict ((lower(titulo))) do nothing returning id into t;
  if t is not null then
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'O produto', 'leitura', 6, 'Studios da MF7 com a Chaincorp na Av. Rebouças, 1.444, nos Jardins, em fase de pré-lançamento. A comunicação é segmentada por enquadramento: R2V para investidores (Modelo 1) e R2V, HMP e HIS-2 para moradia e locação de longo prazo (Modelo 2).

Use o kit do Verya na área Kits de abordagem e o book completo no Google Drive.', 1);
    insert into public.aulas (trilha_id, titulo, tipo, duracao_min, conteudo, ordem) values (t, 'Participação via SCP: como explicar', 'roteiro', 8, 'O Verya é comercializado por participação em uma SCP (Sociedade em Conta de Participação) com unidade determinada.

Como apresentar:
1. Explique que o investidor participa de uma sociedade criada para o empreendimento, com a unidade definida desde o início.
2. Mostre a documentação oficial do produto, disponível no book.
3. Para perguntas jurídicas ou tributárias específicas, envolva o seu coordenador. Não improvise respostas técnicas.

Revise este conteúdo com o material oficial da Chaincorp antes de usar com clientes.', 2);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Onde fica o Verya Jardins?', '["Av. Paulista", "Av. Rebouças, 1.444", "Rua Apinajés", "Vila Prudente"]'::jsonb, 1, 'O Verya fica na Av. Rebouças, 1.444, nos Jardins.', 1);
    insert into public.quiz_perguntas (trilha_id, enunciado, opcoes, correta, explicacao, ordem) values (t, 'Diante de uma pergunta jurídica específica sobre a SCP, o corretor deve:', '["Responder do jeito que achar", "Envolver o coordenador e usar a documentação oficial", "Dizer que não importa", "Encerrar a conversa"]'::jsonb, 1, 'Questões técnicas são respondidas com a documentação oficial e o apoio do coordenador.', 2);
  end if;
end $$;

insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('abordagem', 'Primeira mensagem para cliente investidor', 'Oi, [nome]! Tudo bem? Separei uma oportunidade em São Paulo que tem tudo a ver com o seu perfil de investimento: compactos em bairro central, com demanda forte de locação. Posso te mandar o material?', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('abordagem', 'Primeira mensagem para pais de estudantes', 'Oi, [nome]! Muitas famílias daqui estão comprando um compacto em São Paulo para os filhos que vão estudar ou trabalhar lá, e depois alugam. Quer ver as opções perto de metrô e faculdades?', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('qualificacao', 'Quatro perguntas de qualificação', '1. É para investir, morar ou para um filho?
2. Qual a renda familiar bruta aproximada?
3. Já tem imóvel próprio?
4. Recursos próprios, financiamento ou os dois?', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('apresentacao', 'Abertura da apresentação por vídeo', 'Antes de te mostrar as plantas, deixa eu te contar em dois minutos por que essa região é tão procurada para locação. Depois a gente escolhe juntos as unidades que fazem sentido para você.', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('objecao', '"Por que comprar em São Paulo morando em Ribeirão?"', 'Faz todo sentido perguntar. Quem investe aqui costuma buscar duas coisas em São Paulo: demanda de locação maior e diversificação do patrimônio fora da própria cidade. O imóvel é administrado de longe e a localização central é o que sustenta a procura.', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('objecao', '"SCP é seguro?"', 'Boa pergunta, e é importante entender bem. No Verya a participação é numa SCP com unidade determinada desde o início. Te envio a documentação oficial do produto e, se quiser, marcamos uma conversa com o coordenador da Chaincorp para tirar as dúvidas técnicas.', 'verya', 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('objecao', '"Vou comprar direto com a construtora"', 'Pode ficar tranquilo: o atendimento pela imobiliária parceira tem as mesmas condições da Chaincorp, e eu acompanho todo o processo, da ficha à minuta. Seu cadastro fica registrado comigo para você ter um ponto de contato só.', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('objecao', '"O studio é pequeno demais"', 'Para morar, entendo a sensação. Para locação, é justamente o tamanho mais procurado por quem trabalha e estuda na região: aluguel acessível e localização privilegiada. Quer ver uma planta decorada para ter noção do espaço?', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('fechamento', 'Pedido de documentos em uma mensagem', 'Perfeito, [nome]! Para garantir a sua unidade preciso de: RG e CPF, comprovante de residência atualizado, comprovante de renda e o comprovante do sinal. Pode me mandar por aqui mesmo que eu já preencho a ficha.', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
insert into public.abordagens (etapa, titulo, texto, lancamento_id, autor_nome) values ('pos_venda', 'Pedido de indicação depois da assinatura', '[nome], parabéns pela aquisição! Se alguém da sua família ou do seu círculo também estiver pensando em investir em São Paulo, vou ficar feliz em atender com o mesmo cuidado.', null, 'Chaincorp') on conflict ((lower(titulo))) do nothing;
