require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const GUILD_ID = process.env.GUILD_ID;
const ROLE_PRESIDENTE = process.env.ROLE_PRESIDENTE;
const ROLE_VICE = process.env.ROLE_VICE;
const ROLE_CORREGEDORIA = process.env.ROLE_CORREGEDORIA;
const CHANNEL_PUBLICACOES = process.env.CHANNEL_PUBLICACOES;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_WEBHOOK_SALARIOS = process.env.DISCORD_WEBHOOK_SALARIOS;

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORIA_PTR = "1207346533985427518";
const CARGO_SAMU = "1207350835525189672";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let guildCache = null;

client.once("ready", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  try {
    guildCache = await client.guilds.fetch(GUILD_ID);
    await guildCache.roles.fetch();
    await guildCache.channels.fetch();

    try {
      await guildCache.members.fetch();
      console.log("Membros carregados em cache.");
    } catch {
      console.log("Aviso: nao foi possivel carregar todos os membros.");
    }
  } catch (err) {
    console.error("Erro ao preparar servidor:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
});

async function getGuild() {
  if (!guildCache) {
    guildCache = await client.guilds.fetch(GUILD_ID);
  }
  return guildCache;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
}

function toInt(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

async function registrarLog({ acao, admin = "sistema", discord_id = "", detalhes = "" }) {
  const { error } = await supabase.from("logs").insert({ acao, admin, discord_id: String(discord_id || ""), detalhes });
  if (error) console.error("Erro ao salvar log:", error);
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    rotas: [
      "/patrulhamento",
      "/membros",
      "/contador",
      "/publicacoes",
      "POST /solicitar-salario",
      "POST /multas",
      "GET /multas",
      "GET /multas/:discord_id",
      "PATCH /multas/:id",
      "PATCH /multas/:id/cancelar",
      "DELETE /multas/:id"
    ]
  });
});

app.post("/solicitar-salario", async (req, res) => {
  try {
    const { nome, id, discord_id, discord_mention_id, cargo, valor_solicitado, dia, horario, turno, observacao } = req.body;

    if (!nome || !discord_id || !cargo || valor_solicitado === undefined) {
      return res.status(400).json({ erro: "Campos obrigatorios: nome, discord_id, cargo, valor_solicitado" });
    }

    const valorSolicitado = toInt(valor_solicitado);

    const { data: multas, error: multasError } = await supabase
      .from("multas")
      .select("id, valor, motivo, observacao")
      .eq("discord_id", String(discord_id))
      .eq("status", "pendente");

    if (multasError) {
      console.error("Erro ao buscar multas:", multasError);
      return res.status(500).json({ erro: "Erro ao buscar multas" });
    }

    const multasPendentes = multas || [];
    let saldoParaDesconto = valorSolicitado;
    const multasProcessadas = multasPendentes.map((multa) => {
      const valorOriginal = toInt(multa.valor);
      const valorAbatido = Math.min(valorOriginal, saldoParaDesconto);
      const valorRestante = valorOriginal - valorAbatido;
      saldoParaDesconto -= valorAbatido;

      return {
        ...multa,
        valor_original: valorOriginal,
        valor_abatido: valorAbatido,
        valor_restante: valorRestante,
        status_final: valorRestante > 0 ? "pendente" : "paga"
      };
    });

    const valorDescontado = multasProcessadas.reduce((total, multa) => total + multa.valor_abatido, 0);
    const valorPendenteMultas = multasProcessadas.reduce((total, multa) => total + multa.valor_restante, 0);
    const valorPago = Math.max(valorSolicitado - valorDescontado, 0);

    const { data: pagamento, error: pagamentoError } = await supabase
      .from("pagamentos")
      .insert({
        discord_id: String(discord_id),
        nome,
        valor_solicitado: valorSolicitado,
        valor_descontado: valorDescontado,
        valor_pago: valorPago,
        metodo: "salario",
        registrado_por: "site",
        observacao: observacao || `Cargo: ${cargo}`,
        status: "pendente"
      })
      .select()
      .single();

    if (pagamentoError) {
      console.error("Erro ao salvar pagamento:", pagamentoError);
      return res.status(500).json({ erro: "Erro ao salvar pagamento" });
    }

    for (const multa of multasProcessadas) {
      if (multa.valor_abatido <= 0) continue;

      const { error: updateMultaError } = await supabase
        .from("multas")
        .update({
          valor: multa.valor_restante,
          status: multa.status_final
        })
        .eq("id", multa.id);

      if (updateMultaError) {
        console.error(`Erro ao atualizar multa #${multa.id}:`, updateMultaError);
      }
    }

    await registrarLog({
      acao: "solicitacao_salario",
      admin: "site",
      discord_id,
      detalhes: `${nome} solicitou ${formatCurrency(valorSolicitado)}. Multas descontadas: ${formatCurrency(valorDescontado)}. Multas restantes: ${formatCurrency(valorPendenteMultas)}. Valor final: ${formatCurrency(valorPago)}.`
    });

    if (DISCORD_WEBHOOK_SALARIOS) {
      const mention = discord_mention_id && /^\d{5,}$/.test(String(discord_mention_id)) ? `<@${discord_mention_id}>` : nome;
      const detalhesMultas = multasProcessadas
        .map(m => {
          const motivo = m.motivo || "Sem motivo";
          const obs = m.observacao ? ` | Obs: ${m.observacao}` : "";
          const restante = m.valor_restante > 0 ? ` | Restante pendente: ${formatCurrency(m.valor_restante)}` : " | Quitada";
          return `- #${m.id} - Abatido: ${formatCurrency(m.valor_abatido)} de ${formatCurrency(m.valor_original)} - ${motivo}${obs}${restante}`;
        })
        .join("\n");

      const messageContent =
        `<@&1297725684914847795>\n\n` +
        `**PAGAMENTO PENDENTE:**\n\n` +
        `Solicitante: ${mention}\n` +
        `${String(dia || "").toUpperCase()} as ${horario || "nao informado"}\n\n` +
        `**HOLERITE:**\n` +
        `Nome: ${nome} | ID: ${id || "nao informado"}\n` +
        `ID usado para multas: ${discord_id}\n` +
        `Cargo: ${cargo}\n` +
        `Valor solicitado: **${formatCurrency(valorSolicitado)}**\n` +
        `Multas descontadas: **-${formatCurrency(valorDescontado)}**\n` +
        (valorPendenteMultas > 0 ? `Restante de multas pendentes: **${formatCurrency(valorPendenteMultas)}**\n` : "") +
        `Valor final a pagar: **${formatCurrency(valorPago)}**\n\n` +
        (detalhesMultas ? `**MULTAS DESCONTADAS:**\n${detalhesMultas}\n\n` : "") +
        `>>> **ORIENTACOES AO MEMBRO DO FINANCEIRO:**\n` +
        `- Conferir se o ID do Discord esta correto\n` +
        `- Conferir multas antes de aprovar o pagamento\n` +
        `- Apos concluir, mover/deletar a mensagem conforme o procedimento interno.`;

      await fetch(DISCORD_WEBHOOK_SALARIOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent })
      });
    }

    res.json({
      sucesso: true,
      pagamento,
      valor_solicitado: valorSolicitado,
      valor_descontado: valorDescontado,
      valor_pago: valorPago,
      valor_pendente_multas: valorPendenteMultas,
      multas: multasProcessadas
    });
  } catch (err) {
    console.error("Erro solicitar salario:", err);
    res.status(500).json({ erro: "Erro ao solicitar salario" });
  }
});

