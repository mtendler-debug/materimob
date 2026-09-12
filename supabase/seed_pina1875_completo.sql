-- Atualiza Pina 1875 by 360 Suítes (av_launches) com dados completos do
-- book (PINA1875 Book mai 26.pdf) e a tabela de vendas real (202609 PINA
-- 1875 BY 360 SUITES TABELA.PDF, impressa em 01/09/2026). Fotos/plantas
-- já foram enviadas ao Storage (bucket imoveis) antes de rodar isto.
--
-- O book em PDF (115MB) excede o limite de 20MB do bucket "books" e não
-- foi hospedado — as fotos e a tabela de unidades abaixo já cobrem o
-- conteúdo relevante.

update av_launches set
  address = 'Rua Apinajés, 1875 — Perdizes, São Paulo/SP (próximo ao Metrô Vila Madalena)',
  summary = 'Chaincorp & 360º Suítes · Ilha Arquitetura · torre única, 9 pavimentos · 72 unidades (studios 18-23m², studio garden 20-35m², 1 dorm 26-40m², 2 dorms 37-49m²) + 1 loja · concebido para locação short/mid/long stay, gestão 360 Suítes (maior conta do Airbnb da América Latina) · incorporação registrada (matrícula 130.152, 08/04/26) · unidades HIS-2',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Planta_2oPavimento_HR.jpg',
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Fachada_Diurna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Fachada_Noturna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Deck_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Casa_Campo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Bicicletario_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Externas/Chaincorp_Apinajes_Pet_Place_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Hall_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Coliving_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinjaes_Coworking_Ang_A_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Fitness_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Lavanderia_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Mini_Mercado_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Pet_Care_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Casa_de_Campo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Casa_de_Campo_Ang_C_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Garden_Studio_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Studio_Tipo_06_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Studio_Tipo_07_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Living_Apto_Final_01_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Living_Apto_Final_02_Ampliado_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Internas/Chaincorp_Apinajes_Living_Apto_Final_08_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Planta_3oPavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_implantacao_Cobertura_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_implantacao_Subssolo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_implantacao_Terreo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_01_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_02_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_03_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_04_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_05_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_06_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_07_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_08_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Final_10_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/pina1875/Plantas/Chaincorp_Apinajes_Tipo_Garden_HR.jpg'
  ]
where id = 'b238c9a2-033f-4567-a930-fd9e5af6ff7f';

-- As 4 unidades genéricas (placeholder por tipologia) dão lugar às 26
-- unidades reais da tabela de vendas viva da Chaincorp (impressa
-- 01/09/2026), com metragem e preço total exatos. As plantas por
-- tipologia ("Final XX") ficam nas fotos gerais do lançamento acima —
-- o final de cada código de unidade (ex.: U301 → final 01) indica a
-- planta correspondente, mas o mapeamento de foto por unidade não foi
-- feito 1:1 aqui porque a mesma tipologia varia de metragem entre
-- andares nesta tabela real.
delete from av_launch_units where launch_id = 'b238c9a2-033f-4567-a930-fd9e5af6ff7f';

insert into av_launch_units (launch_id, name, position, table_value, status) values
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'Loja · 68,81m²', 1, 1101960.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'T03 · 23,04m²', 2, 369640.0, 'reservada'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'T07 · 21,07m²', 3, 338120.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U03 · 32,55m²', 4, 521800.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U04 · 28,16m²', 5, 451560.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U05 · 29,07m²', 6, 466120.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U06 · 33,59m²', 7, 538440.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U07 · 29,85m²', 8, 478600.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U09 · 26,33m²', 9, 422280.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U10 · 30,72m²', 10, 492520.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U102 · 50,03m²', 11, 801480.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U108 · 36,98m²', 12, 592680.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U109 · 31,68m²', 13, 507880.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U110 · 31,49m²', 14, 504840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U201 · 25,82m²', 15, 414120.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U202 · 35,46m²', 16, 568360.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U209 · 31,64m²', 17, 507192.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U210 · 31,49m²', 18, 504840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U301 · 41,28m²', 19, 661480.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U302 · 29,49m²', 20, 472840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U308 · 53,02m²', 21, 849320.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U402 · 29,49m²', 22, 472840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U502 · 29,49m²', 23, 472840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U507 · 18,09m²', 24, 290440.0, 'reservada'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U602 · 29,49m²', 25, 472840.0, 'disponivel'),
('b238c9a2-033f-4567-a930-fd9e5af6ff7f', 'U606 · 17,95m²', 26, 288200.0, 'reservada');

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador.
update pc_empreendimentos
set av_launch_id = 'b238c9a2-033f-4567-a930-fd9e5af6ff7f'
where id = 'e10672af-91e5-4b38-ab3c-ea241749233b';
