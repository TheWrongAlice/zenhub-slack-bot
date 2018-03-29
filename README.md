# zenhub-slack-bot

Get Zenhub issue previews in Slack when an issue is mentioned.

<img src="https://github.com/TheWrongAlice/zenhub-slack-bot/blob/master/screenshot.png" width="500">

_Based on [slackapi/easy-peasy-bot](https://github.com/slackapi/easy-peasy-bot)_

## Installation

### Creating the Slack app
The easiest way is to create a configuration of Slack's own _Bots_ app.<br />
Go to https://slack.com/apps/A0F7YS25R-bots and click "Add Configuration" to get started.

### Setting up the bot application
_We'll assume that you are familiar with node.js. Otherwise there are tons of guides online._

Rename `config.example.js` to `config.js` and update with your information.

Install some node dependencies
```
npm install
```

Run server
```
npm start
```

## Usage

Add the bot to any channel, or include it in your direct message conversations.<br />
The bot will recognize issues by any these formats:
```
#123
issue-123
issues/123
https://github.com/TheWrongAlice/zenhub-slack-bot/issues/123
https://app.zenhub.com/workspace/o/thewrongalice/zenhub-slack-bot/issues/123
```