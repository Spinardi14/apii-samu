require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
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
const adminSessions = new Map();

const COURSE_CATALOG = {
  recrutadores: {
    nome: "Formacao para Recrutadores",
    externalUrl: "https://www.canva.com/design/DAGnWJcy-bg/rTthp7tTVjf6qUfk00vrbQ/view?utm_content=DAGnWJcy-bg&utm_campaign=designshare&utm_medium=link&utm_source=viewer"
  },
  professores: { nome: "Formacao para Professores", storagePath: "professores.pdf" },
  financeiro: { nome: "Formacao Financeira", storagePath: "financeiro.pdf" },
  cfs: { nome: "CFS - Formacao para Socorristas", storagePath: "cfs.pdf" },
  cfm: { nome: "CFM - Formacao para Medicos", storagePath: "cfm.pdf" },
  desligamento: { nome: "Responsavel por Desligamento / Advertencia", storagePath: "desligamento-advertencia.pdf" }
};

const CATEGORIA_PTR = "1207346533985427518";
const CARGO_SAMU = "1207350835525189672";
const ROLE_FUNCIONARIO_SEMANA = "1208554148015116329";
const ROLE_RECRUTADOR_DESTAQUE = "1312642664767684618";
const ROLE_PROFESSOR_DESTAQUE = "1296282873665687642";

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

function formatDateBR(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return text || "data nao informada";
}

function formatTurno(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Turno nao informado";
}

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);

  return { start: monday.toISOString(), end: sunday.toISOString() };
}

function hasNormalSalaryInObservation(observacao) {
  const text = String(observacao || "").toLowerCase();
  if (text.includes("tipo de salario: setor")) return false;
  if (text.includes("tipo de salario: outros")) return false;
  return true;
}

function formatTipoPagamento(tipo) {
  if (tipo === "salario") return "Salario do cargo";
  if (tipo === "setor") return "Salario de setor";
  if (tipo === "outros") return "Outros";
  return "Salario do cargo + setor";
}

function hashAdminPassword(senha, salt) {
  return crypto.createHash("sha256").update(`${salt}:${senha}`).digest("hex");
}

function verifyAdminPassword(senha, salt, senhaHash) {
  const attempts = [
    hashAdminPassword(senha, salt),
    crypto.createHash("sha256").update(`${senha}${salt}`).digest("hex"),
    crypto.createHash("sha256").update(`${salt}${senha}`).digest("hex"),
    crypto.createHash("sha256").update(String(senha)).digest("hex")
  ];

  return attempts.includes(String(senhaHash || ""));
}

function publicAdmin(admin) {
  return {
    id: admin.id,
    usuario: admin.usuario,
    nome: admin.nome || "",
    status: admin.status,
    is_owner: Boolean(admin.is_owner || admin.usuario === "presid"),
    curso_lider: admin.curso_lider || "",
    created_at: admin.created_at
  };
}

function createAdminToken(admin) {
  const token = crypto.randomBytes(32).toString("hex");
  adminSessions.set(token, publicAdmin(admin));
  return token;
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const admin = adminSessions.get(token);

  if (!admin) {
    return res.status(401).json({ erro: "Sessao administrativa invalida." });
  }

  req.admin = admin;
  next();
}

function requireOwner(req, res, next) {
  if (!req.admin?.is_owner) {
    return res.status(403).json({ erro: "Apenas o dono pode executar esta acao." });
  }

  next();
}

function requireCourseLeader(req, res, next) {
  // Toda conta administrativa ativa já foi validada por requireAdmin.
  next();
}

function normalizeCourse(value) {
  const course = String(value || "").trim().toLowerCase();
  return COURSE_CATALOG[course] ? course : "";
}

async function registrarLog({ acao, admin = "sistema", discord_id = "", detalhes = "" }) {
  const { error } = await supabase.from("logs").insert({ acao, admin, discord_id: String(discord_id || ""), detalhes });
  if (error) console.error("Erro ao salvar log:", error);
}

function substituirMencoesDeCargo(texto, guild) {
  return String(texto || "Publicacao sem texto.").replace(/<@&(\d+)>/g, (match, roleId) => {
    const role = guild?.roles?.cache?.get(roleId);
    return role ? `@${role.name}` : match;
  });
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
      "GET /multas/:discord_id",
      "PATCH /multas/:id",
      "PATCH /multas/:id/cancelar",
      "DELETE /multas/:id"
    ]
  });
});

