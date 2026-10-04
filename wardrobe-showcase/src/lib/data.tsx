import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "./api";
import { isTagged, type Change, type Item, type Look, type LookRequest, type Me, type Note, type Piece } from "./types";
import { DEMO_ITEMS, DEMO_LOOKS } from "../demo/closet";
import { demoNote, demoStyle } from "../demo/stylist";

export type Stylist = { online: boolean; busy: boolean; model?: string };

export type RequestArgs = { occasion: string; constraints: string; anchorIds?: string[] };
export type NoteArgs = { lookId: string; lookIndex: number; text: string; change?: Change; outfit?: { id: string; role: string }[] };

type Data = {
  mode: "live" | "demo";
  /** Who's signed in; the username personalises the whole site. */
  me: Me;
  signOut: () => Promise<void>;
  items: Item[] | undefined;
  looks: LookRequest[] | undefined;
  stylist: Stylist | undefined;
  request: (args: RequestArgs) => Promise<string>;
  retry: (id: string) => Promise<unknown>;
  setFavorite: (id: string, favorite: boolean) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  notes: Note[] | undefined;
  sendNote: (args: NoteArgs) => Promise<unknown>;
  retryNote: (id: string) => Promise<unknown>;
  /** Keep a fitting-room version as a new look in the lookbook; resolves to its index. */
  keepLook: (lookId: string, look: Look) => Promise<number>;
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

export function LiveData({ me, signOut, children }: { me: Me; signOut: () => Promise<void>; children: ReactNode }) {
  const items = useQuery(api.items.list, {});
  const looks = useQuery(api.looks.list, {});
  const beat = useQuery(api.looks.stylist, {});
  const request = useMutation(api.looks.request);
  const retry = useMutation(api.looks.retry);
  const setFavorite = useMutation(api.looks.setFavorite);
  const remove = useMutation(api.looks.remove);
  const notes = useQuery(api.notes.list, {});
  const sendNote = useMutation(api.notes.send);
  const retryNote = useMutation(api.notes.retry);
  const addLook = useMutation(api.looks.addLook);
  const now = useNow();

  const stylist = useMemo<Stylist | undefined>(() => {
    if (beat === undefined) return undefined;
    if (!beat) return { online: false, busy: false };
    // The worker checks in every 10s; give it a couple of misses.
    return { online: now - beat.lastSeen < 35_000, busy: beat.busy, model: beat.model };
  }, [beat, now]);

  const value = useMemo<Data>(() => ({
    mode: "live",
    me,
    signOut,
    items,
    looks,
    stylist,
    request: (args) => request(args),
    retry: (id) => retry({ id }),
    setFavorite: (id, favorite) => setFavorite({ id, favorite }),
    remove: (id) => remove({ id }),
    notes,
    sendNote: (args) => sendNote(args),
    retryNote: (id) => retryNote({ id }),
    keepLook: (id, look) => addLook({ id, look }),
  }), [me, signOut, items, looks, stylist, request, retry, setFavorite, remove, notes, sendNote, retryNote, addLook]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const DEMO_ME: Me = { name: "Cher", email: "cher@bronsonalcott.edu", member: true };

/** Cher's closet and a stand-in stylist, entirely in memory. */
export function DemoData({ children }: { children: ReactNode }) {
  const [looks, setLooks] = useState<LookRequest[]>(DEMO_LOOKS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback((id: string, p: Partial<LookRequest>) => {
    setLooks((ls) => ls.map((l) => (l._id === id ? { ...l, ...p } : l)));
  }, []);

  const patchNote = useCallback((id: string, p: Partial<Note>) => {
    setNotes((ns) => ns.map((n) => (n._id === id ? { ...n, ...p } : n)));
  }, []);

  /** The stand-in reads what you tried on, not what you wrote. */
  const answer = useCallback((reply: Note, mine: Note | undefined, look: Look | undefined) => {
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    later(600, () => { setBusy(true); patchNote(reply._id, { status: "writing" }); });
    later(2600, () => {
      setBusy(false);
      const before: Piece[] = look?.pieces ?? [];
      const after: Piece[] = (mine?.outfit ?? before).map((p) => ({ note: before.find((b) => b.id === p.id)?.note ?? "", ...p }));
      patchNote(reply._id, { status: "done", ...demoNote(DEMO_ITEMS.filter(isTagged), before, after, !!mine?.change) });
    });
  }, [patchNote]);

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
    me: DEMO_ME,
    signOut: async () => {},
    items: DEMO_ITEMS,
    looks,
    stylist: { online: true, busy, model: "demo stylist" },
    request: async ({ occasion, constraints, anchorIds }) => {
      const req: LookRequest = {
        _id: `demo_${Date.now().toString(36)}`,
        _creationTime: Date.now(),
        by: DEMO_ME.name,
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
    remove: async (id) => {
      setLooks((ls) => ls.filter((l) => l._id !== id));
      setNotes((ns) => ns.filter((n) => n.lookId !== id));
    },
    notes,
    sendNote: async ({ lookId, lookIndex, text, change, outfit }) => {
      const t = Date.now();
      const mine: Note = { _id: `note_${t.toString(36)}`, _creationTime: t, lookId, lookIndex, author: "you", text: text.trim(), change, outfit };
      const reply: Note = { _id: `note_${t.toString(36)}_c`, _creationTime: t + 1, lookId, lookIndex, author: "cher", text: "", status: "pending" };
      setNotes((ns) => [reply, mine, ...ns]);
      answer(reply, mine, looks.find((l) => l._id === lookId)?.result?.looks[lookIndex]);
    },
    retryNote: async (id) => {
      const reply = notes.find((n) => n._id === id);
      if (!reply) return;
      const mine = notes.find((n) => n.author === "you" && n.lookId === reply.lookId && n._creationTime < reply._creationTime);
      patchNote(id, { status: "pending", error: undefined });
      answer(reply, mine, looks.find((l) => l._id === reply.lookId)?.result?.looks[reply.lookIndex]);
    },
    keepLook: async (lookId, look) => {
      const req = looks.find((l) => l._id === lookId);
      if (!req?.result) throw new Error("that lookbook isn't finished");
      patch(lookId, { result: { ...req.result, looks: [...req.result.looks, look] } });
      return req.result.looks.length;
    },
  }), [looks, busy, run, patch, notes, answer, patchNote]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** id -> item, for resolving the pieces a look refers to. */
export function useItemIndex() {
  const { items } = useData();
  return useMemo(() => new Map((items ?? []).map((it) => [it._id, it])), [items]);
}
