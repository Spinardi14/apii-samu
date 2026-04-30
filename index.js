require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits, ChannelType } = require("discord.js");

const app = express();
app.use(cors());

const PORT = 3000;

const GUILD_ID = process.env.GUILD_ID;
const ROLE_PRESIDENTE = process.env.ROLE_PRESIDENTE;
const ROLE_VICE = process.env.ROLE_VICE;
const ROLE_CORREGEDORIA = process.env.ROLE_CORREGEDORIA;
const CHANNEL_PUBLICACOES = process.env.CHANNEL_PUBLICACOES;

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

client.once("clientReady", async () => {
  console.log(`Bot online: ${client.user.tag}`);

  try {
    guildCache = await client.guilds.fetch(GUILD_ID);
    await guildCache.roles.fetch();
    await guildCache.channels.fetch();

    try {
      await guildCache.members.fetch();
      console.log("Membros carregados em cache.");
    } catch (err) {
      console.log("Aviso: não foi possível carregar todos os membros. Usando cache disponível.");
    }

  } catch (err) {
    console.error("Erro ao preparar servidor:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
  });
});

async function getGuild() {
  if (!guildCache) {
    guildCache = await client.guilds.fetch(GUILD_ID);
  }
  return guildCache;
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    rotas: ["/patrulhamento", "/membros", "/contador", "/publicacoes"]
  });
});

app.get("/patrulhamento", async (req, res) => {
  try {
    const guild = await getGuild();
    await guild.channels.fetch();

    const canais = guild.channels.cache.filter(c =>
      c.parentId === CATEGORIA_PTR &&
      c.type === ChannelType.GuildVoice
    );

    let total = 0;

    canais.forEach(c => {
      total += c.members.size;
    });

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

    if (!role) {
      return res.json({
        total: 0,
        online: 0,
        aviso: "Cargo SAMU não encontrado."
      });
    }

    const membrosDoCargo = role.members;

    const online = client.presence.cache
      ? 0
      : 0;

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
      total: membrosDoCargo.size,
      online: onlineCount
    });

  } catch (err) {
    console.error("Erro contador:", err.message);
    res.json({
      total: "--",
      online: 0
    });
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

    for (const [nomeCargo, idCargo] of Object.entries(cargos)) {
      const role = guild.roles.cache.get(idCargo) || await guild.roles.fetch(idCargo);

      if (!role) {
        resultado[nomeCargo] = [];
        continue;
      }

      resultado[nomeCargo] = role.members.map(member => ({
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
    res.status(500).json({ erro: "Erro membros", detalhe: err.message });
  }
});

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

client.login(process.env.DISCORD_TOKEN);