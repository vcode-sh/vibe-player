import { readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { extname, resolve } from "node:path";
import type { Plugin } from "vite";

interface MediaRequest {
  path: string;
  status: number;
}

const root = resolve(import.meta.dirname, "fixtures/host-media");
const origin = "http://127.0.0.1:5221";
const byteRange = /^bytes=(\d+)-(\d*)$/;
const posterPath = /^\/poster\/(portrait|landscape)\.jpg$/;
const mediaPath = /^\/v\/(\d+)\/(portrait|landscape|long)\/([\w.]+)$/;
const mediaTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".m4s": "video/mp4",
  ".mp4": "video/mp4",
};

function sendContent(
  request: IncomingMessage,
  response: ServerResponse,
  content: Buffer
) {
  response.setHeader("Accept-Ranges", "bytes");
  const range = request.headers.range?.match(byteRange);
  if (range?.[1]) {
    const start = Number(range[1]);
    const end = Math.min(
      Number(range[2] || content.length - 1),
      content.length - 1
    );
    if (start > end) {
      response.writeHead(416).end();
      return;
    }
    response.setHeader(
      "Content-Range",
      `bytes ${start}-${end}/${content.length}`
    );
    response.setHeader("Content-Length", end - start + 1);
    response
      .writeHead(206)
      .end(
        request.method === "HEAD" ? undefined : content.subarray(start, end + 1)
      );
    return;
  }
  response.setHeader("Content-Length", content.length);
  response.end(request.method === "HEAD" ? undefined : content);
}

async function serveMedia(
  request: IncomingMessage,
  response: ServerResponse,
  requests: MediaRequest[]
) {
  const url = new URL(request.url ?? "/", origin);
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/health") {
    response.end("ready");
    return;
  }
  if (url.pathname === "/requests") {
    if (url.searchParams.has("clear")) {
      requests.length = 0;
    }
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(requests));
    return;
  }
  const poster = url.pathname.match(posterPath);
  const media = url.pathname.match(mediaPath);
  const name = poster?.[1] ?? media?.[2];
  const file = poster ? "poster.jpg" : media?.[3];
  if (!(name && file)) {
    response.writeHead(404).end();
    return;
  }
  if (media) {
    const status = Date.now() > Number(media[1]) ? 403 : 200;
    requests.push({ path: url.pathname, status });
    if (status === 403) {
      response.writeHead(403).end("The fixture token has expired.");
      return;
    }
  }
  const content = await readFile(resolve(root, name, file));
  if (name === "long" && file.endsWith(".m4s")) {
    await new Promise((settle) => setTimeout(settle, 500));
  }
  if (response.destroyed) {
    return;
  }
  response.setHeader(
    "Content-Type",
    mediaTypes[extname(file)] ?? "application/octet-stream"
  );
  sendContent(request, response, content);
}

/** Expiring capability URLs exercise the actual engine's HTTP failure path. */
export function hostMediaServer(): Plugin {
  return {
    async configureServer(vite) {
      const requests: MediaRequest[] = [];
      const server = createServer((request, response) => {
        serveMedia(request, response, requests).catch(() => {
          if (!response.headersSent) {
            response.writeHead(404);
          }
          response.end();
        });
      });
      await new Promise<void>((ready, reject) => {
        server.once("error", reject);
        server.listen(5222, "127.0.0.1", ready);
      });
      const deadline = setTimeout(() => {
        server.closeAllConnections();
        server.close();
      }, 900_000);
      deadline.unref();
      vite.httpServer?.once("close", () => {
        clearTimeout(deadline);
        server.closeAllConnections();
        server.close();
      });
      console.log(
        `Host acceptance media uses PID ${process.pid} on port 5222.`
      );
    },
    name: "host-media-fixture",
  };
}
