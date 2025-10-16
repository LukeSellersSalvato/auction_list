# auction-list

Vercel Edge Function for generating auction list PDFs from Salvato API data.

## Installation

```bash
bun install
```

## Environment Variables

Create a `local.env` file (or `.env`) with:

```env
SALVATO_PRODUCTION_URL=https://your-api-url.com
SALVATO_CLIENT_ID=your_client_id
SALVATO_CLIENT_SECRET=your_client_secret
DROPBOX_ACCESS_TOKEN=your_dropbox_access_token
DROPBOX_FOLDER=/Salvato/Auction Lists
```

### Getting a Dropbox Access Token

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access" and "Full Dropbox" access
4. Name your app (e.g., "Salvato Auction Lists")
5. In the app settings, go to the "Permissions" tab
6. Enable these permissions:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write`
   - `sharing.read`
7. Go to the "Settings" tab and generate an access token

## Local Development

**Recommended:** Use the Bun test server (Vercel dev has known issues with Puppeteer):

```bash
bun test-server.ts
```

Then test with:
```bash
curl http://localhost:3001/api/salvato_auction_list
```

**Alternative:** Use Vercel CLI (may hang on response, but works in production):
```bash
bunx vercel dev
```

## Deployment

Deploy to Vercel:

```bash
bunx vercel deploy
```

The function will be available at `/api/salvato_auction_list` and will run daily via cron at midnight (configured in `vercel.json`).

## API Endpoint

**GET** `/api/salvato_auction_list`

Fetches auction data from Salvato API, generates PDF(s), uploads to Dropbox, and returns download links.

Returns:
```json
{
  "success": true,
  "pdfCount": 1,
  "pdfs": [
    {
      "name": "auction_list_2025-10-11T17-57-51-197Z.pdf",
      "path": "/Salvato/Auction Lists/auction_list_2025-10-11T17-57-51-197Z.pdf",
      "downloadUrl": "https://dl.dropboxusercontent.com/s/xxxxx/auction_list.pdf"
    }
  ]
}
```

The PDFs are automatically uploaded to your configured Dropbox folder and shared links are returned for team access.
