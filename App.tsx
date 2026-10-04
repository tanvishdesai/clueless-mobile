import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ConvexProvider } from "convex/react";
import { convex } from "./convexClient";
import Capture from "./Capture";
import Closet from "./Closet";

export default function App() {
  const [tab, setTab] = useState<"capture" | "closet">("capture");
  return (
    <ConvexProvider client={convex}>
      <View style={s.fill}>
        <StatusBar style={tab === "capture" ? "light" : "dark"} />
        {tab === "capture" ? <Capture /> : <Closet />}
        <View style={s.tabs}>
          {(["capture", "closet"] as const).map((t) => (
            <Pressable key={t} style={s.tab} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ConvexProvider>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  tabs: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", backgroundColor: "rgba(10,10,8,0.88)", paddingBottom: 26, paddingTop: 10,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 4 },
  tabText: {
    color: "rgba(255,255,255,0.45)", fontSize: 13,
    letterSpacing: 0.6, textTransform: "uppercase",
  },
  tabTextOn: { color: "#fff", fontWeight: "700" },
});
