
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0'
  };

  return new Response(JSON.stringify({ 
    status: "ok", 
    gateway: "active",
    runtime: "vercel-edge",
    timestamp: new Date().toISOString(),
    env_configured: !!process.env.INFLUX_URL
  }), {
    status: 200,
    headers: corsHeaders
  });
}
