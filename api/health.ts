
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "API system is online",
    timestamp: new Date().toISOString(),
    runtime: 'edge'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