app.post("/multas", async (req, res) => {
  try {
    const { discord_id, nome, valor, motivo, observacao, aplicada_por } = req.body;

    if (!discord_id || !valor) {
      return res.status(400).json({ erro: "Campos obrigatorios: discord_id e valor" });
    }

    const { data, error } = await supabase
      .from("multas")
      .insert({
        discord_id: String(discord_id),
        nome: nome || "",
        valor: toInt(valor),
        motivo: motivo || "",
        observacao: observacao || "",
        aplicada_por: aplicada_por || "admin",
        status: "pendente"
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar multa:", error);
      return res.status(500).json({ erro: "Erro ao criar multa" });
    }

    await registrarLog({
      acao: "multa_criada",
      admin: aplicada_por || "admin",
      discord_id,
      detalhes: `Multa de ${formatCurrency(valor)} criada. Motivo: ${motivo || "sem motivo"}`
    });

    res.json({ sucesso: true, multa: data });
  } catch (err) {
    console.error("Erro multas:", err);
    res.status(500).json({ erro: "Erro ao criar multa" });
  }
});

app.get("/multas", async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("multas")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "todas") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar multas:", error);
      return res.status(500).json({ erro: "Erro ao listar multas" });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Erro listar multas:", err);
    res.status(500).json({ erro: "Erro ao listar multas" });
  }
});

app.get("/multas/:discord_id", async (req, res) => {
  try {
    const { discord_id } = req.params;
    const { status } = req.query;

    let query = supabase
      .from("multas")
      .select("*")
      .eq("discord_id", String(discord_id))
      .order("created_at", { ascending: false });

    if (status && status !== "todas") query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar multas:", error);
      return res.status(500).json({ erro: "Erro ao listar multas" });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Erro listar multas:", err);
    res.status(500).json({ erro: "Erro ao listar multas" });
  }
});

