# Little Eyes International — Website

## Project Overview
Public website for Little Eyes International, a 501(c)(3) pediatric eye care nonprofit based in Arizona. Runs as a Node.js/Express app on AWS EC2, port 3000.

## Tech Stack
- **Server**: Express.js (`app.js`) with EJS templating
- **Styles**: Single stylesheet at `public/css/styles.css`; Bootstrap 5.0.2 via CDN
- **Views**: EJS files in `views/`, shared partials in `views/partials/`
- **Security**: Helmet.js CSP — any new CDN or external resource must be added to the `scriptSrc`, `styleSrc`, `fontSrc`, or `imgSrc` directives in `app.js`
- **Fonts**: Montserrat and Open Sans Condensed via Google Fonts (already in CSP)

## Routes
| Route | Method | View | Notes |
|---|---|---|---|
| `/` | GET | `home.ejs` | |
| `/about` | GET | `about.ejs` | |
| `/donate` | GET | `donate.ejs` | Donorbox iframe |
| `/signup` | GET | `signup.ejs` | Mailchimp form |
| `/blog` | GET | `blog.ejs` | DynamoDB + S3, 1-hour cache |
| `/subscribe` | POST | — | Mailchimp API |
| `/resetDBTimer` | POST | — | AWS Lambda webhook; resets DynamoDB cache |

## External Integrations
- **Mailchimp** — email list (`/subscribe` POST → Mailchimp API)
- **AWS DynamoDB** — blog post storage (table: `LEI-Blog`); hourly in-memory cache in `app.js` via `lastUpdateTime` / `lastDBData`
- **AWS S3** — blog images (bucket: `lei-blog-photos`); signed URLs per request
- **Donorbox** — embedded iframe on donate page; `donorbox.org` is whitelisted in CSP `frameSrc` and `scriptSrc`

## View / Partial Pattern
Every page uses:
```ejs
<%- include("partials/header"); -%>
<%- include("partials/navbar"); -%>
<!-- page content -->
<%- include("partials/footer"); -%>
```
- `header.ejs` — `<head>` block + `<body>` open + CDN links
- `navbar.ejs` — Bootstrap navbar
- `footer.ejs` — Bootstrap JS bundle + `</body></html>`

## Blog Post Format (DynamoDB)
- Body text is stored as a single string, paragraphs delimited by `&&&&&`
- Image placeholders in body use `^^^^^` token; replaced with S3 signed URLs in order

## Environment Variables (`.env`, never commit)
`MAILCHIMP_API_URL`, `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `S3_BUCKET`, `TABLE_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_AUTH_CODE`

## Key Conventions
- All CSS lives in one file: `public/css/styles.css`
- No client-side JS beyond Bootstrap bundle
- Images served from `public/images/`
- `signup.ejs` / `success.ejs` / `failure.ejs` do **not** include the navbar (standalone flow)
- `donate.ejs` does **not** include the navbar