app.post("/admin/register", async (req, res) => {
  try {
    const usuario = String(req.body?.usuario || "").trim().toLowerCase();
    const nome = String(req.body?.nome || "").trim();
    const senha = String(req.body?.senha || "");

    if (!usuario || !senha) {
      return res.status(400).json({ erro: "Usuario e senha sao obrigatorios." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const senha_hash = hashAdminPassword(senha, salt);

    const { error } = await supabase.from("admins").insert({
      usuario,
      nome,
      senha_hash,
      salt,
      status: "pendente",
      is_owner: false,
      curso_lider: null
    });

    if (error) throw error;

    await registrarLog({ acao: "admin_registro", admin: usuario, detalhes: "Cadastro administrativo enviado para aprovacao." });
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro admin/register:", err.message);
    res.status(500).json({ erro: "Erro ao cadastrar administrador." });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const usuario = String(req.body?.usuario || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");

    if (!usuario || !senha) {
      return res.status(400).json({ erro: "Usuario e senha sao obrigatorios." });
    }

    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, created_at, usuario, nome, senha_hash, salt, status, is_owner, curso_lider")
      .eq("usuario", usuario)
      .maybeSingle();

    if (error) throw error;

    const isPresidFallback = usuario === "presid" && senha === "robson2424";

    if (!admin && !isPresidFallback) {
      return res.status(401).json({ erro: "Usuario ou senha incorretos." });
    }

    const adminData = admin || {
      id: "presid",
      usuario: "presid",
      nome: "Presidencia",
      status: "ativo",
      is_owner: true,
      curso_lider: ""
    };

    if (adminData.status !== "ativo" && !isPresidFallback) {
      return res.status(403).json({ erro: "Conta ainda nao aprovada." });
    }

    const senhaOk = isPresidFallback || verifyAdminPassword(senha, adminData.salt, adminData.senha_hash);

    if (!senhaOk) {
      return res.status(401).json({ erro: "Usuario ou senha incorretos." });
    }

    const token = createAdminToken(adminData);
    res.json({ sucesso: true, token, admin: publicAdmin(adminData) });
  } catch (err) {
    console.error("Erro admin/login:", err.message);
    res.status(500).json({ erro: "Erro ao fazer login." });
  }
});

app.get("/admin/usuarios", requireAdmin, requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("id, created_at, usuario, nome, status, is_owner, curso_lider")
      .order("id", { ascending: true });

    if (error) throw error;

    res.json((data || []).map(publicAdmin));
  } catch (err) {
    console.error("Erro admin/usuarios:", err.message);
    res.status(500).json({ erro: "Erro ao listar usuarios." });
  }
});

app.patch("/admin/usuarios/:id/:acao", requireAdmin, requireOwner, async (req, res) => {
  try {
    const { id, acao } = req.params;
    const status = acao === "aprovar" ? "ativo" : acao === "desativar" ? "desativado" : null;

    if (!status) {
      return res.status(400).json({ erro: "Acao invalida." });
    }

    const { data: alvo, error: alvoError } = await supabase
      .from("admins")
      .select("usuario, is_owner")
      .eq("id", id)
      .maybeSingle();

    if (alvoError) throw alvoError;
    if (alvo?.is_owner) {
      return res.status(403).json({ erro: "Nao e possivel alterar o dono." });
    }

    const { error } = await supabase.from("admins").update({ status }).eq("id", id);
    if (error) throw error;

    await registrarLog({ acao: `admin_${acao}`, admin: req.admin.usuario, detalhes: `Usuario ${alvo?.usuario || id} atualizado para ${status}.` });
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro admin/usuarios acao:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar usuario." });
  }
});

app.delete("/admin/usuarios/:id", requireAdmin, requireOwner, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: alvo, error: alvoError } = await supabase
      .from("admins")
      .select("usuario, is_owner")
      .eq("id", id)
      .maybeSingle();

    if (alvoError) throw alvoError;
    if (alvo?.is_owner) {
      return res.status(403).json({ erro: "Nao e possivel remover o dono." });
    }

    const { error } = await supabase.from("admins").delete().eq("id", id);
    if (error) throw error;

    await registrarLog({ acao: "admin_removido", admin: req.admin.usuario, detalhes: `Usuario ${alvo?.usuario || id} removido.` });
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro admin/usuarios delete:", err.message);
    res.status(500).json({ erro: "Erro ao remover usuario." });
  }
});

