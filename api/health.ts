
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "PetHealth API Gateway is Online",
    timestamp: new Date().toISOString(),
    env_check: !!process.env.INFLUX_URL
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
