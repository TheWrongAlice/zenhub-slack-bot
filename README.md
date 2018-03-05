# zendesk-slack-bot

Based on [slackapi/easy-peasy-bot](https://github.com/slackapi/easy-peasy-bot)

## Installation

You need to set some environment variables.
```
GITHUB_USER=TheWrongaAlice          # Name of your Github user
GITHUB_REPO_NAME=zendesk-slack-bot  # Name of your Github repository
GITHUB_REPO_ID=123928679            # ID of your Github repository
GITHUB_TOKEN=yourtoken123           # Auth token for your Github account/repo
ZENHUB_TOKEN=yourtoken123           # Auth token for your Zenhub account
SLACK_TOKEN=yourtoken123            # Auth token for your Slack bot
```

Install dependencies
```
npm install
```

Run server
```
npm start
```