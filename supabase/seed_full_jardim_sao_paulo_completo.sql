-- Atualiza o lançamento "Fuul Jardim São Paulo" (nome correto: Full
-- Jardim São Paulo — corrige o typo) com dados completos do book e a
-- tabela de vendas real (202609 FULL JARDIM SÃO PAULO TABELA.PDF,
-- impressa 01/09/2026). Fotos/book já enviados ao Storage.

update av_launches set
  name = 'Full Jardim São Paulo',
  address = 'Rua Júlia Lopes de Almeida, 99 — Jardim São Paulo, São Paulo/SP',
  summary = 'Chaincorp · Tatiane Hernandes Arquitetura (áreas comuns: Flying Studio) · torre única, 16 pavimentos · 82 unidades (studios 16-21m², 2 dorms 31-63m² incl. garden) · lazer no rooftop (14º/15º pav.) · projeto aprovado (Alvará 26014-23-SP-ALV), comercialização após Registro de Incorporação',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_40m2_tipo.jpg',
  book_urls = array['https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/books/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo-book.pdf'],
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Fachada_1.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Fachada_2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Portaria.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/HALL.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Garagem.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Rooftop.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Piscina_Rooftop.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Sauna.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Descanso.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Fitness.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Lounge.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Salao_de_Festas.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Coworking.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Coworking_2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Sala_de_reunioes.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Delivery.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Pet_Care.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Lavanderia.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Studio_16m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Studio_16m2_2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/IMAGENS/Studio_21m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_Studio_21m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Studio_21m2_closet.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_40m2_opcao_1.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_40m2_opcao_2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_03_-_2_dorm_40m2_-_opcao_2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_04_-_2_dorm_45m2_-_garden.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_05_-_2_dorm_55m2_-_garden.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/full-jardim-sao-paulo/resized/PLANTAS/Planta_06_-_2_dorm_63m2_-_garden.jpg'
  ]
where id = 'ed43059e-939f-4d8e-91e5-ed7cac7a54cd';

-- As 4 unidades já cadastradas dão lugar às 15 unidades reais da
-- tabela de vendas viva da Chaincorp (impressa 01/09/2026), com
-- metragem e preço total exatos. "Em negociação" (sem equivalente no
-- enum de status) entra como reservada, mesmo racional de "não
-- disponível pra um novo comprador agora".
delete from av_launch_units where launch_id = 'ed43059e-939f-4d8e-91e5-ed7cac7a54cd';

insert into av_launch_units (launch_id, name, position, table_value, status) values
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0303 · 45,19m² priv. (59,31m² total)', 1, 465050.29, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0305 · 73,61m² priv. (118,47m² total), 1 vaga', 2, 757520.51, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0402 · 39,89m² priv. (55,40m² total)', 3, 478839.56, 'reservada'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0501 · 39,34m² priv. (54,63m² total)', 4, 398789.58, 'reservada'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0502 · 39,89m² priv. (55,40m² total)', 5, 478839.56, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0602 · 39,89m² priv. (55,40m² total)', 6, 478839.56, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0701 · 39,34m² priv. (54,63m² total)', 7, 467949.30, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U0704 · 39,34m² priv. (54,63m² total)', 8, 467949.30, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1005 · 39,89m² priv. (55,40m² total)', 9, 487974.37, 'reservada'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1104 · 39,34m² priv. (79,92m² total)', 10, 485730.98, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1105 · 39,89m² priv. (80,69m² total), 1 vaga', 11, 533130.65, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1301 · 35,98m² priv. (50,05m² total)', 12, 444245.06, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1302 · 36,54m² priv. (50,83m² total)', 13, 472060.26, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1304 · 35,98m² priv. (50,05m² total)', 14, 444245.06, 'disponivel'),
('ed43059e-939f-4d8e-91e5-ed7cac7a54cd', 'U1305 · 36,54m² priv. (50,83m² total)', 15, 451159.38, 'disponivel');

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador.
update pc_empreendimentos
set nome = 'Full Jardim São Paulo', av_launch_id = 'ed43059e-939f-4d8e-91e5-ed7cac7a54cd'
where id = 'fe00fed5-3ef4-46a0-91db-d5ae43446e04';
