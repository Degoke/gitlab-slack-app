require('dotenv').config()
const { App } = require('@slack/bolt')

const app = new App({
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.event('app_home_opened', async({ event, client, context}) => {
    try {
        await client.views.publish({
            user_id: event.user,
            view: {
                "attachments": [
                    {
                        "color": "#f2c744",
                        "blocks": [
                            {
                                "type": "section",
                                "text": {
                                    "type": "plain_text",
                                    "text": "This is a plain text section block.",
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "This is a mrkdwn section block :ghost: *this is bold*, and ~this is crossed out~, and <https://google.com|this is a link>"
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": "This is a section block with a button."
                                },
                                "accessory": {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Click Me",
                                        "emoji": true
                                    },
                                    "value": "click_me_123",
                                    "action_id": "button-action"
                                }
                            },
                            {
                                "type": "divider"
                            }
                        ]
                    }
                ]
            }
            }
            )
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