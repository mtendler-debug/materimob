-- Atualiza Rooftop Perdizes (av_launches) com dados completos extraídos
-- do book real da Chaincorp (ROOFTOP BOOK.pdf) e fotos/plantas do
-- material enviado pelo Marcos em 2026-09-12. Fotos/planta/book já
-- foram enviados ao Storage (buckets imoveis/books) antes de rodar isto.

update av_launches set
  address = 'Rua Ministro Gastão Mesquita, 351 (esquina com Rua Iperoig) — Perdizes, São Paulo/SP',
  summary = 'Chaincorp · torre única, 9 pavimentos (térreo + lazer no rooftop) · 96 unidades residenciais (1 a 3 dorms, 24-64m²) + 2 lojas · projeto arquitetônico Samburá Arquitetos · projeto em aprovação, material preliminar — breve lançamento, 2º semestre 2026',
  floor_plan_url = 'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Implantacao_Pavimento_Tipo_HR.jpg',
  book_urls = array['https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/books/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes-book.pdf'],
  photo_urls = array[
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_01_A_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_02_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_C_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_Lojas_A_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Piscina_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Piscina_C_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Churrasqueira_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Voo_Lazer_HR-4.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Hall_Opc01_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Salao_De_Festas_Ang_A_HR-1.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Salao_De_Festas_Ang_B_HR-2.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Coworking_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Mini_Market_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Academia_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Sauna_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Brinquedoteca_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Game_Pub_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_PetCare_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Bicicletario_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Lavanderia_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Locker_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Implantacao_Subsolo_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Implantacao_Terreo_HR-1.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Implantacao_1_Pavimento_HR.jpg',
    'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Implantacao_Cobertura_HR.jpg'
  ]
where id = '531083ce-47e6-45cb-8cdb-7df96e53f444';

-- As 6 unidades genéricas (placeholder) dão lugar às 7 tipologias reais
-- ("Final XX", nomenclatura da planta) + 2 lojas, com fotos próprias.
delete from av_launch_units where launch_id = '531083ce-47e6-45cb-8cdb-7df96e53f444';

insert into av_launch_units (launch_id, name, position, photo_urls) values
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 02 · 24m² · 1 dormitório', 1, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_02_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Living_Tipo_02_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 04 · 59m² · 3 dormitórios (1 suíte), 1 vaga — planta flexível (opção 2 dorms com living ampliado)', 2, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_04_A_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_04_B_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Living_Tipo_04_A_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Living_Tipo_04_B_HR-1.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 05 · 26m² · 1 dormitório', 3, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_05_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 07 · 24m² · 1 dormitório', 4, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_07_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Living_Tipo_07_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 08 · 27m² · 1 dormitório', 5, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_08_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 09 · 25m² · 1 dormitório', 6, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_09_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Final 10 · 52m² · 2 suítes, 1 vaga, lavabo', 7, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Plantas/Chaincorp_Iperoig_Tipo_10_HR.jpg',
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Internas/Chaincorp_Iperoig_Living_Tipo_10_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Loja térreo · 64m²', 8, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_Lojas_A_HR.jpg'
]),
('531083ce-47e6-45cb-8cdb-7df96e53f444', 'Loja térreo · 85m²', 9, array[
  'https://izslgjvxbthjxabtepti.supabase.co/storage/v1/object/public/imoveis/235daabd-e714-4b49-bbdb-c74ae37c10b9/rooftop-perdizes/Externas/Chaincorp_Iperoig_Cam_Fachada_Lojas_A_HR.jpg'
]);

-- Liga o empreendimento de Parcerias ao lançamento do Avaliador — ponte
-- que já existia no schema (av_launch_id) mas ainda não tinha sido
-- usada pra este empreendimento.
update pc_empreendimentos
set av_launch_id = '531083ce-47e6-45cb-8cdb-7df96e53f444'
where id = '312d5b8b-d69f-43c8-88a1-a2e778cecca7';
