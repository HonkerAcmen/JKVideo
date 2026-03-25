const http = require("http");
const https = require("https");
const zlib = require("zlib");
const express = require("express");
const app = express();
let WsLib = null;
try {
  WsLib = require("ws");
} catch {
  console.warn(
    '[Proxy] Optional deåpendency "ws" is missing. WebSocket relay is disabled.',
  );
}

// CORS: allow any local origin (Expo web dev server)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Buvid3, X-Sessdata, X-Bili-Jct, Range",
  );
  res.setHeader("Access-Control-Expose-Headers", "X-Sessdata, X-Bili-Jct");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function makeProxy(targetHost) {
  return (req, res) => {
    const buvid3 = req.headers["x-buvid3"] || "";
    const sessdata = req.headers["x-sessdata"] || "";
    const biliJct = req.headers["x-bili-jct"] || "";
    const cookies = [
      buvid3 && `buvid3=${buvid3}`,
      sessdata && `SESSDATA=${sessdata}`,
      biliJct && `bili_jct=${biliJct}`,
    ]
      .filter(Boolean)
      .join("; ");

    const options = {
      hostname: targetHost,
      path: req.url,
      method: req.method,
      headers: {
        Cookie: cookies,
        Referer: "https://www.bilibili.com",
        Origin: "https://www.bilibili.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Accept-Encoding": "identity",
      },
    };

    const proxy = https.request(options, (proxyRes) => {
      // On successful QR login, extract SESSDATA from set-cookie and relay via custom header
      const setCookies = proxyRes.headers["set-cookie"] || [];
      const match = setCookies.find((c) => c.includes("SESSDATA="));
      if (match) {
        const val = match.split(";")[0].replace("SESSDATA=", "");
        res.setHeader("X-Sessdata", val);
      }
      const jctMatch = setCookies.find((c) => c.includes("bili_jct="));
      if (jctMatch) {
        const val = jctMatch.split(";")[0].replace("bili_jct=", "");
        res.setHeader("X-Bili-Jct", val);
      }
      res.writeHead(proxyRes.statusCode, {
        "Content-Type": proxyRes.headers["content-type"] || "application/json",
      });
      proxyRes.pipe(res);
    });

    proxy.on("error", (err) => res.status(502).json({ error: err.message }));
    req.pipe(proxy);
  };
}

function proxyAbsoluteUrl(req, res, rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "invalid media url" });
    return;
  }

  if (target.protocol !== "https:") {
    res.status(400).json({ error: "only https media urls are supported" });
    return;
  }

  const options = {
    hostname: target.hostname,
    path: `${target.pathname}${target.search}`,
    method: "GET",
    headers: {
      Referer: "https://www.bilibili.com",
      Origin: "https://www.bilibili.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Accept-Encoding": "identity",
      ...(req.headers.range ? { Range: req.headers.range } : {}),
    },
  };

  const proxy = https.request(options, (proxyRes) => {
    const headers = {
      "Content-Type": proxyRes.headers["content-type"] || "video/mp4",
      "Accept-Ranges": proxyRes.headers["accept-ranges"] || "bytes",
    };

    if (proxyRes.headers["content-length"]) {
      headers["Content-Length"] = proxyRes.headers["content-length"];
    }
    if (proxyRes.headers["content-range"]) {
      headers["Content-Range"] = proxyRes.headers["content-range"];
    }
    if (proxyRes.headers.etag) {
      headers.ETag = proxyRes.headers.etag;
    }
    if (proxyRes.headers["last-modified"]) {
      headers["Last-Modified"] = proxyRes.headers["last-modified"];
    }

    res.writeHead(proxyRes.statusCode || 200, headers);
    proxyRes.pipe(res);
  });

  proxy.on("error", (err) => res.status(502).json({ error: err.message }));
  proxy.end();
}

app.use("/bilibili-api", makeProxy("api.bilibili.com"));
app.use("/bilibili-passport", makeProxy("passport.bilibili.com"));
app.use("/bilibili-live", makeProxy("api.live.bilibili.com"));

app.get("/bilibili-media", (req, res) => {
  const url = req.query.url;
  if (typeof url !== "string" || !url) {
    return res.status(400).json({ error: "missing media url" });
  }
  proxyAbsoluteUrl(req, res, url);
});

// Dedicated comment proxy: buffer response and decompress by magic bytes (not Content-Encoding header)
app.use("/bilibili-comment", (req, res) => {
  const options = {
    hostname: "comment.bilibili.com",
    path: req.url,
    method: req.method,
    headers: {
      Referer: "https://www.bilibili.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  };
  const proxy = https.request(options, (proxyRes) => {
    res.setHeader(
      "Content-Type",
      proxyRes.headers["content-type"] || "text/xml; charset=utf-8",
    );
    const chunks = [];
    proxyRes.on("data", (chunk) => chunks.push(chunk));
    proxyRes.on("end", () => {
      const buf = Buffer.concat(chunks);
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        // actual gzip data — decompress regardless of Content-Encoding header
        zlib.gunzip(buf, (err, result) => {
          if (err) res.status(502).end("gunzip error: " + err.message);
          else res.end(result);
        });
      } else {
        res.end(buf);
      }
    });
    proxyRes.on("error", (err) => res.status(502).json({ error: err.message }));
  });
  proxy.on("error", (err) => res.status(502).json({ error: err.message }));
  req.pipe(proxy);
});

// Image CDN proxy — strips the host segment and forwards to the real CDN with Referer
app.use("/bilibili-img", (req, res) => {
  const parts = req.url.split("/").filter(Boolean);
  const host = parts[0];
  if (!host || !host.endsWith(".hdslb.com")) return res.status(403).end();
  req.url = "/" + parts.slice(1).join("/");
  makeProxy(host)(req, res);
});

const PORT = process.env.PROXY_PORT || 3001;
const server = http.createServer(app);

// WebSocket relay — Android Expo Go often can't reach *.chat.bilibili.com directly.
// Device connects here; proxy opens the upstream WSS connection and relays all frames.
if (WsLib) {
  const wss = new WsLib.Server({ server, path: "/bilibili-danmaku-ws" });
  wss.on("connection", (clientWs, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const target = url.searchParams.get("host");
    if (!target || !target.includes("bilibili.com")) {
      clientWs.close(4001, "invalid target");
      return;
    }
    console.log("[ws-relay] →", target);
    const upstream = new WsLib(target, {
      headers: { Origin: "https://live.bilibili.com" },
      perMessageDeflate: false,
    });
    upstream.on("open", () => console.log("[ws-relay] upstream open"));
    upstream.on("message", (data) => {
      if (clientWs.readyState === 1) clientWs.send(data, { binary: true });
    });
    upstream.on("error", (err) => {
      console.error("[ws-relay] upstream error:", err.message);
      clientWs.close();
    });
    upstream.on("close", () => clientWs.close());
    clientWs.on("message", (data) => {
      if (upstream.readyState === 1) upstream.send(data);
    });
    clientWs.on("close", () => upstream.close());
    clientWs.on("error", () => upstream.close());
  });
}

server.listen(PORT, "0.0.0.0", () =>
  console.log(
    `[Proxy] http://localhost:${PORT}  ws://<LAN-IP>:${PORT}/bilibili-danmaku-ws`,
  ),
);
