require('dotenv').config()
const { App, ExpressReceiver, LogLevel } = require('@slack/bolt')
const { ConsoleLogger } = require('@slack/logger')
const { WebClient } = require('@slack/web-api')
const express = require('express')
const db = require('./db/models')

const receiver = new ExpressReceiver({signingSecret: process.env.SLACK_SIGNING_SECRET})
receiver.router.use(express.urlencoded({ extended: true }))
receiver.router.use(express.json())

const logger = new ConsoleLogger()

const app = new App({
    token: process.env.SLACK_TOKEN,
    receiver,
    logLevel: LogLevel.DEBUG
});

const webClient = new WebClient(process.env.SLACK_TOKEN);

const channelId = 'C03BCKG55LN'

receiver.router.post('/webhook/issues', async(req, res) => {
    //console.log("body",req.body)
    if(process.env.GITLAB_SECRET !== req.headers['x-gitlab-token']) {
        logger.error("invalid app secret from request", req.headers)
        res.writeHead(401).end()
        return
    }
    console.log(req.body)
    let assignees = req.body.assignees
    
    const users = await db.Member.findAll()
    let slackUsers = [];
    let assigneesBlock = []

    assignees.forEach((assignee) => {
        const user = users.filter((user) => user.gitlabUsername === assignee.username)

        if(user[0]) {
            slackUsers.push(user[0].slackId)
             assigneesBlock.push({"type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Hi <@${user[0].slackId}> :wave:`
                }})
        }
        else {
            assigneesBlock.push({"type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Hi <!channel> :wave:`
                }})
        }
    })
    const eventType =  req.body['event_type']
    const userName = req.body.user.name
    const action = req.body['object_attributes'].action
    const title = req.body['object_attributes'].title
    const url = req.body['object_attributes'].url
    console.log(url)

    console.log(assigneesBlock)

    await webClient.chat.postMessage(chatMessage(channelId, eventType, title, action, userName, url, assigneesBlock))

    if(slackUsers[0]) {
        await slackUsers.forEach(async (user) => {
            await webClient.chat.postMessage(chatMessage(user, eventType, title, action, userName, url, assigneesBlock))
        })
    }
    res.writeHead(201);
    res.end()
})

const chatMessage = (channelId, eventType, title, action, userName, url, assigneesBlock) => ({
        channel: channelId,
        "link_names": true,
        "parse": "full",
        text: `${eventType} ${title} was ${action}ed by ${userName}. View here ${url}`,
        "blocks": [
            ...assigneesBlock,
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `${eventType} ${title} was ${action}d by ${userName}`
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "view more",
                            "emoji": true
                        },
                        "value": "click_me_123",
                        "url": url
                    }
                ]
            }
        ]
    })

receiver.router.get('/channels', async (req, res) => {
    /**
    let channel
    channels.foreach channel isMenmber = true
    channel name channel id
     */
    const result = await webClient.conversations.list({types: 'private_channel,public_channel'})
    const channel = result.channels.filter((channel) => channel['is_member'] === true)
    res.json(channel).end()
})

receiver.router.get('/members', async (req, res) => {
    try {
        const result = await webClient.conversations.members({channel: channelId})
    const members = result.members;

    await members.forEach(async (member) => {
        const result = await webClient.users.info({user: member})
        const membersName = result.user['real_name']

        const newEntry = await db.Member.create({
            slackId: member,
            slackUsername: membersName,
        })

        console.log(newEntry.dataValues)
    })
    
    res.json({message: 'Success'}).end()
    }
    catch(error) {
        throw error
    }
})

receiver.router.get('/members/all', async (req, res) => {
    const result = await db.Member.findAll()
    res.json(result).end()
})

receiver.router.post('/slack/interactive-endpoint', async (req, res) => {
    const payload = JSON.parse(req.body.payload)
    console.log(payload)

    if(payload.type === 'view_submission') {
        const usernameInput = payload.view.state.values.add_username.add_username_input.value;
        const result = await db.Member.update({ gitlabUsername: usernameInput }, {
            where: {
                slackId: payload.view.private_metadata
            }
        })

        const users = await db.Member.findAll()

      await webClient.views.publish({
  
        user_id: payload.user.id,
  
        view: homeView(users)
      });
        console.log(result)
    }

    if(payload.type === 'block_actions') {
        if(payload.actions[0].action_id === 'add_gitlab_username_button') {
            console.log(payload.actions[0].value)
        await webClient.views.open({
  "trigger_id": payload.trigger_id,
  "view": {
	"type": "modal",
    "private_metadata": payload.actions[0].value,
	"submit": {
		"type": "plain_text",
		"text": "Submit",
		"emoji": true
	},
	"close": {
		"type": "plain_text",
		"text": "Cancel",
		"emoji": true
	},
	"title": {
		"type": "plain_text",
		"text": "Add Gitlab Username",
		"emoji": true
	},
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "plain_text",
				"text": "Add gitlab username for Adewoye Adegoke",
				"emoji": true
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "input",
            "block_id": "add_username",
			"label": {
				"type": "plain_text",
				"text": "Gitlab Username",
				"emoji": true
			},
			"element": {
				"type": "plain_text_input",
                "action_id": "add_username_input"
			}
		}
	]
}
})
    }
    else if(payload.actions[0].action_id === 'update_users') {
        console.log(payload.user.id)
        const users = await db.Member.findAll()

      await webClient.views.publish({
  
        user_id: payload.user.id,
  
        view: homeView(users)
      });
    }
    }
    
    res.writeHead(200).end()
})

const homeView = (users) => {
    const usersBlock = users.map((user) => ({
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `*${user.slackUsername}*\nGitlab username | @${user.gitlabUsername || 'No Username added'}`
			},
			"accessory": {
				"type": "button",
				"text": {
					"type": "plain_text",
					"text": user.gitlabUsername ? "Edit Username" : "Add Username",
					"emoji": true
				},
				"value": user.slackId,
                "action_id": "add_gitlab_username_button"
			}
		}
        ))
     return {
          type: 'home',
          callback_id: 'home_view',
  
          /* body of the view */
          blocks: [
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "Gitlab Notifications:"
			}
		},
		{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": "Update Users",
						"emoji": true
					},
					"style": "primary",
					"value": "update_users",
                    "action_id": "update_users"
				}
			]
		},
		{
			"type": "context",
			"elements": [
				{
					"type": "image",
					"image_url": "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
					"alt_text": "placeholder"
				}
			]
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Your Users *"
			}
		},
		{
			"type": "divider"
		},
        ...usersBlock
	]
        }
}

app.event('app_home_opened', async ({ event, client, context }) => {
    try {
        const users = await db.Member.findAll()

      const result = await client.views.publish({
  
        user_id: event.user,
  
        view: homeView(users)
      });
    }
    catch (error) {
      console.error(error);
    }
  });

(async () => {
    const port = process.env.PORT || 3000
    await app.start(port);

    console.log(`App is running on ${port}`)
})()