/**
 * index.js - AES Green all-in-one (CommonJS)
 * - Multi-prefix text commands (!, ? by default)
 * - Official slash commands registration (guild if GUILD_ID provided)
 * - Auto placeholder/variable replacement system (basic)
 * - In-memory storage for balances/inventories/settings (for dev)
 *
 * Env variables:
 *  - TOKEN (required)
 *  - GUILD_ID (optional, recommended for fast slash registration)
 *  - PREFIXES (optional, ex: "! , ? , /")
 *
 * npm deps: discord.js, dotenv
 */

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// ---------- CONFIG ----------
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || null;
const PREFIXES = process.env.PREFIXES
  ? process.env.PREFIXES.split(",").map((p) => p.trim()).filter(Boolean)
  : ["!", "?"];

if (!TOKEN) {
  console.error("ERROR: TOKEN not set in env.");
  process.exit(1);
}

// small id generator (no nanoid)
function genId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

// ---------- RAW COMMANDS (from part1 + part2) ----------
const RAW_COMMANDS_TEXT = `
/balance <@user>
/balance
/balance user:@iara

/pet <@user> <remind: true/false>
/pet
/pet user:@iara 
/pet remind: true

/snuggle <@user> <remind:true/false>
/snuggle
/snuggle user:@iara

/clickcake
/clickcake

/coinflip <guess: heads/tails> <bet:value #>
/coinflip
/coinflip guess: heads bet: 10

/rolldice [bet:value #]
/rolldice bet:10

/slots [bet:value #]
/slots bet:100

/leaderboard <page: value #>
/leaderboard
/leaderboard page: 5

/give currency [@user] [amount #]
/give currency user: @iara amount: 10

/give item [@user] [item]
/give item user: @iara item:apple

/shop view <page #>
/shop view
/shop view page: 2

/shop buy [item] <amount #>
/shop buy item: flowers
/shop buy item: grape amount: 10

/drop [amount #]
/drop amount: 100

/pick <code>
/pick code: eT1a

/event start [#channel] [amount] <label> <description>
/event end [#channel]

/modifybal add [@user] [amount #]
/modifybal remove [@user] [amount #]

/settings <group>
/set currency [symbol]
/set currency start [amount #]
/set currency onleave [save/delete]
/set currency pet <# minutes> <# amount min> <# amount max>
/set currency snuggle <# minutes> <# amount min> <# amount max>
/set currency clickcake <# minutes> <# amount>
/set currency bet <# amount min> <# amount max>
/set currency transfer <# amount min> <# amount max> <# amount tax>

/reset user balance [user]
/reset user inventory [user]
/reset server inventories
/reset server balances
/reset server shop
/reset server events

/embed list
/embed create [embed name]
/embed edit author [embed name] <text><icon>
/embed edit footer [embed name] <text><icon>
/embed edit title [embed name] <text>
/embed edit description [embed name] <text>
/embed edit thumbnail [embed name] <text>
/embed edit image [embed name] <text>
/embed edit color [embed name] <color>
/embed edit all [embed name]
/embed show [embed name]

/autoresponder add [trigger] [reply]
/autoresponder editreply [trigger] [reply]
/autoresponder editmatchmode [trigger] [matchmode]
/autoresponder show [trigger]
/autoresponder showraw [trigger]
/autoresponder list

/shop add name:[item name] price:[item price #] stock:[item amount #] role:<@role> description: <item description>
/shop edit name item:[current item name] name:[new item name]
/shop edit stock item:[item name] amount:[new stock amount #]
/shop edit role item:[item name] role:<@role>
/shop edit requirerole item:[item name] role:<@role>
/shop edit removerole item:[item name] role:<@role>
/shop edit reply item:[item name] reply:<new item reply>
/shop edit price item:[item name] amount:[new price #]
/shop edit disablegive item:[item name] disabled:[true/false]

/hotlines online
/hotlines search [country]

/reset server all
/reset server autoresponders
/reset server embeds
/set custom embedcolor [color]
/set currency confirmbuy [enable_confirm: true/false]
/set currency itemids [enable_devmode: true/false]
/set greet message <text>
/set greet channel <#channel>
/set leave message <text>
/set leave channel <#channel>
/set boost message <text>
/set boost channel <#channel>

/play
/feed
/playdate
/cozy
/activity breaktime
/activity fetch
/activity hike
/activity swim
/activity visit
/activity heal
/activity stroll
/activity sing
/activity draw
/activity snooze
/activity dream
/activity explore
/activity manifest

/adminreinitialiser anniversaires
/adminreinitialiser infractions
/adminreinitialiser sanctions
/botinfo
/config
/panel
/aide
/ping
/premium activer
/premium codes
/premium désactiver
/premium infos
/statuts
/support diagnostic
/support invite
/votes

/ban
/infractions ajouter
/infractions lister
/infractions retirer
/expulser
/mod
/mute
/normaliser
/note
/sanctions lister
/sanctions retirer
/roles-permanents ajouter
/roles-permanents lister
/roles-permanents retirer
/roles-permanents réinitialiser
/role-temporaire ajouter
/role-temporaire lister
/role-temporaire retirer
/role-temporaire réinitialiser
/deban
/demute
/avertir

/effacer après
/effacer conversation
/effacer messages
/vider-salon
/copier
/deplacer
/citer
/enregistrer conversation

/emojiperm ajouter
/emojiperm effacer
/emojiperm lister
/emojiperm retirer
/interserveur générer
/interserveur lier
/interserveur gérer
/rappel créer
/rappel supprimer
/rappel modifier
/rappel liste
/signaler message
/signaler utilisateur
/reglement ajouter
/reglement créer
/reglement retirer
/reglement modifier
/suggestion
/suggestmod accepter
/suggestmod attente
/suggestmod prevue
/suggestmod refuser
/suggestmod rechercher
/suggestmod classement
/suggestmod voir
/ticket
/ticketmod ajouter
/ticketmod ouvrir
/ticketmod retirer

/description
/info salon
/info émoji
/info rôle
/info serveur
/info utilisateur
/localité
/profil

/adminxp ajouter
/adminxp retirer
/adminxp réinitialiser
/adminxp définir
/adminxp transférer
/dropxp
/niveau
/recompenses
/topniveau

/adminargent ajouter
/adminargent retirer
/adminargent réinitialiser
/adminargent définir
/adminargent transférer
/journalier
/dropargent
/argent
/payer
/boutique
/topargent

/admininventaire supprimer
/admininventaire donner
/admininventaire fusionner
/admininventaire retirer
/admininventaire renommer
/admininventaire reset
/dropitem
/inventaire
/objet
/topitems

/profiljeux
/stats brawlhalla
/stats brawlstars
/stats chess
/stats clashofclans
/stats clashroyale
/stats osu
/stats paladins
/stats wolfy

/interact nourrir
/interact caliner
/interact embrasser
/interact caresser
/interact gifler
/interact chatouiller

/bingo
/colormind
/puissance4
/pendu
/demineur
/chifumi
/morpion

/adminanniversaire supprimer
/adminanniversaire définir
/anniversaire activer
/anniversaire désactiver
/anniversaire liste
/anniversaire retirer
/anniversaire définir
/calendrier
/evenement créer
/evenement terminer
/evenement relancer
/giveaway créer
/giveaway terminer
/giveaway participants
/giveaway relancer
/blague
/couple
/sondage créer
/sondage terminer
/sondage résultats
/lancer-dés
/tv

/avatar
/sauvegarde créer
/sauvegarde lister
/sauvegarde retirer
/sauvegarde réinitialiser
/sauvegarde restaurer
/couleur
/embed
/maths
/qrcode
/reagir
/role tous
/role annuler
/role status
/role pour
/envoyer
/timestamp
`;

