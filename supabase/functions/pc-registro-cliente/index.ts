// Edge Function que registra um cliente no módulo Parcerias — usada tanto
// pelo registro interno (Marcos logado, manda um JWT do Supabase) quanto
// pelo formulário público por token (sem login, manda o token da
// parceira no corpo). As duas entradas convergem aqui pra não duplicar
// checagem de conflito, elegibilidade e cálculo de validade em dois
// lugares que puderiam desalinhar com o tempo.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const RESTRITOS = ["HIS-1", "HIS-2", "HMP"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const {
    token,
    parceira_id,
    corretor_id,
    corretor_novo,
    empreendimento_id,
    cliente_nome,
    cliente_telefone,
    cliente_email,
    cliente_cpf_hash,
    cliente_cpf_final,
    cidade_origem,
    uf_origem,
    perfil,
    interesse_unidades,
    faixa_renda_declarada,
    possui_imovel_declarado,
    observacoes,
  } = body as Record<string, unknown>;

  if (!parceira_id || !cliente_nome || !cliente_telefone) {
    return json({ error: "campos obrigatórios: parceira_id, cliente_nome, cliente_telefone" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: parceira } = await admin
    .from("pc_parceiras")
    .select("id, owner_id, nome_fantasia, status_funil, token_registro, token_ativo")
    .eq("id", parceira_id)
    .maybeSingle();
  if (!parceira) return json({ error: "parceira não encontrada" }, 404);

  let ownerId: string;
  let origemRegistro: "painel" | "formulario_publico";

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const jwt = authHeader.slice("Bearer ".length);
    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData?.user || userData.user.id !== parceira.owner_id) {
      return json({ error: "sem permissão para registrar por esta parceira" }, 403);
    }
    ownerId = userData.user.id;
    origemRegistro = "painel";
  } else {
    if (!token || token !== parceira.token_registro) return json({ error: "link inválido" }, 404);
    if (!parceira.token_ativo || parceira.status_funil !== "parceria_firmada") {
      return json({ error: "link não está mais ativo" }, 403);
    }
    const { count } = await admin
      .from("pc_registros_cliente")
      .select("id", { count: "exact", head: true })
      .eq("parceira_id", parceira_id)
      .eq("origem_registro", "formulario_publico")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const { data: cfg } = await admin
      .from("pc_config")
      .select("limite_registros_por_hora_token")
      .eq("owner_id", parceira.owner_id)
      .maybeSingle();
    const limite = cfg?.limite_registros_por_hora_token ?? 30;
    if ((count ?? 0) >= limite) return json({ error: "muitos registros nesta hora, tente novamente daqui a pouco" }, 429);
    ownerId = parceira.owner_id;
    origemRegistro = "formulario_publico";
  }

  let finalCorretorId = (corretor_id as string) || null;
  if (!finalCorretorId && corretor_novo && typeof corretor_novo === "object") {
    const cn = corretor_novo as Record<string, unknown>;
    const { data: novo, error: corretorError } = await admin
      .from("pc_parceira_corretores")
      .insert({
        owner_id: ownerId,
        parceira_id,
        nome: cn.nome,
        creci: cn.creci ?? null,
        telefone: cn.telefone ?? null,
      })
      .select("id")
      .single();
    if (corretorError) return json({ error: "erro ao cadastrar corretor" }, 500);
    finalCorretorId = novo.id;
  }

  const { data: cfg2 } = await admin
    .from("pc_config")
    .select("validade_registro_dias, salario_minimo_vigente")
    .eq("owner_id", ownerId)
    .maybeSingle();
  const validadeDias = cfg2?.validade_registro_dias ?? 90;
  const registradoEm = new Date();
  const validoAte = new Date(registradoEm.getTime() + validadeDias * 24 * 60 * 60 * 1000);

  const { data: conflitoId } = await admin.rpc("pc_checar_conflito", {
    p_owner_id: ownerId,
    p_telefone: cliente_telefone,
    p_cpf_hash: cliente_cpf_hash ?? null,
    p_empreendimento_id: empreendimento_id ?? null,
    p_excluir_registro_id: null,
  });

  let elegibilidadeAlerta: string | null = null;
  const unidadeIds = Array.isArray(interesse_unidades) ? interesse_unidades : [];
  if (unidadeIds.length > 0) {
    const { data: unidades } = await admin
      .from("pc_unidades")
      .select("id, enquadramento")
      .in("id", unidadeIds);
    const enquadramentosRestritos = [
      ...new Set((unidades ?? []).map((u) => u.enquadramento).filter((e) => RESTRITOS.includes(e))),
    ];
    if (enquadramentosRestritos.length > 0) {
      const { data: regras } = await admin
        .from("pc_regras_enquadramento")
        .select("*")
        .eq("owner_id", ownerId)
        .in("enquadramento", enquadramentosRestritos)
        .order("vigente_desde", { ascending: false });
      const avisos: string[] = [];
      for (const enq of enquadramentosRestritos) {
        const regra = (regras ?? []).find((r) => r.enquadramento === enq);
        if (!regra) continue;
        const renda = Number(faixa_renda_declarada) || null;
        const limiteRenda =
          regra.renda_familiar_max ??
          (regra.renda_em_salarios_minimos && cfg2?.salario_minimo_vigente
            ? regra.renda_em_salarios_minimos * cfg2.salario_minimo_vigente
            : null);
        if (renda != null && limiteRenda != null && renda > limiteRenda) {
          avisos.push(`${enq}: renda declarada acima do limite (${regra.texto_orientacao ?? "confirmar com a incorporadora"})`);
        }
        if (regra.veda_proprietario_de_imovel && possui_imovel_declarado === true) {
          avisos.push(`${enq}: cliente declarou possuir imóvel, e a unidade veda proprietário (${regra.texto_orientacao ?? "confirmar com a incorporadora"})`);
        }
      }
      if (avisos.length > 0) elegibilidadeAlerta = avisos.join(" ");
    }
  }

  const status = conflitoId ? "conflito" : "pendente";

  const { data: registro, error: insertError } = await admin
    .from("pc_registros_cliente")
    .insert({
      owner_id: ownerId,
      parceira_id,
      corretor_id: finalCorretorId,
      empreendimento_id: empreendimento_id ?? null,
      cliente_nome,
      cliente_telefone,
      cliente_email: cliente_email ?? null,
      cliente_cpf_hash: cliente_cpf_hash ?? null,
      cliente_cpf_final: cliente_cpf_final ?? null,
      cidade_origem: cidade_origem ?? null,
      uf_origem: uf_origem ?? null,
      perfil: perfil ?? null,
      interesse_unidades: unidadeIds,
      faixa_renda_declarada: faixa_renda_declarada ?? null,
      possui_imovel_declarado: possui_imovel_declarado ?? null,
      elegibilidade_alerta: elegibilidadeAlerta,
      status,
      registrado_em: registradoEm.toISOString(),
      valido_ate: validoAte.toISOString(),
      conflito_com_registro_id: conflitoId ?? null,
      origem_registro: origemRegistro,
      observacoes: observacoes ?? null,
    })
    .select("id, valido_ate")
    .single();

  if (insertError) return json({ error: "erro ao gravar registro: " + insertError.message }, 500);

  await admin.from("pc_registro_eventos").insert({
    owner_id: ownerId,
    registro_id: registro.id,
    tipo: "criado",
    descricao: conflitoId ? "Registro criado em conflito com registro vigente." : null,
    criado_por: origemRegistro === "painel" ? "marcos" : "formulario",
  });

  return json(
    {
      status: conflitoId ? "conflito" : elegibilidadeAlerta ? "alerta" : "ok",
      valido_ate: registro.valido_ate,
    },
    201,
  );
});
