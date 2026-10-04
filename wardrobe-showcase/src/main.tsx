import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { DemoData, LiveData } from "./lib/data";
import App from "./App";

import "@fontsource/kavoon/400.css";
import "@fontsource/bodoni-moda/400.css";
import "@fontsource/bodoni-moda/400-italic.css";
import "@fontsource/bodoni-moda/600-italic.css";
import "@fontsource/bodoni-moda/700.css";
import "@fontsource/gloria-hallelujah/400.css";
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/vt323/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";

import "./styles/base.css";
import "./styles/components.css";
import "./styles/closet.css";
import "./styles/dress.css";
import "./styles/ask.css";
import "./styles/lookbook.css";
import "./styles/fitting.css";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
// Demo when asked for (npm run demo, ?demo) or when there's no deployment to talk to.
const demo = import.meta.env.VITE_DEMO === "1" || !url || new URLSearchParams(location.search).has("demo");

const root = createRoot(document.getElementById("root")!);

if (demo) {
  root.render(
    <StrictMode>
      <DemoData><App /></DemoData>
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(url!);
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <LiveData><App /></LiveData>
      </ConvexProvider>
    </StrictMode>,
  );
}