app.patch("/multas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { discord_id, nome, valor, motivo, observacao, aplicada_por, status } = req.body;

    const update = {};
    if (discord_id !== undefined) update.discord_id = String(discord_id);
    if (nome !== undefined) update.nome = nome;
    if (valor !== undefined) update.valor = toInt(valor);
    if (motivo !== undefined) update.motivo = motivo;
    if (observacao !== undefined) update.observacao = observacao;
    if (aplicada_por !== undefined) update.aplicada_por = aplicada_por;
    if (status !== undefined) update.status = status;

    const { data, error } = await supabase
      .from("multas")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao editar multa:", error);
      return res.status(500).json({ erro: "Erro ao editar multa" });
    }

    await registrarLog({
      acao: "multa_editada",
      admin: aplicada_por || "admin",
      discord_id: data.discord_id,
      detalhes: `Multa #${id} editada.`
    });

    res.json({ sucesso: true, multa: data });
  } catch (err) {
    console.error("Erro editar multa:", err);
    res.status(500).json({ erro: "Erro ao editar multa" });
  }
});

app.patch("/multas/:id/cancelar", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin } = req.body;

    const { data, error } = await supabase
      .from("multas")
      .update({ status: "cancelada" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao cancelar multa:", error);
      return res.status(500).json({ erro: "Erro ao cancelar multa" });
    }

    await registrarLog({
      acao: "multa_cancelada",
      admin: admin || "admin",
      discord_id: data.discord_id,
      detalhes: `Multa #${id} cancelada.`
    });

    res.json({ sucesso: true, multa: data });
  } catch (err) {
    console.error("Erro cancelar multa:", err);
    res.status(500).json({ erro: "Erro ao cancelar multa" });
  }
});

app.delete("/multas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: multa, error: getError } = await supabase
      .from("multas")
      .select("*")
      .eq("id", id)
      .single();

    if (getError) {
      console.error("Erro ao buscar multa para remover:", getError);
      return res.status(500).json({ erro: "Erro ao buscar multa" });
    }

    const { error } = await supabase.from("multas").delete().eq("id", id);

    if (error) {
      console.error("Erro ao remover multa:", error);
      return res.status(500).json({ erro: "Erro ao remover multa" });
    }

    await registrarLog({
      acao: "multa_removida",
      admin: "presid",
      discord_id: multa.discord_id,
      detalhes: `Multa #${id} removida definitivamente.`
    });

    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro remover multa:", err);
    res.status(500).json({ erro: "Erro ao remover multa" });
  }
});

app.get("/patrulhamento", async (req, res) => {
  try {
    const guild = await getGuild();
    await guild.channels.fetch();
    const canais = guild.channels.cache.filter(c => c.parentId === CATEGORIA_PTR && c.type === ChannelType.GuildVoice);
    let total = 0;
    canais.forEach(c => total += c.members.size);
    res.json({ total });
  } catch (err) {
    console.error("Erro PTR:", err.message);
    res.json({ total: 0 });
  }
});

app.get("/contador", async (req, res) => {
  try {
    const guild = await getGuild();
    const role = guild.roles.cache.get(CARGO_SAMU) || await guild.roles.fetch(CARGO_SAMU);

    if (!role) return res.json({ total: 0, online: 0 });

    let onlineCount = 0;
    guild.presences.cache.forEach(presence => {
      const member = guild.members.cache.get(presence.userId);
      if (member && member.roles.cache.has(CARGO_SAMU) && ["online", "idle", "dnd"].includes(presence.status)) onlineCount++;
    });

    res.json({ total: role.members.size, online: onlineCount });
  } catch (err) {
    console.error("Erro contador:", err.message);
    res.json({ total: 0, online: 0 });
  }
});

app.get("/membros", async (req, res) => {
  try {
    const guild = await getGuild();
    const cargos = {
      "Presidente": ROLE_PRESIDENTE,
      "Vice-Presidente": ROLE_VICE,
      "Corregedoria": ROLE_CORREGEDORIA
    };
    const resultado = {};

    for (const [nome, id] of Object.entries(cargos)) {
      const role = guild.roles.cache.get(id) || await guild.roles.fetch(id);
      if (!role) {
        resultado[nome] = [];
        continue;
      }

      resultado[nome] = role.members.map(member => ({
        id: member.user.id,
        nome: member.displayName,
        username: member.user.username,
        avatar: member.user.displayAvatarURL({ size: 256 }),
        status: member.presence?.status || "offline"
      }));
    }

    res.json(resultado);
  } catch (err) {
    console.error("Erro membros:", err.message);
    res.status(500).json({ erro: "Erro membros" });
  }
});

app.get("/publicacoes", async (req, res) => {
  try {
    const canal = await client.channels.fetch(CHANNEL_PUBLICACOES);
    const mensagens = await canal.messages.fetch({ limit: 2 });

    const lista = mensagens.map(m => ({
      autor: m.author.username,
      avatar: m.author.displayAvatarURL(),
      conteudo: m.content || "Publicacao sem texto.",
      data: m.createdAt.toLocaleString("pt-BR")
    }));

    res.json(lista);
  } catch (err) {
    console.error("Erro publicacoes:", err.message);
    res.json([]);
  }
});

client.login(process.env.DISCORD_TOKEN);
