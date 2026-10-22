import { readdir, readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { basename, extname, resolve } from "node:path";
import type { Plugin } from "vite";

interface MediaRequest {
  authorized: boolean;
  path: string;
}

const mediaRoot = resolve(import.meta.dirname, "fixture/public/media");
const fixtureOrigin = "http://127.0.0.1:5197";
const mediaTypes: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".mpegts": "video/mp2t",
};

async function serveMedia(
  request: IncomingMessage,
  response: ServerResponse,
  files: ReadonlySet<string>,
  requests: MediaRequest[]
) {
  const url = new URL(request.url ?? "/", fixtureOrigin);
  response.setHeader("Access-Control-Allow-Origin", fixtureOrigin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Cache-Control", "no-store");
  if (url.pathname === "/requests") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(requests));
    return;
  }
  const name = basename(url.pathname);
  if (!(url.pathname.startsWith("/media/") && files.has(name))) {
    response.writeHead(404).end();
    return;
  }
  const authorized =
    request.headers.cookie?.split("; ").includes("fixture-session=allowed") ??
    false;
  requests.push({ authorized, path: url.pathname });
  if (!authorized) {
    response.writeHead(403).end("Fixture session required.");
    return;
  }
  const content = await readFile(resolve(mediaRoot, name));
  response.setHeader(
    "Content-Type",
    mediaTypes[extname(name)] ?? "application/octet-stream"
  );
  response.end(content);
}

/** Same-site, cross-origin media proves credentials reach the SDK's HTTP loader. */
export function credentialMediaServer(): Plugin {
  return {
    async configureServer(vite) {
      const files = new Set(await readdir(mediaRoot));
      const requests: MediaRequest[] = [];
      const server = createServer((request, response) => {
        serveMedia(request, response, files, requests).catch(() => {
          if (!response.headersSent) {
            response.writeHead(500);
          }
          response.end();
        });
      });
      await new Promise<void>((resolveListening, reject) => {
        server.once("error", reject);
        server.listen(5198, "127.0.0.1", resolveListening);
      });
      vite.httpServer?.once("close", () => server.close());
    },
    name: "credential-media-fixture",
  };
}
