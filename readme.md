# Vercel deployment

- see <https://vercel.com/guides/using-express-with-vercel>

## setup

`npm init`
`npm install express mongoose`

### create vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/app.js"
    }
  ]
}
```

### create connection

`npx vercel@latest login`

(select github)

### create project and link code

`npx vercel link`

## create env variables

`npx vercel env <ENV_VAR_NAME>`

e.g. `npx vercel env DB_CONNECTION_STRING`
> Vercel CLI 33.7.0
? What’s the value of DB_CONNECTION_STRING?

? Add DB_CONNECTION_STRING to which Environments (select multiple)?
 ◉ Production
 ◉ Preview
❯◉ Development

- you can check at:
Project -> Project Settings -> Environment Variables

<https://vercel.com/adamrhunters-projects/<PROJECT_NAME>/settings/environment-variables>

## test locally

`npx vercel dev`

## deploy

`npx vercel --prod`

- then visit your production url (see below to get that)

## production url

use:

`npx vercel project ls`

Project Name       Latest Production URL                      Updated
vercel             https://vercel-eight-wheat-23.vercel.app   10m
