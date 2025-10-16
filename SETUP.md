# Dropbox Integration Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up Dropbox App:**
   - Go to https://www.dropbox.com/developers/apps
   - Click "Create app"
   - Choose "Scoped access" → "Full Dropbox"
   - Name it: "Salvato Auction Lists"
   - Go to "Permissions" tab and enable:
     - `files.content.write`
     - `files.content.read`
     - `sharing.write`
     - `sharing.read`
   - Click "Submit" to save permissions
   - Go to "Settings" tab
   - Under "Generated access token", click "Generate"
   - Copy the token

3. **Configure environment variables:**
   
   Add to your `local.env` (or `.env`):
   ```env
   SALVATO_PRODUCTION_URL=https://your-api-url.com
   SALVATO_CLIENT_ID=your_client_id
   SALVATO_CLIENT_SECRET=your_client_secret
   DROPBOX_ACCESS_TOKEN=paste_token_here
   DROPBOX_FOLDER=/Salvato/Auction Lists
   ```

4. **Test locally:**
   ```bash
   bun test-server.ts
   ```
   
   In another terminal:
   ```bash
   curl http://localhost:3001/api/salvato_auction_list
   ```

5. **Deploy to Vercel:**
   
   First, add environment variables in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add all the variables from your `local.env`
   
   Then deploy:
   ```bash
   bunx vercel deploy --prod
   ```

## How It Works

1. Endpoint is called (GET `/api/salvato_auction_list`)
2. Fetches auction data from Salvato API
3. Filters for `COMING_SOON` and `IN_PROGRESS` auctions
4. Fetches lots for each auction
5. Generates PDF for each auction with:
   - Logo header
   - Auction dates (dynamic)
   - Table of all vehicles with images
6. Uploads each PDF to Dropbox
7. Creates shared links (direct download)
8. Cleans up local files
9. Returns JSON with Dropbox URLs

## Response Format

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

## Cron Schedule

The endpoint runs automatically via Vercel Cron:
- **Schedule:** Daily at midnight (00:00 UTC)
- **Configuration:** `vercel.json`

Your team will be able to access the latest PDFs from the Dropbox folder!

## Troubleshooting

### "DROPBOX_ACCESS_TOKEN environment variable is not set"
- Make sure you've added the token to `local.env` for local testing
- For production, add it to Vercel's environment variables

### "Failed to upload to Dropbox"
- Check that your Dropbox token is valid
- Verify the permissions are enabled
- Make sure the folder path is correct

### PDFs not generating
- Check the Salvato API credentials
- Verify there are active auctions (COMING_SOON or IN_PROGRESS status)
- Check Puppeteer is installed correctly: `bun install`