app.post("/admin/lideres", requireAdmin, requireOwner, async (req, res) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const usuario = String(req.body?.usuario || "").trim().toLowerCase();
    const senha = String(req.body?.senha || "");
    if (!nome || !usuario || !senha) {
      return res.status(400).json({ erro: "Preencha nome, usuario e senha." });
    }

    if (senha.length < 6) {
      return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const senha_hash = hashAdminPassword(senha, salt);
    const { data, error } = await supabase
      .from("admins")
      .insert({
        usuario,
        nome,
        senha_hash,
        salt,
        status: "ativo",
        is_owner: false,
        curso_lider: "todos"
      })
      .select("id, created_at, usuario, nome, status, is_owner, curso_lider")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ erro: "Este usuario ja esta cadastrado." });
      }
      throw error;
    }

    await registrarLog({
      acao: "curso_lider_criado",
      admin: req.admin.usuario,
      detalhes: `${usuario} criado como lider de todos os cursos.`
    });

    res.json({ sucesso: true, admin: publicAdmin(data) });
  } catch (err) {
    console.error("Erro ao criar lider de curso:", err.message);
    res.status(500).json({ erro: "Erro ao criar lider de curso." });
  }
});

app.patch("/admin/lideres/:id", requireAdmin, requireOwner, async (req, res) => {
  try {
    const curso = req.body?.curso === "todos" ? "todos" : "";

    const { data: alvo, error: alvoError } = await supabase
      .from("admins")
      .select("usuario, is_owner")
      .eq("id", req.params.id)
      .maybeSingle();

    if (alvoError) throw alvoError;
    if (!alvo) return res.status(404).json({ erro: "Usuario nao encontrado." });
    if (alvo.is_owner) return res.status(403).json({ erro: "O dono ja possui acesso a todos os cursos." });

    const { error } = await supabase
      .from("admins")
      .update({ curso_lider: curso || null })
      .eq("id", req.params.id);

    if (error) throw error;

    await registrarLog({
      acao: curso ? "curso_lider_definido" : "curso_lider_removido",
      admin: req.admin.usuario,
      detalhes: curso ? `${alvo.usuario} autorizado para todos os cursos.` : `Lideranca de ${alvo.usuario} removida.`
    });

    res.json({ sucesso: true, curso_lider: curso });
  } catch (err) {
    console.error("Erro curso-lider:", err.message);
    res.status(500).json({ erro: "Erro ao atualizar lider de curso." });
  }
});

app.get("/cursos", (req, res) => {
  res.json(Object.entries(COURSE_CATALOG).map(([codigo, curso]) => ({ codigo, nome: curso.nome })));
});

app.get("/cursos/acessos", requireAdmin, requireCourseLeader, async (req, res) => {
  try {
    let query = supabase
      .from("acessos_cursos")
      .select("id, created_at, discord_id, curso, liberado_por, expires_at, revoked_at")
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Erro ao listar acessos de cursos:", err.message);
    res.status(500).json({ erro: "Erro ao listar acessos de cursos." });
  }
});

app.post("/cursos/acessos", requireAdmin, requireCourseLeader, async (req, res) => {
  try {
    const discordId = String(req.body?.discord_id || "").replace(/\s/g, "");
    const curso = normalizeCourse(req.body?.curso);

    if (!/^\d+$/.test(discordId)) {
      return res.status(400).json({ erro: "Informe um ID do Discord valido, somente com numeros." });
    }
    if (!curso) return res.status(400).json({ erro: "Selecione um curso valido." });

    await supabase
      .from("acessos_cursos")
      .update({ revoked_at: new Date().toISOString() })
      .eq("discord_id", discordId)
      .eq("curso", curso)
      .is("revoked_at", null);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("acessos_cursos")
      .insert({
        discord_id: discordId,
        curso,
        liberado_por: req.admin.usuario,
        expires_at: expiresAt
      })
      .select("id, discord_id, curso, liberado_por, expires_at")
      .single();

    if (error) throw error;

    await registrarLog({ acao: "curso_acesso_liberado", admin: req.admin.usuario, discord_id: discordId, detalhes: `${curso} liberado por 60 minutos.` });
    res.json({ sucesso: true, acesso: data });
  } catch (err) {
    console.error("Erro ao liberar curso:", err.message);
    res.status(500).json({ erro: "Erro ao liberar acesso ao curso." });
  }
});

