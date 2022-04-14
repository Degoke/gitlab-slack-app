require('dotenv').config()
const { App } = require('@slack/bolt')

const app = new App({
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.event('app_home_opened', async({ event, client, context}) => {
    try {
        const result = await client.views.publish({
            user_id: event.user,
            view: {
                type: 'home',
                callback_id: 'home_view'
            },
            blockes: [
                {
                    "type": "section",
                    "text": {
                        "type": 'mrkdwn',
                        "text":"welcome to your _App's Home_* :tada:"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Empty button"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Click me!"
                            }
                        }
                    ]
                }
            ]
        })
    }
    catch(error) {
        console.log(error)
    }
});

(async () => {
    const port = process.env.PORT || 3000
    await app.start(port);

    console.log(`App is running on ${port}`)
})()