// ---------- PARSE raw commands and build command list ----------
function parseCommands(rawText) {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const cmds = [];
  for (const line of lines) {
    if (!line.startsWith("/")) continue;
    const after = line.slice(1).trim();
    const first = after.split(/\s+/)[0];
    if (!first) continue;
    const name = first.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!name) continue;
    const desc = after.split(/\s+/).slice(1).join(" ") || "Commande AES Green";
    if (!cmds.find(c => c.name === name)) {
      cmds.push({ name, raw: line, description: desc || "Commande AES Green" });
    }
  }
  return cmds;
}

const parsedCommands = parseCommands(RAW_COMMANDS_TEXT);
if (!parsedCommands.length) parsedCommands.push({ name: "ping", raw: "/ping", description: "Ping" });

// Slash command data for registration (name + short description)
const slashCommandsData = parsedCommands.map(c => ({
  name: c.name.slice(0, 32),
  description: c.description.slice(0, 100) || "Commande AES Green"
}));

// ---------- in-memory storage ----------
const storage = {
  servers: new Map(), // guildId -> settings { currency, prefix, ... }
  balances: new Map(), // userId -> number
  inventories: new Map(), // userId -> Map(item -> qty)
  shop: new Map(), // guildId -> Map(itemName -> {price, stock, role, disabledGive, reply})
  events: new Map(), // eventId -> eventData
};

