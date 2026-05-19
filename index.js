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
