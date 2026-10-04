import { Component, type ReactNode } from "react";

/**
 * Catches the one failure that's easy to hit on first run: the site is newer
 * than the deployed Convex functions (looks.ts hasn't been pushed yet).
 */
export class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const undeployed = /could not find (public )?function|looks:/i.test(error.message);
    return (
      <div className="empty">
        <h2>{undeployed ? "The closet needs an update." : "Ugh. Something broke."}</h2>
        {undeployed ? (
          <p>
            This site uses Convex functions the camera app's backend doesn't have yet. Push them once from
            the ingestion folder: <code>cd camera-wardrobe-ingestion && npx convex deploy</code>, then reload.
          </p>
        ) : (
          <p className="mono" style={{ fontSize: 18 }}>{error.message}</p>
        )}
        <button className="btn" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