// ensure default server settings
function ensureServer(guildId) {
  if (!storage.servers.has(guildId)) {
    storage.servers.set(guildId, {
      currency: "🍪",
      prefix: PREFIXES[0] || "!",
      pickChannels: new Set(),
      settings: {}
    });
  }
  return storage.servers.get(guildId);
}
function ensureBalance(userId) {
  if (!storage.balances.has(userId)) storage.balances.set(userId, 500);
  return storage.balances.get(userId);
}

// ---------- Placeholder replacement system ----------
/**
 * context: { user, member, guild, message, interaction }
 * supports many {variable} as listed by the user.
 */
function replacePlaceholders(text, context = {}) {
  if (!text || typeof text !== "string") return text;

  const { user, member, guild, message, interaction } = context;

  function getUserField(field) {
    if (!user) return "";
    switch (field) {
      case "user": return `<@${user.id}>`;
      case "user_tag": return `${user.username}`;
      case "user_name": return `${user.username}`;
      case "user_avatar": return user.displayAvatarURL ? user.displayAvatarURL() : "";
      case "user_discrim": return user.discriminator || "";
      case "user_id": return user.id;
      case "user_nick": return (member && member.nickname) ? member.nickname : user.username;
      case "user_joindate": return (member && member.joinedAt) ? member.joinedAt.toString() : "Unknown";
      case "user_createdate": return user.createdAt ? user.createdAt.toString() : "";
      case "user_displaycolor": return (member && member.displayHexColor) ? member.displayHexColor : "#000000";
      case "user_boostsince": return "Not a Booster"; // needs nitro check
      case "user_balance": return String(storage.balances.get(user.id) || 0);
      case "user_balance_locale": return (storage.balances.get(user.id) || 0).toLocaleString();
      default: return "";
    }
  }

  function getGuildField(field) {
    if (!guild) return "";
    switch (field) {
      case "server_name": return guild.name;
      case "server_id": return guild.id;
      case "server_membercount": return String(guild.memberCount);
      case "server_botcount": return String(guild.members.cache.filter(m => m.user.bot).size);
      case "server_owner": return `<@${guild.ownerId || ""}>`;
      case "server_createdate": return guild.createdAt ? guild.createdAt.toString() : "";
      case "server_icon": return guild.iconURL ? guild.iconURL() : "";
      default: return "";
    }
  }

  // replace simple {var} usage
  let out = text;

  // newline
  out = out.replace(/{newline}/g, "\n");

  // date
  out = out.replace(/{date}/g, (new Date()).toString());

  // user variables pattern {user_xxx}
  out = out.replace(/\{(user(?:_[a-z0-9:_-]+)?)\}/gi, (m, p1) => {
    // handle {user_item:apple} and similar later
    if (p1.startsWith("user_item") || p1.startsWith("user_item_count") || p1.startsWith("user_inventory")) {
      // simple support: return inventory string if exists
      const parts = p1.split(":");
      if (parts[0] === "user_item" && parts[1]) {
        const item = parts[1];
        const inv = storage.inventories.get(user.id) || new Map();
        const qty = inv.get(item) || 0;
        return `${qty} × ${item}`;
      }
      if (parts[0] === "user_item_count" && parts[1]) {
        const item = parts[1];
        const inv = storage.inventories.get(user.id) || new Map();
        const qty = inv.get(item) || 0;
        return String(qty);
      }
      if (p1 === "user_inventory") {
        const inv = storage.inventories.get(user.id) || new Map();
        const arr = [];
        for (const [k,v] of inv.entries()) arr.push(`${v} × ${k}`);
        return arr.join("\n") || "Aucun item";
      }
      return "";
    }
    // default simple user fields
    return getUserField(p1) || "";
  });

  // server fields {server_x}
  out = out.replace(/\{(server_[a-z0-9_]+)\}/gi, (m, p1) => getGuildField(p1) || "");

  // channel fields {channel}, {channel_name}
  if (message && message.channel) {
    out = out.replace(/\{channel\}/g, `<#${message.channel.id}>`);
    out = out.replace(/\{channel_name\}/g, message.channel.name || "");
    out = out.replace(/\{channel_createdate\}/g, (message.channel.createdAt ? message.channel.createdAt.toString() : ""));
  } else if (interaction && interaction.channel) {
    out = out.replace(/\{channel\}/g, `<#${interaction.channel.id}>`);
    out = out.replace(/\{channel_name\}/g, interaction.channel.name || "");
  }

  // message info
  if (message) {
    out = out.replace(/\{message_id\}/g, message.id || "");
    out = out.replace(/\{message_content\}/g, message.content || "");
    out = out.replace(/\{message_link\}/g, `https://discord.com/channels/${message.guild ? message.guild.id : "@me"}/${message.channel.id}/${message.id}`);
  }

  // misc placeholders: allow custom modifybal syntax simple {modifybal:+100}
  out = out.replace(/\{modifybal:([^\}]+)\}/gi, (m, p1) => {
    // p1 example: +100 | user#0001 or +100 | [$1]
    // We'll support simple +N|-N|=N for current user
    try {
      const parts = p1.split("|").map(s => s.trim());
      const op = parts[0];
      let targetUser = user;
      if (parts[1]) {
        // try parse user mention or id (basic)
        const u = parts[1];
        const idMatch = u.match(/<@!?(\d+)>/) || u.match(/^(\d+)$/);
        if (idMatch) {
          const uid = idMatch[1];
          targetUser = { id: uid, username: uid }; // minimal
        }
      }
      if (!targetUser) return "";
      const cur = storage.balances.get(targetUser.id) || 0;
      if (op.startsWith("+")) {
        const n = Number(op.slice(1));
        const val = cur + (isNaN(n) ? 0 : n);
        storage.balances.set(targetUser.id, val);
        return String(val);
      }
      if (op.startsWith("-")) {
        const n = Number(op.slice(1));
        const val = cur - (isNaN(n) ? 0 : n);
        storage.balances.set(targetUser.id, val);
        return String(val);
      }
      if (op.startsWith("=")) {
        const n = Number(op.slice(1));
        storage.balances.set(targetUser.id, isNaN(n) ? cur : n);
        return String(storage.balances.get(targetUser.id));
      }
      return String(cur);
    } catch (e) {
      return "";
    }
  });

  // remove any unreplaced unknown {foo} to empty string to be safe
  out = out.replace(/\{[^\}\{]+\}/g, "");

  return out;
}

