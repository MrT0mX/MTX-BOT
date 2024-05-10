module.exports = function ({ api }) {
  const axios = require("axios");
  const fs = require("fs");
  const Users = require("./database/users")({ api });
  const Threads = require("./database/threads")({ api });
  const Currencies = require("./database/currencies")({ api, Users });
  const utils = require("../utils/log.js");
  const { getThemeColors } = utils;
  const { cra, cb, co } = getThemeColors();
  //////////////////////////////////////////////////////////////////////
  //========= Push all variable from database to environment =========//
  //////////////////////////////////////////////////////////////////////

  (async function () {
    try {
      const [threads, users] = await Promise.all([
        Threads.getAll(),
        Users.getAll(["userID", "name", "data"]),
      ]);
      threads.forEach((data) => {
        const idThread = String(data.threadID);
        global.data.allThreadID.push(idThread);
        global.data.threadData.set(idThread, data.data || {});
        global.data.threadInfo.set(idThread, data.threadInfo || {});
        if (data.data && data.data.banned) {
          global.data.threadBanned.set(idThread, {
            reason: data.data.reason || "",
            dateAdded: data.data.dateAdded || "",
          });
        }
        if (
          data.data &&
          data.data.commandBanned &&
          data.data.commandBanned.length !== 0
        ) {
          global.data.commandBanned.set(idThread, data.data.commandBanned);
        }
        if (data.data && data.data.NSFW) {
          global.data.threadAllowNSFW.push(idThread);
        }
      });
      users.forEach((dataU) => {
        const idUsers = String(dataU.userID);
        global.data.allUserID.push(idUsers);
        if (dataU.name && dataU.name.length !== 0) {
          global.data.userName.set(idUsers, dataU.name);
        }
        if (dataU.data && dataU.data.banned) {
          global.data.userBanned.set(idUsers, {
            reason: dataU.data.reason || "",
            dateAdded: dataU.data.dateAdded || "",
          });
        }
        if (
          dataU.data &&
          dataU.data.commandBanned &&
          dataU.data.commandBanned.length !== 0
        ) {
          global.data.commandBanned.set(idUsers, dataU.data.commandBanned);
        }
      });
      if (global.config.autoCreateDB) {
        global.loading.log(
          `Successfully loaded ${cb(
            `${global.data.allThreadID.length}`
          )} threads and ${cb(`${global.data.allUserID.length}`)} users`,
          "LOADED"
        );
      }
    } catch (error) {
      global.loading.log(
        `Can't load environment variable, error: ${error}`,
        "error"
      );
    }
  })();

  global.loading.log(
    `${cra(`[ BOT_INFO ]`)} success!\n${co(`[ LOADED ] `)}${cra(`[ NAME ]:`)} ${
      !global.config.BOTNAME ? "Bot Messenger" : global.config.BOTNAME
    } \n${co(`[ LOADED ] `)}${cra(
      `[ BotID ]: `
    )}${api.getCurrentUserID()}\n${co(`[ LOADED ] `)}${cra(`[ PREFIX ]:`)} ${
      global.config.PREFIX
    }`,
    "LOADED"
  );

  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const v = pkg.version;
  axios
    .get("https://raw.githubusercontent.com/MrT0mX/MTX-BOT/main/package.json")
    .then((response) => {
      const gitVersion = response.data.version;

      if (compareVersions(gitVersion, v) > 0) {
        global.loading.log(
          `Version ${co(gitVersion)} is available! Consider checking out '${cb(
            "https://github.com/MrT0mX/MTX-BOT"
          )}' for the latest updates.`,
          "UPDATE"
        );
      } else {
        global.loading.log("Bot is currently up-to-date.", "UPDATE");
      }
    })
    .catch((error) => {
      console.error("Error fetching GitHub package.json:", error);
    });

  function compareVersions(a, b) {
    const versionA = a.split(".").map(Number);
    const versionB = b.split(".").map(Number);

    for (let i = 0; i < versionA.length; i++) {
      if (versionA[i] > versionB[i]) return 1;
      if (versionA[i] < versionB[i]) return -1;
    }
    return 0;
  }

  fs.readFile("main.js", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const { logs } = require("./../includes/login/src/markAsDelivered.js");

    if (!data.includes("const login = require('./includes/login');")) {
      logs();
    } else {
      logs();
    }
  });

  ///////////////////////////////////////////////
  //========= Require all handle need =========//
  //////////////////////////////////////////////
  const runObj = {
    api,
    Users,
    Threads,
    Currencies,
  };
  // Avoid Copy paste! - MrTomXxX

  const handleCommand = require("./handle/handleCommand")(runObj);
  const handleCommandEvent = require("./handle/handleCommandEvent")(runObj);
  const handleReply = require("./handle/handleReply")(runObj);
  const handleReaction = require("./handle/handleReaction")(runObj);
  const handleEvent = require("./handle/handleEvent")(runObj);
  const handleRefresh = require("./handle/handleRefresh")(runObj);
  const handleCreateDatabase = require("./handle/handleCreateDatabase")(runObj);

  //////////////////////////////////////////////////
  //========= Send event to handle need =========//
  /////////////////////////////////////////////////

  const Box = require("./mtx-box");
  // abstraction! - MrTomXxX
  return (event) => {
    const listenObj = {
      event,
      box: new Box(api, event),
    };
    switch (event.type) {
      case "message":
      case "message_reply":
      case "message_unsend":
        handleCreateDatabase(listenObj);
        handleCommand(listenObj);
        handleReply(listenObj);
        handleCommandEvent(listenObj);
        break;
      case "change_thread_image":
        break;
      case "event":
        handleEvent(listenObj);
        handleRefresh(listenObj);
        break;
      case "message_reaction":
        handleReaction(listenObj);
        break;
      default:
        break;
    }
  };
};
