import handler from './api/salvato_auction_list';

// @ts-ignore - Bun types are available at runtime
// Load environment variables from local.env
const envFile = await Bun.file('./local.env').text();
envFile.split('\n').forEach((line: string) => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});

console.log('Environment loaded:', {
  SALVATO_PRODUCTION_URL: process.env.SALVATO_PRODUCTION_URL,
  SALVATO_CLIENT_ID: process.env.SALVATO_CLIENT_ID ? '***' : 'missing',
  SALVATO_CLIENT_SECRET: process.env.SALVATO_CLIENT_SECRET ? '***' : 'missing',
  DROPBOX_ACCESS_TOKEN: process.env.DROPBOX_ACCESS_TOKEN ? '***' : 'missing',
  DROPBOX_FOLDER: process.env.DROPBOX_FOLDER || '/Salvato/Auction Lists (default)',
});

// @ts-ignore - Bun types are available at runtime
Bun.serve({
  port: 3001,
  async fetch(req: Request) {
    console.log(`${req.method} ${req.url}`);
    
    if (req.url.endsWith('/api/salvato_auction_list')) {
      const response = await handler(req);
      console.log('Handler returned response:', response.status);
      return response;
    }
    
    return new Response('Not found', { status: 404 });
  },
});

console.log('Test server running on http://localhost:3001');
console.log('Test with: curl http://localhost:3001/api/salvato_auction_list');

