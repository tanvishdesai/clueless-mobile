import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Image, PanResponder, Pressable, StyleSheet, Text, View,
} from "react-native";
import { CameraView, useCameraPermissions, type FocusMode } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { File, UploadType } from "expo-file-system";
import { useConvex } from "convex/react";
import { api } from "./convex/_generated/api";
import { closetKey } from "./convexClient";

/** Shrink before upload: ~150KB instead of ~4MB, and far fewer image tokens. */
async function shrink(uri: string) {
  const out = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  return out.uri;
}

/**
 * Uploads one local file to Convex.
 *
 * Note: NOT `fetch(uri).blob()`. On Android that goes through okhttp, which
 * does not serve `file://` URLs, so it throws before anything is sent.
 * `File.upload` does the whole transfer in native code.
 */
async function uploadOne(uri: string, signedUrl: string) {
  const res = await new File(uri).upload(signedUrl, {
    httpMethod: "POST",
    uploadType: UploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg" },
  });
  if (res.status !== 200) {
    throw new Error(`storage ${res.status}: ${res.body.slice(0, 140)}`);
  }
  return JSON.parse(res.body).storageId as string;
}

/**
 * Gesture handling lives at module scope: two fingers pinch-zoom, one quick tap
 * refocuses. Built once, never during render, so React Compiler has no closure
 * over refs to complain about. Only one camera screen ever exists.
 */
const g = {
  zoom: 0,
  pinch: null as { dist: number; zoom: number } | null,
  tap: null as { t: number; x: number; y: number; multi: boolean } | null,
  onZoom: (_z: number) => {},
  onTap: (_x: number, _y: number) => {},
};

const gestures = PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: () => true,
  onPanResponderGrant: (e) => {
    g.tap = {
      t: Date.now(),
      x: e.nativeEvent.locationX,
      y: e.nativeEvent.locationY,
      multi: e.nativeEvent.touches.length > 1,
    };
    g.pinch = null;
  },
  onPanResponderMove: (e) => {
    const ts = e.nativeEvent.touches;
    if (ts.length !== 2) return;
    if (g.tap) g.tap.multi = true;
    const d = Math.hypot(ts[0].pageX - ts[1].pageX, ts[0].pageY - ts[1].pageY);
    if (!g.pinch) {
      g.pinch = { dist: d, zoom: g.zoom };
      return;
    }
    g.onZoom(g.pinch.zoom + (d - g.pinch.dist) / 600);
  },
  onPanResponderRelease: () => {
    g.pinch = null;
    const info = g.tap;
    g.tap = null;
    if (!info || info.multi || Date.now() - info.t > 300) return;
    g.onTap(info.x, info.y);
  },
});

