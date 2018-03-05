/**
 * A Bot for Slack!
 */

request = require('request');


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
 * Configure the persistence options
 */

let config = {};
if (process.env.MONGOLAB_URI) {
  const BotkitStorage = require('botkit-storage-mongo');
  config = {
    storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
  };
}
else {
  config = {
    json_file_store: ((process.env.SLACK_TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
  };
}


/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

let controller;
if (process.env.SLACK_TOKEN) {
  //Treat this as a custom integration
  const customIntegration = require('./lib/custom_integrations');
  const token = process.env.SLACK_TOKEN;
  controller = customIntegration.configure(token, config, onInstallation);
}
else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
  //Treat this as an app
  const app = require('./lib/apps');
  controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
}
else {
  console.log('Error: If this is a custom integration, please specify SLACK_TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
  process.exit(1);
}


/**
 * Core bot logic goes here!
 */

// What the bot should listen for
const patterns = [
  '#[0-9]+',
  'issue-[0-9]+',
  'issues\/[0-9]+'
];

// Register listener
controller.hears(patterns, ['ambient', 'direct_message'], function (bot, message) {
  const matches = message.match[0].match(/\d+$/);
  if (matches) {
    const issueNum = parseInt(matches[0]);
    postIssueData(bot, message, issueNum);
  }
});

// Post issue data to Slack
function postIssueData(bot, message, issueNum) {

  let request_opts = [
    {
      url: `https://api.github.com/repos/${process.env.GITHUB_USER}/${process.env.GITHUB_REPO_NAME}/issues/${issueNum}`,
      method: 'GET',
      headers: {
        'User-Agent':   'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    },
    {
      url: `https://api.zenhub.io/p1/repositories/${process.env.GITHUB_REPO_ID}/issues/${issueNum}`,
      method: 'GET',
      headers: {
        'User-Agent':   'Super Agent/0.0.1',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Authentication-Token': process.env.ZENHUB_TOKEN
      }
    }
  ];

  let promises = [];
  for (let i=0; i<request_opts.length; i++) {
    promises.push(
      new Promise(function(resolve, reject) {
        request(request_opts[i], function (error, response, body) {
          if (error) return reject(error);
          resolve(JSON.parse(body));
        });
      })
    );
  }

  Promise.all(promises)
    .then(function(data) {
      const github_data = data[0];
      const zenhub_data = data[1];

      if (github_data.message) {
        throw new Error(`Failed to pull data from Github. They told me: ${codify(github_data.message)}`);
      }
      if (zenhub_data.message) {
        throw new Error(`Failed to pull data from Zenhub. They told me: ${codify(zenhub_data.message)}`);
      }

      bot.reply(message, {
        "attachments": [
          {
            "color": "#36a64f",
            "title": github_data.title,
            "title_link": github_data.html_url,
            "fields": [
              {
                "title": "Status",
                "value": codify(zenhub_data.pipeline.name),
                "short": true
              },
              {
                "title": "Type",
                "value": codify(zenhub_data.is_epic ? 'Epic' : 'Task'),
                "short": true
              },
              {
                "title": "Assignee",
                "value": codify(github_data.assignee.login),
                "short": true
              },
              {
                "title": "Labels",
                "value": github_data.labels.map(function(obj) {
                  return codify(obj.name)
                }).join(', '),
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

// Enclose a string in a code block (Slack markdown)
function codify(s) {
  return `\`${s}\``
}
