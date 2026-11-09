import type { Plugin } from "vite";

/**
 * `/failures/missing.*` always answers 404. `/failures/signed.mp4` stands in
 * for a signed URL: only `token=fresh` is allowed and redirects to real media.
 */
export function mediaFailureServer(): Plugin {
  return {
    configureServer(vite) {
      vite.middlewares.use("/failures", (request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        response.setHeader("Cache-Control", "no-store");
        if (url.pathname !== "/signed.mp4") {
          response.writeHead(404).end();
        } else if (url.searchParams.get("token") === "fresh") {
          response.writeHead(302, { Location: "/media/file.mp4" }).end();
        } else {
          response.writeHead(403).end("Signature expired.");
        }
      });
    },
    name: "media-failure-fixture",
  };
}
