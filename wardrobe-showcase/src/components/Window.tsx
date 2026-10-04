import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  onZoom?: () => void;
  className?: string;
};

/** A System 7 window: pinstriped title bar, close box, zoom box. */
export function Window({ title, children, footer, onClose, onZoom, className = "" }: Props) {
  return (
    <section className={`window ${className}`} aria-label={title}>
      <header className="titlebar">
        {onClose && <button className="box close" onClick={onClose} aria-label="Close window" />}
        <h1 className="title">{title}</h1>
        {onZoom && <button className="box zoom" onClick={onZoom} aria-label="Zoom window" />}
      </header>
      <div className="window-body">{children}</div>
      {footer && <footer className="window-foot">{footer}</footer>}
    </section>
  );
}
