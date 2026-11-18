/**
 * 長庚急診即時訊息 CORS 代理 (Cloudflare Workers，免費方案即可)
 *
 * 部署：Cloudflare Dashboard → Workers & Pages → Create → 貼上本檔 → Deploy
 * 使用：index-v3.html?proxy=https://你的worker名稱.你的帳號.workers.dev
 *
 * 特色：
 *  - 只允許 webapp.cgmh.org.tw 的 erd/index.asp，且 loc 僅限單一英數字（避免被當開放代理濫用）
 *  - 邊緣快取 60 秒：即使多人開啟面板，對長庚伺服器的請求量也很低
 */
const CORS = {
  "Access-Control-Allow-Origin": "*", // 正式上線建議改成你的網域
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const loc = new URL(request.url).searchParams.get("loc") || "";
    if (!/^[0-9A-Za-z]$/.test(loc)) {
      return new Response("bad loc", { status: 400, headers: CORS });
    }

    const upstream = `https://webapp.cgmh.org.tw/bed/erd/index.asp?loc=${loc}`;
    const res = await fetch(upstream, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CGMH-ERD-Dashboard)" },
      cf: { cacheTtl: 60, cacheEverything: true },
    });

    // 原始位元組直接轉傳，保留 Big5/UTF-8 編碼，由前端判斷解碼
    return new Response(res.body, {
      status: res.status,
      headers: {
        ...CORS,
        "Content-Type": res.headers.get("content-type") || "text/html",
        "Cache-Control": "public, max-age=60",
      },
    });
  },
};
