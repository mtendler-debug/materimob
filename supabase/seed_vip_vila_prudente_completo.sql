-- Atualiza VIP Vila Prudente (av_launches) com dados completos do book
-- e a tabela de vendas real (202609 VIP VILA PRUDENTE TABELA.PDF,
-- impressa 01/09/2026). Este material não trouxe uma pasta de fotos
-- separada — as imagens abaixo foram renderizadas direto das páginas do
-- próprio book (mesmas perspectivas ilustradas que estariam numa pasta
-- de imagens), já enviadas ao Storage.

update av_launches set
  address = 'Rua Américo Vespucci, 958 — Vila Prudente, São Paulo/SP',
  summary = 'Chaincorp Incorporadora · construção Viccon · Ilha Arquitetura (projeto e interiores) · torre única, 17 pavimentos · 96 unidades (29 aptos 1 dorm 25-29m², 59 aptos 2 dorms 36-40m², 7 lofts duplex 1 dorm 33-35m²) + loja 100,36m² · programa Minha Casa Minha Vida · projeto aprovado (Alvará 36.383-23-SP-ALV, 23/08/2024)',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/implantacao_terreo.jpg',
  book_urls = array['https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/books/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente-book.pdf'],
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/foto_aerea_local.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/portaria.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/hall.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/piscina.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/sauna_panoramica.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/espaco_gourmet.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/cine_open_air.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/churrasqueira.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/fireplace.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/game_pub.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/fitness.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/brinquedoteca.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/playground.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/pet_place.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/espaco_delivery_mini_market.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/bicicletario.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/coworking.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/lavanderia.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo3_40m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo1_39m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo5_37m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo2_36m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/varanda_tipo4_duplex_33m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo8_29m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/living_tipo6_7_25m2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/implantacao_14_pavimento.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/implantacao_15_pavimento.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/vip-vila-prudente/implantacao_rooftop.jpg'
  ]
where id = '47f0637e-3411-4f56-aa69-619fce0ef35d';

-- 33 unidades reais da tabela de vendas viva (impressa 01/09/2026), com
-- metragem e preço total exatos. "Em negociação" (sem equivalente no
-- enum de status) entra como reservada.
delete from av_launch_units where launch_id = '47f0637e-3411-4f56-aa69-619fce0ef35d';

insert into av_launch_units (launch_id, name, position, table_value, status) values
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-065 · 37,10m²', 1, 352322.0, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-075 · 37,10m²', 2, 358730.66, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-082 · 36,65m²', 3, 404416.62, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-091 · 39,36m²', 4, 397730.83, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-092 · 37,59m²', 5, 352322.8, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-095 · 37,10m²', 6, 430972.15, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-102 · 36,65m²', 7, 410968.91, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-105 · 37,10m²', 8, 435833.73, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-112 · 37,59m²', 9, 363002.5, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-115 · 37,10m²', 10, 440761.36, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-121 · 39,54m²', 11, 432907.25, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-122 · 36,65m²', 12, 417621.99, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-125 · 37,10m²', 13, 445733.5, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-131 · 39,36m²', 14, 436400.06, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-132 · 37,59m²', 15, 420981.69, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-135 · 37,10m²', 16, 449261.34, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-146 · 25,42m²', 17, 320389.87, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'L-1 · 100,36m² (loja)', 18, 893182.92, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-001 · 59,85m²', 19, 427181.17, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-002 · 62,86m²', 20, 483434.26, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-012 · 37,59m²', 21, 414784.98, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-013 · 39,74m²', 22, 431872.86, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-014 · 34,16m²', 23, 385404.05, 'reservada'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-015 · 37,10m²', 24, 426155.09, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-016 · 25,42m²', 25, 304505.93, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-017 · 25,42m²', 26, 310201.53, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-018 · 29,03m²', 27, 363911.95, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-021 · 36,90m²', 28, 371175.99, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-022 · 37,59m²', 29, 414784.98, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-025 · 37,10m²', 30, 426155.09, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-028 · 29,99m²', 31, 375948.94, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-142 · 36,98m²', 32, 463577.95, 'disponivel'),
('47f0637e-3411-4f56-aa69-619fce0ef35d', 'U-152 · 36,98m²', 33, 463577.95, 'disponivel');

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador.
update pc_empreendimentos
set av_launch_id = '47f0637e-3411-4f56-aa69-619fce0ef35d'
where id = '63018372-389b-482d-b60d-4e793017612c';