export default function Capture() {
  const [permission, requestPermission] = useCameraPermissions();
  const [front, setFront] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inFlight, setInFlight] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // expo-camera has no focus-point API, but flipping autofocus to "on" makes
  // the Android side call startFocusAndMetering. Pulse it to force a refocus.
  const [autofocus, setAutofocus] = useState<FocusMode>("off");
  const [ring, setRing] = useState<{ x: number; y: number } | null>(null);

  // 0..1 of the lens's range, not a multiplier — expo-camera doesn't expose
  // maxZoomRatio, so showing a "2.4x" here would be a guess.
  const [zoom, setZoom] = useState(0);

  const cam = useRef<CameraView>(null);
  const convex = useConvex();

  const setZoomTo = useCallback((z: number) => {
    const next = Math.min(1, Math.max(0, z));
    g.zoom = next;
    setZoom(next);
  }, []);

  const refocusAt = useCallback((x: number, y: number) => {
    setRing({ x, y });
    setAutofocus("on");
    setTimeout(() => setAutofocus("off"), 1500);
    setTimeout(() => setRing(null), 1500);
  }, []);

  useEffect(() => {
    g.onZoom = setZoomTo;
    g.onTap = refocusAt;
  }, [setZoomTo, refocusAt]);

  // Fire-and-forget so the shutter is free again immediately.
  const upload = useCallback(
    async (frontUri: string, backUri: string) => {
      setInFlight((n) => n + 1);
      try {
        const [frontId, backId] = await Promise.all(
          [frontUri, backUri].map(async (uri) =>
            uploadOne(uri, await convex.mutation(api.items.generateUploadUrl, { key: closetKey })),
          ),
        );
        await convex.mutation(api.items.create, {
          key: closetKey,
          frontId: frontId as any,
          backId: backId as any,
        });
        setDone((n) => n + 1);
        setLastError(null);
      } catch (e: any) {
        // Never swallow this again - a silent failure here looks exactly like
        // a successful upload that vanished.
        const msg = String(e?.message ?? e);
        console.warn("[clueless] upload failed:", msg);
        setFailed((n) => n + 1);
        setLastError(msg.slice(0, 180));
      } finally {
        setInFlight((n) => n - 1);
      }
    },
    [convex],
  );

  const shoot = useCallback(async () => {
    if (busy || !cam.current) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.9 });
      if (!pic?.uri) return;
      const uri = await shrink(pic.uri);
      if (!front) {
        setFront(uri);
      } else {
        setFront(null);
        void upload(front, uri);
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      console.warn("[clueless] capture failed:", msg);
      setLastError(msg.slice(0, 180));
    } finally {
      setBusy(false);
    }
  }, [busy, front, upload]);

  if (!permission) return <View style={s.fill} />;
  if (!permission.granted) {
    return (
      <View style={[s.fill, s.center]}>
        <Text style={s.msg}>The camera is how clothes get into the closet.</Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant camera access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.fill}>
      <View style={s.hud}>
        <Text style={s.step}>{front ? "Now the BACK" : "Front of the garment"}</Text>
        <Text style={s.tally}>
          {done} saved{inFlight ? ` · ${inFlight} uploading` : ""}
          {failed ? ` · ${failed} failed` : ""}
        </Text>
      </View>

      {/* 4:3 portrait box. ratio is Android-only and switches the preview from
          FILL (cropped) to FIT, so the frame matches what actually gets saved. */}
      <View style={s.previewBox}>
        <CameraView
          ref={cam}
          style={StyleSheet.absoluteFill}
          facing="back"
          ratio="4:3"
          autofocus={autofocus}
          zoom={zoom}
        />
        <View style={StyleSheet.absoluteFill} {...gestures.panHandlers} />
        {ring ? (
          <View pointerEvents="none" style={[s.ring, { left: ring.x - 35, top: ring.y - 35 }]} />
        ) : null}
        {front ? <Image source={{ uri: front }} style={s.thumb} /> : null}

        {zoom > 0.001 ? (
          <View style={s.zoomPill}>
            <View style={s.zoomTrack}>
              <View style={[s.zoomFill, { width: `${Math.round(zoom * 100)}%` }]} />
            </View>
            <Pressable onPress={() => setZoomTo(0)} hitSlop={10}>
              <Text style={s.zoomReset}>reset</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {lastError ? (
        <Pressable onPress={() => setLastError(null)} style={s.errBox}>
          <Text style={s.errText}>{lastError}</Text>
        </Pressable>
      ) : null}

      <View style={s.bar}>
        <Pressable style={[s.side, !front && s.hidden]} disabled={!front} onPress={() => setFront(null)}>
          <Text style={s.sideText}>Redo</Text>
        </Pressable>

        <Pressable onPress={shoot} disabled={busy}>
          <View style={[s.shutterRing, front && s.shutterRingBack]}>
            {busy ? <ActivityIndicator color="#111" /> : <View style={s.shutterCore} />}
          </View>
        </Pressable>

        <View style={s.side}>
          <Text style={s.hintText}>tap to{"\n"}refocus</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 20 },
  msg: { color: "#fff", fontSize: 17, textAlign: "center" },
  btn: { backgroundColor: "#fff", paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999 },
  btnText: { fontWeight: "600", fontSize: 15 },

  hud: { paddingTop: 54, paddingBottom: 12, alignItems: "center", gap: 6 },
  step: { color: "#fff", fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  tally: { color: "rgba(255,255,255,0.6)", fontSize: 12 },

  previewBox: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#111", overflow: "hidden" },
  ring: {
    position: "absolute", width: 70, height: 70, borderRadius: 999,
    borderWidth: 2, borderColor: "#ffd34d",
  },
  thumb: {
    position: "absolute", right: 12, top: 12, width: 58, height: 78, borderRadius: 8,
    borderWidth: 2, borderColor: "#fff",
  },

  errBox: { marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: "#3a1511" },
  errText: { color: "#ffb4a6", fontSize: 11, lineHeight: 15 },

  bar: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  shutterRing: {
    width: 78, height: 78, borderRadius: 999, borderWidth: 4, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  shutterRingBack: { borderColor: "#ffd34d" },
  shutterCore: { width: 60, height: 60, borderRadius: 999, backgroundColor: "#fff" },
  side: { width: 76, alignItems: "center" },
  sideText: { color: "#fff", fontSize: 15 },
  hintText: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", lineHeight: 14 },
  zoomPill: {
    position: "absolute", left: 16, right: 16, bottom: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  zoomTrack: { flex: 1, height: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.25)" },
  zoomFill: { height: 3, borderRadius: 999, backgroundColor: "#ffd34d" },
  zoomReset: { color: "#fff", fontSize: 12, fontWeight: "600" },
  hidden: { opacity: 0 },
});