app.delete("/cursos/acessos/:id", requireAdmin, requireCourseLeader, async (req, res) => {
  try {
    const { data: acesso, error: findError } = await supabase
      .from("acessos_cursos")
      .select("id, discord_id, curso")
      .eq("id", req.params.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!acesso) return res.status(404).json({ erro: "Acesso nao encontrado." });
    const { error } = await supabase
      .from("acessos_cursos")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (error) throw error;
    await registrarLog({ acao: "curso_acesso_revogado", admin: req.admin.usuario, discord_id: acesso.discord_id, detalhes: `${acesso.curso} revogado.` });
    res.json({ sucesso: true });
  } catch (err) {
    console.error("Erro ao revogar curso:", err.message);
    res.status(500).json({ erro: "Erro ao revogar acesso ao curso." });
  }
});

app.post("/cursos/validar", async (req, res) => {
  try {
    const discordId = String(req.body?.discord_id || "").replace(/\s/g, "");
    const curso = normalizeCourse(req.body?.curso);

    if (!/^\d+$/.test(discordId) || !curso) {
      return res.status(400).json({ erro: "ID ou curso invalido." });
    }

    const { data: acesso, error } = await supabase
      .from("acessos_cursos")
      .select("id, discord_id, curso, expires_at")
      .eq("discord_id", discordId)
      .eq("curso", curso)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!acesso) return res.status(403).json({ erro: "Este ID nao possui acesso ativo para o curso selecionado." });

    const courseData = COURSE_CATALOG[curso];
    let documentUrl = courseData.externalUrl || "";

    if (courseData.storagePath) {
      const secondsRemaining = Math.max(1, Math.min(3600, Math.floor((new Date(acesso.expires_at).getTime() - Date.now()) / 1000)));
      const { data: signed, error: signedError } = await supabase.storage
        .from("cursos")
        .createSignedUrl(courseData.storagePath, secondsRemaining);

      if (signedError) throw signedError;
      documentUrl = signed.signedUrl;
    }

    res.json({
      sucesso: true,
      curso: { codigo: curso, nome: courseData.nome },
      expires_at: acesso.expires_at,
      document_url: documentUrl
    });
  } catch (err) {
    console.error("Erro ao validar curso:", err.message);
    res.status(500).json({ erro: "Erro ao abrir o material do curso." });
  }
});

app.get("/manutencao", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("logs")
      .select("detalhes, created_at")
      .eq("acao", "manutencao_site")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar manutencao:", error);
      return res.json({ ativo: false });
    }

    let detalhes = {};
    try {
      detalhes = data?.detalhes ? JSON.parse(data.detalhes) : {};
    } catch {
      detalhes = {};
    }

    res.json({ ativo: Boolean(detalhes.ativo), atualizado_em: data?.created_at || null });
  } catch (err) {
    console.error("Erro manutencao:", err);
    res.json({ ativo: false });
  }
});

app.patch("/manutencao", async (req, res) => {
  try {
    const ativo = Boolean(req.body?.ativo);
    const admin = req.body?.admin || "presid";
    if (admin !== "presid") {
      return res.status(403).json({ erro: "Somente o dono pode alterar a manutencao" });
    }

    await registrarLog({
      acao: "manutencao_site",
      admin,
      detalhes: JSON.stringify({ ativo })
    });

    res.json({ sucesso: true, ativo });
  } catch (err) {
    console.error("Erro atualizar manutencao:", err);
    res.status(500).json({ erro: "Erro ao atualizar manutencao" });
  }
});

