import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "./api";
import { isTagged, type Item, type LookRequest } from "./types";
import { DEMO_ITEMS, DEMO_LOOKS } from "../demo/closet";
import { demoStyle } from "../demo/stylist";

export type Stylist = { online: boolean; busy: boolean; model?: string };

export type RequestArgs = { occasion: string; constraints: string; anchorIds?: string[] };

type Data = {
  mode: "live" | "demo";
  items: Item[] | undefined;
  looks: LookRequest[] | undefined;
  stylist: Stylist | undefined;
  request: (args: RequestArgs) => Promise<string>;
  retry: (id: string) => Promise<unknown>;
  setFavorite: (id: string, favorite: boolean) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

const Ctx = createContext<Data | null>(null);

export function useData() {
  const d = useContext(Ctx);
  if (!d) throw new Error("useData outside a provider");
  return d;
}

/** Ticks so "last seen 40s ago" can go stale without a server push. */
function useNow(every = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

export function LiveData({ children }: { children: ReactNode }) {
  const items = useQuery(api.items.list, {});
  const looks = useQuery(api.looks.list, {});
  const beat = useQuery(api.looks.stylist, {});
  const request = useMutation(api.looks.request);
  const retry = useMutation(api.looks.retry);
  const setFavorite = useMutation(api.looks.setFavorite);
  const remove = useMutation(api.looks.remove);
  const now = useNow();

  const stylist = useMemo<Stylist | undefined>(() => {
    if (beat === undefined) return undefined;
    if (!beat) return { online: false, busy: false };
    // The worker checks in every 10s; give it a couple of misses.
    return { online: now - beat.lastSeen < 35_000, busy: beat.busy, model: beat.model };
  }, [beat, now]);

  const value = useMemo<Data>(() => ({
    mode: "live",
    items,
    looks,
    stylist,
    request: (args) => request(args),
    retry: (id) => retry({ id }),
    setFavorite: (id, favorite) => setFavorite({ id, favorite }),
    remove: (id) => remove({ id }),
  }), [items, looks, stylist, request, retry, setFavorite, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Cher's closet and a stand-in stylist, entirely in memory. */
export function DemoData({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<LookRequest[]>(DEMO_LOOKS);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback((id: string, p: Partial<LookRequest>) => {
    setLooks((ls) => ls.map((l) => (l._id === id ? { ...l, ...p } : l)));
  }, []);

  const run = useCallback((req: LookRequest) => {
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    later(900, () => {
      setBusy(true);
      patch(req._id, { status: "styling", startedAt: Date.now(), model: "demo stylist" });
    });
    later(4200, () => {
      setBusy(false);
      try {
        const result = demoStyle(DEMO_ITEMS.filter(isTagged), req);
        patch(req._id, { status: "done", result, finishedAt: Date.now() });
      } catch (e) {
        patch(req._id, { status: "error", error: String((e as Error).message), finishedAt: Date.now() });
      }
    });
  }, [patch]);

  const value = useMemo<Data>(() => ({
    mode: "demo",
    items: DEMO_ITEMS,
    looks,
    stylist: { online: true, busy, model: "demo stylist" },
    request: async ({ occasion, constraints, anchorIds }) => {
      const req: LookRequest = {
        _id: `demo_${Date.now().toString(36)}`,
        _creationTime: Date.now(),
        occasion: occasion.trim(),
        constraints: constraints.trim(),
        anchorIds,
        status: "pending",
      };
      setLooks((ls) => [req, ...ls]);
      run(req);
      return req._id;
    },
    retry: async (id) => {
      const req = looks.find((l) => l._id === id);
      if (!req) return;
      patch(id, { status: "pending", error: undefined, result: undefined });
      run(req);
    },
    setFavorite: async (id, favorite) => patch(id, { favorite }),
    remove: async (id) => setLooks((ls) => ls.filter((l) => l._id !== id)),
  }), [looks, busy, run, patch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** id -> item, for resolving the pieces a look refers to. */
export function useItemIndex() {
  const { items } = useData();
  return useMemo(() => new Map((items ?? []).map((it) => [it._id, it])), [items]);
}
