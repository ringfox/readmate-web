/**
 * 微信读书 Agent Gateway CORS 代理。
 * - 不存储 API Key；仅把浏览器带来的 Authorization 原样转发
 * - 只允许 POST（及 OPTIONS 预检）到官方网关
 */

const UPSTREAM = 'https://i.weread.qq.com/api/agent/gateway';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return withCors(
        new Response(JSON.stringify({ errcode: 405, errmsg: '仅支持 POST' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    const auth = request.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer wrk-')) {
      return withCors(
        new Response(JSON.stringify({ errcode: 401, errmsg: '缺少有效 Authorization Bearer wrk-…' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    const body = await request.text();
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body,
    });

    // 透传状态码与正文；覆盖 CORS
    return withCors(upstream);
  },
};
