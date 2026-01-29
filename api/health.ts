
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0'
  };

  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "API system is online",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers
  });
}
