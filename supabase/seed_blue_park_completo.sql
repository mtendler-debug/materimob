-- Atualiza Blue Park Jardim São Paulo (av_launches) com dados completos
-- do book e a tabela de vendas real (202609 BLUE PARK TABELA.PDF,
-- impressa 01/09/2026). Fotos/book já enviados ao Storage.

update av_launches set
  address = 'Rua Parque Domingos Luís, 77 — esquina com Rua Joaquim Norberto — Jardim São Paulo, São Paulo/SP',
  summary = 'Chaincorp Empreendimentos e Participações · Tatiane Hernandes Arquitetura (áreas comuns: Flying Studio) · construção GNG Engenharia · torre única, 15 pavimentos · 72 unidades, 3 dorms de 39 a 63m² (finais 01 a 06) · lazer no rooftop (15º pav.) · em frente ao Parque Domingos Luís, 2 min do Metrô Jardim São Paulo · projeto aprovado (Alvará 33049-23-SP-ALV), comercialização após Registro de Incorporação',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_4oao14o_Pavimento_HR.jpg',
  book_urls = array['https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/books/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park-book.pdf'],
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Fachada_Diurna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Fachada_Noturna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Portaria_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Piscina_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Skyview_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_FirePlace_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Lounge_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/Chaincorp_Joaquim_Norberto_Playground_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_3o_Pavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_15o_Pavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_01_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_02_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_02_Ampliada_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_03_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_03_DECORADO_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_04_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_04_3Dorm_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_05_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/blue-park/BLUE_PARK_Tipo_Final_06_HR.jpg'
  ]
where id = 'afb04404-1538-4201-b258-ab60ffa03093';

-- 7 unidades reais da tabela de vendas viva (impressa 01/09/2026), com
-- metragem e preço total exatos.
delete from av_launch_units where launch_id = 'afb04404-1538-4201-b258-ab60ffa03093';

insert into av_launch_units (launch_id, name, position, table_value, status) values
('afb04404-1538-4201-b258-ab60ffa03093', 'U-013 · 61,26m² priv. (88,69m² total), 1 vaga', 1, 681394.98, 'disponivel'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-014 · 74,24m² priv. (102,12m² total), 1 vaga', 2, 780188.16, 'disponivel'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-023 · 53,14m² priv. (80,39m² total), 1 vaga', 3, 654897.36, 'disponivel'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-024 · 56,17m² priv. (83,66m² total), 1 vaga', 4, 665389.82, 'disponivel'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-101 · 39,32m² priv. (54,48m² total)', 5, 590665.04, 'reservada'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-103 · 53,14m² priv. (96,95m² total), 1 vaga', 6, 810756.98, 'reservada'),
('afb04404-1538-4201-b258-ab60ffa03093', 'U-123 · 53,14m² priv. (96,95m² total), 1 vaga', 7, 860602.30, 'reservada');

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador.
update pc_empreendimentos
set av_launch_id = 'afb04404-1538-4201-b258-ab60ffa03093'
where id = 'a05f985c-81ca-4be9-8945-62dca86df587';
