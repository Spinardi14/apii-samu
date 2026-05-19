require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===== VARIÁVEIS =====
const GUILD_ID = process.env.GUILD_ID;
const ROLE_PRESIDENTE = process.env.ROLE_PRESIDENTE;
const ROLE_VICE = process.env.ROLE_VICE;
const ROLE_CORREGEDORIA = process.env.ROLE_CORREGEDORIA;
const CHANNEL_PUBLICACOES = process.env.CHANNEL_PUBLICACOES;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_WEBHOOK_SALARIOS = process.env.DISCORD_WEBHOOK_SALARIOS;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// IDs fixos
const CATEGORIA_PTR = "1207346533985427518";
const CARGO_SAMU = "1207350835525189672";

// ===== CLIENT DISCORD =====
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

// ===== BOT READY =====
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
      console.log("Aviso: não foi possível carregar todos os membros.");
    }
  } catch (err) {
    console.error("Erro ao preparar servidor:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
});

// ===== FUNÇÕES AUXILIARES =====
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

// ===== ROTA BASE =====
app.get("/", (req, res) => {
  res.json({
    status: "online",
    rotas: [
      "/patrulhamento",
      "/membros",
      "/contador",
      "/publicacoes",
      "/solicitar-salario",
      "/multas"
    ]
  });
});

// ===== SOLICITAR SALÁRIO COM DESCONTO DE MULTAS =====
app.post("/solicitar-salario", async (req, res) => {
  try {
    const {
      nome,
      id,
      discord_id,
      cargo,
      valor_solicitado,
      dia,
      horario,
      turno,
      observacao
    } = req.body;

    if (!nome || !discord_id || !cargo || valor_solicitado === undefined) {
      return res.status(400).json({
        erro: "Campos obrigatórios: nome, discord_id, cargo, valor_solicitado"
      });
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

    const valorDescontado = (multas || []).reduce((total, multa) => {
      return total + toInt(multa.valor);
    }, 0);

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

    await supabase.from("logs").insert({
      acao: "solicitacao_salario",
      admin: "site",
      discord_id: String(discord_id),
      detalhes: `${nome} solicitou ${formatCurrency(valorSolicitado)}. Multas descontadas: ${formatCurrency(valorDescontado)}. Valor final: ${formatCurrency(valorPago)}.`
    });

    if (DISCORD_WEBHOOK_SALARIOS) {
      const mention = `<@${discord_id}>`;

      const multasTexto = valorDescontado > 0
        ? `Multas descontadas: **-${formatCurrency(valorDescontado)}**\n`
        : "Multas descontadas: **R$ 0**\n";

      const detalhesMultas = (multas || [])
        .map(m => `• #${m.id} - ${formatCurrency(m.valor)} - ${m.motivo || "Sem motivo"}`)
        .join("\n");

      const messageContent =
        `<@&1297725684914847795>\n\n` +
        `**PAGAMENTO PENDENTE:**\n\n` +
        `Solicitante: ${mention}\n` +
        `${String(dia || "").toUpperCase()} às ${horario || "não informado"}\n\n` +
        `**HOLERITE:**\n` +
        `Nome: ${nome} | ID: ${id || "não informado"}\n` +
        `Discord ID: ${discord_id}\n` +
        `Cargo: ${cargo}\n` +
        `Valor solicitado: **${formatCurrency(valorSolicitado)}**\n` +
        multasTexto +
        `Valor final a pagar: **${formatCurrency(valorPago)}**\n\n` +
        (detalhesMultas ? `**MULTAS PENDENTES:**\n${detalhesMultas}\n\n` : "") +
        `>>> **ORIENTAÇÕES AO MEMBRO DO FINANCEIRO:**\n` +
        `• Conferir se o ID do Discord está correto\n` +
        `• Conferir multas antes de aprovar o pagamento\n` +
        `• Após concluir, mover/deletar a mensagem conforme o procedimento interno.`;

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
      multas: multas || []
    });
  } catch (err) {
    console.error("Erro solicitar salário:", err);
    res.status(500).json({ erro: "Erro ao solicitar salário" });
  }
});

// ===== CRIAR MULTA =====
app.post("/multas", async (req, res) => {
  try {
    const {
      discord_id,
      nome,
      valor,
      motivo,
      observacao,
      aplicada_por
    } = req.body;

    if (!discord_id || !valor) {
      return res.status(400).json({
        erro: "Campos obrigatórios: discord_id e valor"
      });
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

    await supabase.from("logs").insert({
      acao: "multa_criada",
      admin: aplicada_por || "admin",
      discord_id: String(discord_id),
      detalhes: `Multa de ${formatCurrency(valor)} criada. Motivo: ${motivo || "sem motivo"}`
    });

    res.json({ sucesso: true, multa: data });
  } catch (err) {
    console.error("Erro multas:", err);
    res.status(500).json({ erro: "Erro ao criar multa" });
  }
});

// ===== LISTAR MULTAS DE UM USUÁRIO =====
app.get("/multas/:discord_id", async (req, res) => {
  try {
    const { discord_id } = req.params;

    const { data, error } = await supabase
      .from("multas")
      .select("*")
      .eq("discord_id", String(discord_id))
      .order("created_at", { ascending: false });

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

// ===== CANCELAR MULTA =====
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

    await supabase.from("logs").insert({
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

// ===== PTR =====
app.get("/patrulhamento", async (req, res) => {
  try {
    const guild = await getGuild();
    await guild.channels.fetch();

    const canais = guild.channels.cache.filter(c =>
      c.parentId === CATEGORIA_PTR &&
      c.type === ChannelType.GuildVoice
    );

    let total = 0;
    canais.forEach(c => total += c.members.size);

    res.json({ total });
  } catch (err) {
    console.error("Erro PTR:", err.message);
    res.json({ total: 0 });
  }
});

// ===== CONTADOR =====
app.get("/contador", async (req, res) => {
  try {
    const guild = await getGuild();
    const role = guild.roles.cache.get(CARGO_SAMU) || await guild.roles.fetch(CARGO_SAMU);

    if (!role) {
      return res.json({ total: 0, online: 0 });
    }

    let onlineCount = 0;

    guild.presences.cache.forEach(presence => {
      const member = guild.members.cache.get(presence.userId);

      if (
        member &&
        member.roles.cache.has(CARGO_SAMU) &&
        ["online", "idle", "dnd"].includes(presence.status)
      ) {
        onlineCount++;
      }
    });

    res.json({
      total: role.members.size,
      online: onlineCount
    });
  } catch (err) {
    console.error("Erro contador:", err.message);
    res.json({ total: 0, online: 0 });
  }
});

// ===== MEMBROS =====
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

// ===== PUBLICAÇÕES =====
app.get("/publicacoes", async (req, res) => {
  try {
    const canal = await client.channels.fetch(CHANNEL_PUBLICACOES);
    const mensagens = await canal.messages.fetch({ limit: 2 });

    const lista = mensagens.map(m => ({
      autor: m.author.username,
      avatar: m.author.displayAvatarURL(),
      conteudo: m.content || "Publicação sem texto.",
      data: m.createdAt.toLocaleString("pt-BR")
    }));

    res.json(lista);
  } catch (err) {
    console.error("Erro publicações:", err.message);
    res.json([]);
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
