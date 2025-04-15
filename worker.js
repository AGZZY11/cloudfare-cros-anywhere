addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 处理 CORS 预检请求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // 从查询参数获取目标 URL（例如 ?url=https://sub.mogufan.com/...）
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // 验证目标 URL
  if (!targetUrl) {
    return new Response('Missing "url" query parameter', { status: 400 });
  }

  try {
    // 克隆请求头，移除可能干扰的头
    const headers = new Headers(request.headers);
    headers.delete('Host'); // 避免 Host 冲突
    headers.set('User-Agent', 'Cloudflare-Workers-CORS-Proxy'); // 可选：自定义 UA

    // 创建新请求，转发到目标 URL
    const targetRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'follow'
    });

    // 发送请求
    const response = await fetch(targetRequest);

    // 克隆响应并添加 CORS 头
    const corsHeaders = new Headers(response.headers);
    corsHeaders.set('Access-Control-Allow-Origin', '*'); // 可改为具体域名
    corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', '*');
    corsHeaders.set('Access-Control-Expose-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(`Error fetching ${targetUrl}: ${error.message}`, { status: 500 });
  }
}

// 处理 OPTIONS 请求（CORS 预检）
function handleOptions(request) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*'); // 可改为具体域名
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}