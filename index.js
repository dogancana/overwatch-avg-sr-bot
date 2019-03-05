// https://discordapp.com/oauth2/authorize?client_id=552455249621811210&scope=bot

require("isomorphic-fetch");
require('dotenv').config()
const Discord = require("discord.js");
const cheerio = require("cheerio");
const http = require('http');

const token = process.env.DISCORD_APP_TOKEN;
const averageSRCommand = "!avgsr";
const averageSRResult = "Average SR Result:";
const carrerUrl = "https://www.overbuff.com/players";

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Command
client.on("message", handleCommand);
client.on("messageUpdate", (_, m) => handleCommand(m));
client.on("messageReactionAdd", r => handleCommand(r.message));
client.on("messageReactionRemove", r => handleCommand(r.message));
client.on("messageReactionRemoveAll", handleCommand);

// Delete
client.on("messageReactionAdd", r => handleDelete(r.message));

client.login(token);

// Dummy
http.createServer((req, res) => {
  res.write('OK')
  res.end()
}).listen(process.env.PORT || 80)

function handleCommand(msg) {
  const c = msg.content;
  if (c.indexOf(averageSRCommand) > -1) {
    handleAverageSRCommand(msg);
  }
}

function handleDelete(msg) {
  if (msg.content.indexOf(averageSRResult) > -1) {
    msg.delete()
  }
}

async function handleAverageSRCommand(msg) {
  const playersStr = msg.content.split(averageSRCommand)[1].trim();
  let players = playersStr.split(",").map(s => s.trim());

  const r = await playersToResultMessage(players);
  msg.reply(r);
}

function averageSR(players) {
  const ranked = players.filter(p => !!p.rank);
  return (
    ranked.map(r => r.rank).reduce((curr, acc) => acc + curr, 0) / ranked.length
  ).toFixed(0);
}

async function playersToResultMessage(p) {
  let players = p.map(btag => ({
    btag,
    isValid: isBattleTag(btag)
  }));
  players = await populatePlayerRanks(players);

  const resultMessage = `
${averageSRResult}
<${players.map(playerStr).join(", ")}>
Average: ${averageSR(players)}
  `;

  function playerStr(p) {
    return `${p.btag.split("#")[0]}: ${p.rank || p.error || "???"}`;
  }

  return resultMessage;
}

async function populatePlayerRanks(players) {
  return Promise.all(
    players.map(async player => {
      if (player.isValid) {
        const response = await fetch(
          `${carrerUrl}/pc/${player.btag.replace("#", "-")}`
        );
        const text = await response.text();
        const $ = cheerio.load(text);
        const rank = $(".player-skill-rating")
          .first()
          .text();
        const rankNumber = parseInt(rank, 10);

        return {
          ...player,
          rank: rankNumber !== NaN ? rankNumber : undefined
        };
      } else {
        return {
          ...player,
          error: "Battle tag not valid"
        };
      }
    })
  );
}

function isBattleTag(str) {
  return /^[a-zA-Z][a-zA-Z0-9]{2,19}#[0-9]+$/.test(str);
}
