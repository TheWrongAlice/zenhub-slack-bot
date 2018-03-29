'use strict';

/**
 * A Bot for Slack!
 */

const request = require('request');
const removeMd = require('remove-markdown');
const config = require('./config');


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
  if (installer) {
    bot.startPrivateConversation({user: installer}, function (err, convo) {
      if (err) {
        console.log(err);
      }
      else {
        convo.say('I am a bot that has just joined your team');
        convo.say('You must now /invite me to a channel so that I can be of use!');
      }
    });
  }
}


/**
 * Initialize Slack integration
 */

let controller;
if (config.slackToken) {
  //Treat this as a custom integration
  const customIntegration = require('./lib/custom_integrations');
  const token = config.slackToken;
  const ciConfig = { json_file_store: './db_slack_bot_ci/' };
  controller = customIntegration.configure(token, ciConfig, onInstallation);
}
else {
  console.log('Error: Please specify slackToken in the configuration.');
  process.exit(1);
}


/**
 * Core bot logic goes here!
 */

// Register listener
controller.hears([/(#|issue-|issues\/)[0-9]+/g], ['ambient', 'direct_message'], function (bot, message) {
  const matches = message.match;
  if (matches) {
    for (let i=0; i<matches.length; i++) {
      const issueNum = parseInt(matches[i].match(/\d+$/));
      postIssueData(bot, message, issueNum);
    }
  }
});

// Post issue data to Slack
function postIssueData(bot, message, issueNum) {

  let requestOpts = [
    {
      url: `https://api.github.com/repos/${config.githubUser}/${config.githubRepoName}/issues/${issueNum}`,
      method: 'GET',
      headers: {
        'User-Agent':   'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `token ${config.githubToken}`
      }
    },
    {
      url: `https://api.zenhub.io/p1/repositories/${config.githubRepoId}/issues/${issueNum}`,
      method: 'GET',
      headers: {
        'User-Agent':   'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Authentication-Token': config.zenhubToken
      }
    }
  ];

  let promises = [];
  for (let i=0; i<requestOpts.length; i++) {
    promises.push(
      new Promise(function(resolve, reject) {
        request(requestOpts[i], function (error, response, body) {
          if (error) return reject(error);
          resolve(JSON.parse(body));
        });
      })
    );
  }

  Promise.all(promises)
    .then(function(data) {
      const githubData = data[0];
      const zenhubData = data[1];

      if (githubData.message) {
        throw new Error(`Failed to pull data from Github. They told me: ${codify(githubData.message)}`);
      }
      if (zenhubData.message) {
        throw new Error(`Failed to pull data from Zenhub. They told me: ${codify(zenhubData.message)}`);
      }

      bot.reply(message, {
        "attachments": [
          {
            "color": "#5e60ba",
            "title": `${githubData.title} #${githubData.number}`,
            "title_link": `https://app.zenhub.com/workspace/o/${config.githubUser}/${config.githubRepoName}/issues/${githubData.number}`,
            "fields": [
              {
                "value": truncate(removeMd(githubData.body), 160)
              },
              {
                "title": "Status",
                "value": zenhubData.pipeline.name,
                "short": true
              },
              {
                "title": "Assignee",
                "value": githubData.assignee ? githubData.assignee.login : 'Unassigned',
                "short": true
              }
            ]
          }
        ]
      });
    })
    .catch(function(err) {
      console.log(err);
      bot.reply(message, ':warning: ' + err.message);
    });
}

// Truncate a string to desired length
function truncate(s, len) {
  const suf = s.length > len ? '...' : '';
  return s.substring(0, len) + suf;
}

// Enclose a string in a code block (Slack markdown)
function codify(s) {
  return `\`${s}\``
}