// ---------- Client & commands collection ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});
client.commands = new Collection();
parsedCommands.forEach(c => client.commands.set(c.name, c));

// ---------- Helper embed ----------
function makeEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x2ecc71).setTimestamp();
}

// ---------- ready & register slash commands ----------
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}. Registering ${slashCommandsData.length} slash commands...`);
  try {
    if (GUILD_ID) {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.commands.set(slashCommandsData);
      console.log("Registered slash commands to guild:", GUILD_ID);
    } else {
      await client.application.commands.set(slashCommandsData);
      console.log("Registered global slash commands (may take up to an hour).");
    }
  } catch (err) {
    console.error("Error registering slash commands:", err);
  }
});

// ---------- Slash interaction handler ----------
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;
    const def = client.commands.get(cmd);
    if (!def) {
      return interaction.reply({ content: "Commande non reconnue.", ephemeral: true });
    }

    // Implement a few example commands with logic
    if (cmd === "ping") {
      return interaction.reply({ content: `🏓 Pong! ${client.ws.ping}ms` });
    }
    if (cmd === "balance") {
      // try to fetch option user if exists (we didn't define options, fallback to interaction.user)
      const u = interaction.options?.getUser && interaction.options.getUser("user") ? interaction.options.getUser("user") : interaction.user;
      ensureBalance(u.id);
      const bal = storage.balances.get(u.id) || 0;
      return interaction.reply({ embeds: [makeEmbed("Balance", `${u.tag} a ${bal} ${ensureServer(interaction.guildId || interaction.channel?.guildId).currency}`)] });
    }

    // Generic placeholder reply
    const raw = def.raw || `/${cmd}`;
    const reply = makeEmbed(`/${cmd}`, `Commande placeholder pour **/${cmd}**.\n\nSource: \n\`\`\`${raw}\`\`\``);
    return interaction.reply({ embeds: [reply] });
  } catch (err) {
    console.error("interaction error:", err);
    if (!interaction.replied) {
      try { await interaction.reply({ content: "Erreur interne.", ephemeral: true }); } catch {}
    }
  }
});

