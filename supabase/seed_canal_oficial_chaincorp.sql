insert into pc_config (owner_id, canal_oficial_notas)
select id, $note$Canal oficial de parcerias da Chaincorp: linktr.ee/chaincorpparcerias

A Chaincorp já opera um programa estruturado de parcerias — usar essa infraestrutura em vez de montar material do zero. Passo a passo por imobiliária priorizada:
1. Levar a Ficha Cadastral para o sócio/administrador ou gerente comercial preencher.
2. Compartilhar o Tabelão Chaincorp e o Book Institucional.
3. Registrar no Portal Parcerias (via Orulo) para acesso a estoque e condições em tempo real.
4. Alinhar com o Arthur (Gerente de Parcerias) sobre comissionamento, prazos e follow-up de leads.
5. Se possível, agendar visita ao Espaço Chaincorp (showroom) mais próximo do perfil do empreendimento de interesse.

Recursos:
- Tabelão Chaincorp: https://drive.google.com/drive/folders/1hS0Jcb28opmolW4Ij-ZDCB39f1IDwzoq
- Book Institucional: https://drive.google.com/file/d/10xujTHTy2MGAOLvMY6btstnHdudnPULj/view
- Ficha Cadastral: dentro da pasta do Tabelão (mesmo link acima)
- Portal Parcerias (Orulo): https://www.orulo.com.br/buildings?developer_id=6042&developer=Chaincorp
- Arthur, Gerente de Parcerias (WhatsApp): https://wa.me/5511977846075
- PINA1875 by 360 Suítes: https://drive.google.com/drive/folders/1GIFBVQeD1-vx2xYSrmNNU7B66iDyfISF
- ROOFTOP Perdizes: https://drive.google.com/drive/folders/1smj0FJGWIk8zxZcFLHweom9HPVbTB0QP
- VICI Faria Lima: https://drive.google.com/drive/folders/1CcaH6jTb8UfO0K3WcjiylKUBHsI1wfYF
- VIP Vila Prudente: https://drive.google.com/drive/folders/1YNmEjM0M-uqH56JhAkFSTarIyxX7Te9m
- BLUE PARK (inclui Cartilha do Corretor): https://drive.google.com/drive/folders/1LO0fO5gtQuwwOEf8STmuYeyUFXMKQOF2
- FULL Jd. São Paulo: https://drive.google.com/drive/folders/1usuzLVUG9Tl-_q49nT_aGI2G83PwxDt_
- Espaço Chaincorp ZL: Rua Correia Barros, Parque da Vila Prudente, São Paulo/SP
- Espaço Chaincorp ZN: Av. Nova Cantareira, 396, Tucuruvi, São Paulo/SP

As pastas do Google Drive provavelmente exigem solicitação de acesso — normal para material restrito a parceiros. O WhatsApp do Arthur é o caminho mais rápido pra liberar acesso e tirar dúvidas.$note$
from auth.users where email = 'mtendler@gmail.com'
on conflict (owner_id) do update set canal_oficial_notas = excluded.canal_oficial_notas;
