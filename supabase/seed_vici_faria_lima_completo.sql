-- Atualiza Vici Faria Lima (av_launches) com dados completos do book
-- (VICI RESIDENCE BOOK.pdf) e das plantas de implantação (VICI
-- IMPLANTAÇÃO/*.pdf). Fotos e book já foram enviados ao Storage antes
-- de rodar isto.
--
-- Diferente do Pina 1875, aqui não veio tabela de vendas com preço por
-- unidade — as 340 unidades residenciais são todas do mesmo tipo
-- (studio 25m², finais 02/04/06/08/10 padrão do 8º ao 23º pavimento),
-- então em vez de uma unidade por linha, uma única unidade
-- "representativa" cobre o residencial, e o comercial (lojas + lajes)
-- entra à parte.

update av_launches set
  address = 'Rua dos Cariris, 422 — Pinheiros, São Paulo/SP (a 4 min a pé da Estação Faria Lima)',
  summary = 'Chaincorp & MF7 · Cariris Incorporadora SPE LTDA · arquitetura Nura, paisagismo Neusa Nakata, interiores DP Barros · terreno 2.230m² · torre única: subsolo + térreo com lojas + lajes corporativas (1º-5º pav.) + lazer residencial (1º e 6º pav.) + 17 pavimentos residenciais tipo + lazer no rooftop (24º pav.) · 340 studios de 25m² · unidades HIS-2 · incorporação registrada (matrícula 188.209, 23/04/2026) · intermediação MF7 Vendas',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/Mf7_Cariris_Pavimento_Tipo_HR.jpg',
  book_urls = array['https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/books/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima-book.pdf'],
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Fachada_A_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Fachada_B_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Acesso_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Voo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Praca_Terreo_Comercial_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Lobby_Residencial_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Lobby_Comercial_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Piscina_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Sauna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Churrasqueira_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Churrasqueira_Cobertura_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Lounge_Churrasqueira_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Terraco_Lounge_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Festas_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Gourmet_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Bar_Jogos_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Fitness_E_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Fitness_F_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Esp_Leitura_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Esp_Zen_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Podcast_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Meet_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Coworking_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Lavanderia_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Pet_Place_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Bicicletario_Residencial_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Bicicletario_Comercial_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Living_Tipo_A_Executivo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Living_Tipo_A_Influencer_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Living_Tipo_A_Mulher_Moderna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Living_Tipo_A_Universitaria_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Planta_Tipo_Studio_Executivo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Planta_Tipo_Studio_Influencer_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Planta_Tipo_Studio_Mulher_Moderna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Planta_Tipo_Studio_Universitaria_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_Implantacao_Terreo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_1_Pavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_6o_pavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vici-faria-lima/MF7_Cariris_24o_pavimento_HR.jpg'
  ]
where id = 'b4043aef-ab6b-4074-9f8c-ada2ba13f0f8';

-- Residencial é uniforme (340 studios de 25m², finais 02/04/06/08/10
-- padrão do 8º ao 23º pav.) — uma unidade representativa cobre o
-- residencial; comercial (lojas + lajes) entra à parte, sem preço
-- (não veio tabela de vendas neste material, diferente do Pina 1875).
delete from av_launch_units where launch_id = 'b4043aef-ab6b-4074-9f8c-ada2ba13f0f8';

insert into av_launch_units (launch_id, name, position) values
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Studio residencial · 25m² (340 unidades, finais 02/04/06/08/10, 8º ao 23º pav.)', 1),
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Loja 01 · fachada ativa · térreo', 2),
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Loja 02 · térreo', 3),
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Loja 04 · térreo', 4),
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Laje corporativa · 1º pavimento', 5),
('b4043aef-ab6b-4074-9f8c-ada2ba13f0f8', 'Laje corporativa · 2º ao 5º pavimento', 6);

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador.
update pc_empreendimentos
set av_launch_id = 'b4043aef-ab6b-4074-9f8c-ada2ba13f0f8'
where id = 'e8fd495c-6b5f-4042-a25c-1531bd8e2832';