// ---------- Message (prefix) handler ----------
client.on("messageCreate", async (message) => {
  try {
    if (message.author?.bot || !message.guild) return;
    const guildSettings = ensureServer(message.guild.id);

    // find a used prefix from env or server settings
    const allPrefixes = PREFIXES.slice();
    if (guildSettings && guildSettings.prefix && !allPrefixes.includes(guildSettings.prefix)) allPrefixes.unshift(guildSettings.prefix);

    const usedPrefix = allPrefixes.find(p => message.content.startsWith(p));
    if (!usedPrefix) return;

    const raw = message.content;
    const args = raw.slice(usedPrefix.length).trim().split(/ +/);
    const cmdName = (args.shift() || "").toLowerCase();
    if (!cmdName) return;

    const command = client.commands.get(cmdName);
    if (!command) return; // not a known command

    // examples of commands implemented for prefix usage
    if (cmdName === "ping") {
      return message.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    if (cmdName === "balance") {
      const target = message.mentions.users.first() || message.author;
      ensureBalance(target.id);
      const bal = storage.balances.get(target.id) || 0;
      return message.reply({ embeds: [makeEmbed("Balance", `${target.tag} a ${bal} ${guildSettings.currency}`)] });
    }

    // generic placeholder for any other command
    const embed = makeEmbed(`${usedPrefix}${cmdName}`, `Commande exécutée (placeholder).\nSource:\n\`\`\`${command.raw}\`\`\``);
    return message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("message handler error:", err);
    try { await message.reply("Erreur lors du traitement."); } catch {}
  }
});

// ---------- ensure help command present ----------
if (!client.commands.has("help")) {
  client.commands.set("help", { name: "help", raw: "/aide /help", description: "Affiche l'aide" });
}

// ---------- Login ----------
client.login(TOKEN).catch(err => {
  console.error("Login failed:", err);
  process.exit(1);
});
