import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../lib/api";
import { LiveData } from "../lib/data";
import { firstName, type Me } from "../lib/types";
import { Logo, LogoMark } from "../components/Logo";
import { Window } from "../components/Window";
import App from "../App";

/**
 * The door to the closet. Nothing past here renders, and nothing is queried,
 * until someone has signed in and the backend agrees they belong. The backend
 * checks again on every call, so this is the welcome mat, not the lock.
 */
export function Gate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  if (isLoading || (isAuthenticated && me === undefined)) return <Shell><Booting /></Shell>;
  if (!isAuthenticated || !me) return <Shell><SignIn /></Shell>;
  if (!me.member) return <Shell><Private me={me} onSignOut={signOut} /></Shell>;
  return <LiveData me={me} signOut={signOut}><App /></LiveData>;
}

function wallpaper() {
  try {
    return localStorage.getItem("wallpaper") ?? "plaid";
  } catch {
    return "plaid";
  }
}

/** The same desktop as the app, minus everything that belongs to someone. */
function Shell({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="desktop">
      <nav className="menubar" aria-label="Menu bar">
        <span className="brand"><LogoMark /> clueless</span>
        <span className="spacer" />
        <span className="status"><span aria-hidden>🔒</span><span className="label">Private closet</span></span>
        <span className="clock">{clock.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
      </nav>
      <main className={`surface wall-${wallpaper()} gate-surface`}>{children}</main>
    </div>
  );
}

function Booting() {
  return (
    <Window title="Starting up…" className="gate-window">
      <div className="gate-body gate-center">
        <Logo size={56} sub="closet computer" />
        <div className="barber" aria-hidden />
        <p className="mono gate-status">Checking the guest list…</p>
      </div>
    </Window>
  );
}

type Mode = "signIn" | "signUp";

function SignIn() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingUp = mode === "signUp";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("That email doesn't look right.");
    if (!password) return setError("You forgot the password. Classic.");
    if (signingUp && (name.trim().length < 2 || name.trim().length > 24)) return setError("Pick a username between 2 and 24 characters.");
    if (signingUp && password.length < 8) return setError("Passwords need at least 8 characters. As if you'd pick a short one.");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("email", email.trim());
      form.set("password", password);
      form.set("flow", mode);
      if (signingUp) form.set("name", name.trim());
      await signIn("password", form);
    } catch (err) {
      setError(explain(err, mode));
      setBusy(false);
    }
  }

  return (
    <Window title="Welcome to Closet Computer" className="gate-window" footer={<><span>CLOSET COMPUTER 1.995</span><span>PRIVATE</span></>}>
      <form className="gate-body" onSubmit={submit} noValidate>
        <div className="gate-center">
          <Logo size={56} sub="closet computer" />
          <p className="gate-greet">
            {signingUp ? "Set up your closet. Your username is what Cher will call you." : "Welcome back. Your closet missed you."}
          </p>
        </div>

        <div className="seg gate-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" aria-selected={!signingUp} aria-pressed={!signingUp} onClick={() => { setMode("signIn"); setError(null); }}>Sign in</button>
          <button type="button" role="tab" aria-selected={signingUp} aria-pressed={signingUp} onClick={() => { setMode("signUp"); setError(null); }}>New closet</button>
        </div>

        {signingUp && (
          <label className="gate-field">
            <span className="stretch">Username</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={24} placeholder="Cher" required />
          </label>
        )}
        <label className="gate-field">
          <span className="stretch">Email</span>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="cher@bronsonalcott.edu" required />
        </label>
        <label className="gate-field">
          <span className="stretch">Password</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={signingUp ? 8 : undefined}
            required
          />
          {signingUp && <small className="gate-hint">8 characters or more.</small>}
        </label>

        {error && <p className="notice error gate-error" role="alert"><span>{error}</span></p>}

        <button className="btn hot default big gate-submit" type="submit" disabled={busy}>
          {busy ? (signingUp ? "Hanging everything up…" : "Opening the closet…") : signingUp ? "Create my closet" : "Sign in"}
        </button>
        {signingUp && (
          <p className="gate-fine">This closet is private: once it has an owner, sign-ups close to everyone else.</p>
        )}
      </form>
    </Window>
  );
}

function Private({ me, onSignOut }: { me: Me; onSignOut: () => Promise<void> }) {
  return (
    <Window title="Private closet" className="gate-window">
      <div className="gate-body gate-center">
        <Logo size={48} />
        <h2 className="gate-title">Ugh, sorry, {firstName(me.name)}.</h2>
        <p className="gate-greet">This closet belongs to someone else. You're signed in as <strong>{me.email}</strong>, which isn't on the guest list.</p>
        <button className="btn default" onClick={() => void onSignOut()}>Sign out</button>
      </div>
    </Window>
  );
}

/** Convex Auth's errors, in the house voice. */
function explain(err: unknown, mode: Mode): string {
  const data = (err as { data?: unknown })?.data;
  const raw = typeof data === "string" ? data : String((err as Error)?.message ?? err);
  if (/InvalidAccountId/i.test(raw)) return "No closet under that email. Ugh. Check it, or make a new one.";
  if (/InvalidSecret/i.test(raw)) return "Wrong password. As if.";
  if (/already exists/i.test(raw)) return "That email already has a closet. Sign in instead.";
  if (/registration is closed|closet is private/i.test(raw)) return "This closet is private. Registration is closed.";
  if (/invalid password/i.test(raw)) return "Passwords need at least 8 characters.";
  if (/too many|rate limit/i.test(raw)) return "Too many tries. Take five and try again.";
  const ours = raw.match(/ConvexError: (.+?)(?:\n|$)/)?.[1] ?? (typeof data === "string" ? data : null);
  if (ours) return ours;
  return mode === "signUp" ? "Couldn't create that closet. Try again?" : "Couldn't sign you in. Try again?";
}
