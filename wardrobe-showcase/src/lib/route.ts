import { useSyncExternalStore } from "react";

// Hash routes, so the build is a static folder that deploys anywhere:
//   #/closet[/itemId]   #/dress   #/ask?anchor=a,b   #/lookbook[/lookId]

export type App = "closet" | "dress" | "ask" | "lookbook";
export const APPS: App[] = ["closet", "dress", "ask", "lookbook"];

export type Route = { app: App; id?: string; query: URLSearchParams };

function parse(hash: string): Route {
  const [path, qs = ""] = hash.replace(/^#\/?/, "").split("?");
  const [head, id] = path.split("/").filter(Boolean);
  const app = (APPS as string[]).includes(head) ? (head as App) : "closet";
  return { app, id: id ? decodeURIComponent(id) : undefined, query: new URLSearchParams(qs) };
}

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

let cache: { hash: string; route: Route } | null = null;
function snapshot(): Route {
  const hash = window.location.hash;
  if (cache?.hash !== hash) cache = { hash, route: parse(hash) };
  return cache.route;
}

export const useRoute = () => useSyncExternalStore(subscribe, snapshot);

export function go(app: App, id?: string, query?: Record<string, string>) {
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";
  window.location.hash = `/${app}${id ? `/${encodeURIComponent(id)}` : ""}${qs}`;
}