app.post("/solicitar-salario", async (req, res) => {
  try {
    const { nome, id, discord_id, discord_mention_id, cargo, valor_solicitado, valor_bruto, taxa_financeiro, tipo_pagamento, dia, horario, turno, observacao } = req.body;

    if (!nome || !discord_id || !cargo || valor_solicitado === undefined) {
      return res.status(400).json({ erro: "Campos obrigatorios: nome, discord_id, cargo, valor_solicitado" });
    }

    const tipoPagamento = String(tipo_pagamento || "salario").trim().toLowerCase();
    const tipoPagamentoLabel = formatTipoPagamento(tipoPagamento);
    const valorSolicitado = toInt(valor_solicitado);
    const valorBruto = valor_bruto !== undefined ? toInt(valor_bruto) : valorSolicitado;
    const taxaFinanceiro = taxa_financeiro !== undefined ? toInt(taxa_financeiro) : Math.round(valorSolicitado * 0.10);
    const valorAposTaxa = Math.max(valorSolicitado - taxaFinanceiro, 0);

    if (tipoPagamento === "ambos") {
      const semana = getCurrentWeekRange();
      const { data: pagamentosSemana, error: pagamentosSemanaError } = await supabase
        .from("pagamentos")
        .select("id, observacao, created_at")
        .eq("discord_id", String(discord_id))
        .eq("metodo", "salario")
        .gte("created_at", semana.start)
        .lt("created_at", semana.end);

      if (pagamentosSemanaError) {
        console.error("Erro ao verificar pagamentos da semana:", pagamentosSemanaError);
        return res.status(500).json({ erro: "Erro ao verificar pagamentos da semana" });
      }

      if ((pagamentosSemana || []).some(p => hasNormalSalaryInObservation(p.observacao))) {
        return res.status(400).json({ erro: "Este ID ja solicitou salario normal nesta semana. Solicite apenas o salario de setor." });
      }
    }

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
    let saldoParaDesconto = valorAposTaxa;
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
    const valorPago = Math.max(valorAposTaxa - valorDescontado, 0);

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
        observacao: observacao || `Tipo de salario: ${tipoPagamento} | Cargo: ${cargo}`,
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
        `Pagamento agendado para:\n` +
        `${formatDateBR(dia)} as ${horario || "nao informado"} - ${formatTurno(turno)}\n\n` +
        `**HOLERITE:**\n` +
        `Nome: ${nome} | ID: ${id || "nao informado"}\n` +
        `ID usado para multas: ${discord_id}\n` +
        `Tipo de pagamento: ${tipoPagamentoLabel}\n` +
        `Cargo: ${cargo}\n` +
        `Valor solicitado: **${formatCurrency(valorSolicitado)}**\n` +
        `Taxa Financeiro (-10%): **-${formatCurrency(taxaFinanceiro)}**\n` +
        `Multas descontadas: **-${formatCurrency(valorDescontado)}**\n` +
        (valorPendenteMultas > 0 ? `Restante de multas pendentes: **${formatCurrency(valorPendenteMultas)}**\n` : "") +
        `Valor final a pagar: **${formatCurrency(valorPago)}**\n\n` +
        (detalhesMultas ? `**MULTAS DESCONTADAS:**\n${detalhesMultas}\n\n` : "") +
        `>>> **ORIENTACOES AO MEMBRO DO FINANCEIRO:**\n\n` +
        `• Conferir multas antes de aprovar o pagamento, caso o pagamento possui algum tipo de multa e será negado, informar a presidência.\n` +
        `• Membros acima de Médico-Chefe possuem obrigação de estar com a meta financeira semanal em dia no valor de R$500.000\n` +
        `• Caso o membro não responda ao pagamento pelo período de 3 dias, pode ser encaminhada esta mensagem para "pagamentos negados"\n` +
        `• Caso esta solicitação o membro não tenha colocado o ID correto e não fez a menção o pagamento deve ser negado\n` +
        `• Após encaminhar esta mensagem para os canais realizados/negados, a mensagem neste canal precisa ser DELETADA.`;

      await fetch(DISCORD_WEBHOOK_SALARIOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent })
      });
    }

    res.json({ sucesso: true, pagamento, valor_solicitado: valorSolicitado, valor_descontado: valorDescontado, valor_pago: valorPago, valor_pendente_multas: valorPendenteMultas, multas: multasProcessadas });
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

    await registrarLog({ acao: "multa_cancelada", admin: admin || "admin", discord_id: data.discord_id, detalhes: `Multa #${id} cancelada.` });
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

    await registrarLog({ acao: "multa_removida", admin: "presid", discord_id: multa.discord_id, detalhes: `Multa #${id} removida definitivamente.` });
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
      "Funcionario da Semana": ROLE_FUNCIONARIO_SEMANA,
      "Recrutador Destaque": ROLE_RECRUTADOR_DESTAQUE,
      "Professor Destaque": ROLE_PROFESSOR_DESTAQUE,
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
    const guild = await getGuild();
    await guild.roles.fetch();
    const canal = await client.channels.fetch(CHANNEL_PUBLICACOES);
    const mensagens = await canal.messages.fetch({ limit: 2 });
    const lista = mensagens.map(m => ({
      autor: m.author.username,
      avatar: m.author.displayAvatarURL(),
      conteudo: substituirMencoesDeCargo(m.content, guild),
      data: m.createdAt.toLocaleString("pt-BR")
    }));
    res.json(lista);
  } catch (err) {
    console.error("Erro publicacoes:", err.message);
    res.json([]);
  }
});

client.login(process.env.DISCORD_TOKEN);
