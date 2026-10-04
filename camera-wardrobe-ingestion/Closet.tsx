import { useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "./convex/_generated/api";
import { closetKey } from "./convexClient";

type Item = NonNullable<ReturnType<typeof useQuery<typeof api.items.list>>>[number];

const ALL = "all";

export default function Closet() {
  const items = useQuery(api.items.list, { key: closetKey });
  const retry = useMutation(api.items.retry);
  const remove = useMutation(api.items.remove);
  const [filter, setFilter] = useState(ALL);
  const [open, setOpen] = useState<Item | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items ?? []) if (it.attrs) set.add(it.attrs.category);
    return [ALL, ...[...set].sort()];
  }, [items]);

  const shown = useMemo(
    () => (items ?? []).filter((it) => filter === ALL || it.attrs?.category === filter),
    [items, filter],
  );

  if (!items) return <View style={[s.fill, s.center]}><ActivityIndicator /></View>;

  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <View style={s.fill}>
      <View style={s.header}>
        <Text style={s.title}>{items.length} articles</Text>
        {pending > 0 && <Text style={s.sub}>{pending} not tagged yet</Text>}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipRow}
        contentContainerStyle={s.chipRowInner}
      >
        {categories.map((c) => (
          <Pressable key={c} onPress={() => setFilter(c)} style={[s.chip, filter === c && s.chipOn]}>
            <Text style={[s.chipText, filter === c && s.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={shown}
        numColumns={3}
        keyExtractor={(i) => i._id}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => (
          <Pressable style={s.cell} onPress={() => setOpen(item)}>
            {item.frontUrl ? <Image source={{ uri: item.frontUrl }} style={s.cellImg} /> : null}
            {item.status !== "done" ? (
              <View style={[s.badge, item.status === "error" && s.badgeErr]}>
                <Text style={s.badgeText}>{item.status === "pending" ? "..." : "!"}</Text>
              </View>
            ) : null}
            {item.attrs ? (
              <View style={s.swatchRow}>
                <View style={[s.swatch, { backgroundColor: item.attrs.primaryHex }]} />
                <Text numberOfLines={1} style={s.cellLabel}>{item.attrs.subtype}</Text>
              </View>
            ) : null}
          </Pressable>
        )}
      />

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)}>
        {open ? (
          <ScrollView contentContainerStyle={s.detail}>
            <View style={s.photoRow}>
              {open.frontUrl ? <Image source={{ uri: open.frontUrl }} style={s.photo} /> : null}
              {open.backUrl ? <Image source={{ uri: open.backUrl }} style={s.photo} /> : null}
            </View>

            {open.status === "error" ? <Text style={s.err}>{open.error}</Text> : null}
            {open.status === "pending" ? <Text style={s.sub}>Waiting for the tagger — is `npm run ingest:watch` running?</Text> : null}

            {open.attrs ? (
              <>
                <Text style={s.detailTitle}>{open.attrs.name}</Text>
                <Row k="category" v={open.attrs.category} />
                <Row k="type" v={open.attrs.subtype} />
                <Row k="brand" v={open.attrs.brand ?? ""} />
                <Row
                  k="colour"
                  v={`${open.attrs.primaryColor}  ${open.attrs.primaryHex}`}
                  hex={open.attrs.primaryHex}
                />
                {open.attrs.secondaryColors.map((c, i) => (
                  <Row
                    key={c + i}
                    k={i ? "" : "also"}
                    v={`${c}  ${open.attrs?.secondaryHexes[i] ?? ""}`}
                    hex={open.attrs?.secondaryHexes[i]}
                  />
                ))}
                <Row k="pattern" v={open.attrs.pattern} />
                <Row k="material" v={open.attrs.material} />
                {open.attrs.fit === "n/a" ? null : <Row k="fit" v={open.attrs.fit} />}
                <Row k="formality" v={open.attrs.formality} />
                <Row k="seasons" v={open.attrs.seasons.join(", ")} />

                {/* Fragrance block — absent on garments. */}
                <Row k="family" v={open.attrs.scentFamily ?? ""} />
                <Row k="top" v={(open.attrs.topNotes ?? []).join(", ")} />
                <Row k="heart" v={(open.attrs.heartNotes ?? []).join(", ")} />
                <Row k="base" v={(open.attrs.baseNotes ?? []).join(", ")} />
                <Row k="size" v={open.attrs.sizeMl ? `${open.attrs.sizeMl} ml` : ""} />

                <Row k="tags" v={open.attrs.tags.join(", ")} />
                <Text style={s.notes}>{open.attrs.notes}</Text>
              </>
            ) : null}

            <View style={s.actions}>
              {open.status !== "pending" ? (
                <Pressable
                  style={s.action}
                  onPress={() => { void retry({ id: open._id, key: closetKey }); setOpen(null); }}
                >
                  <Text style={s.actionText}>Re-tag</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[s.action, s.danger]}
                onPress={() => { void remove({ id: open._id, key: closetKey }); setOpen(null); }}
              >
                <Text style={[s.actionText, s.dangerText]}>Delete</Text>
              </Pressable>
              <Pressable style={s.action} onPress={() => setOpen(null)}>
                <Text style={s.actionText}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </Modal>
    </View>
  );
}

function Row({ k, v, hex }: { k: string; v: string; hex?: string }) {
  if (!v?.trim()) return null;
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      {hex ? <View style={[s.rowSwatch, { backgroundColor: hex }]} /> : null}
      <Text style={s.rowV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#fafaf8" },
  center: { alignItems: "center", justifyContent: "center" },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "700", color: "#17170f" },
  sub: { fontSize: 13, color: "#8a8a7a", marginTop: 2 },
  chipRow: { flexGrow: 0 },
  chipRowInner: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, backgroundColor: "#ecece4" },
  chipOn: { backgroundColor: "#17170f" },
  chipText: { fontSize: 13, color: "#55554a" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  grid: { padding: 6, paddingBottom: 100 },
  cell: { width: "33.33%", padding: 4 },
  cellImg: { width: "100%", aspectRatio: 0.78, borderRadius: 10, backgroundColor: "#e4e4dc" },
  cellLabel: { fontSize: 11, color: "#55554a", flexShrink: 1 },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: 2 },
  swatch: {
    width: 10, height: 10, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#00000022",
  },
  badge: {
    position: "absolute", top: 10, right: 10, minWidth: 20, height: 20, borderRadius: 999,
    backgroundColor: "#17170f", alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  badgeErr: { backgroundColor: "#b03a2e" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  detail: { padding: 20, paddingTop: 56, paddingBottom: 60, gap: 2, backgroundColor: "#fafaf8" },
  photoRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  photo: { flex: 1, aspectRatio: 0.78, borderRadius: 12, backgroundColor: "#e4e4dc" },
  detailTitle: { fontSize: 22, fontWeight: "700", color: "#17170f", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  rowK: { width: 84, fontSize: 12, color: "#8a8a7a", textTransform: "uppercase", letterSpacing: 0.5 },
  rowV: { fontSize: 15, color: "#17170f", flexShrink: 1 },
  rowSwatch: {
    width: 14, height: 14, borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth, borderColor: "#00000022",
  },
  notes: { marginTop: 14, fontSize: 14, lineHeight: 20, color: "#55554a", fontStyle: "italic" },
  err: { color: "#b03a2e", fontSize: 13, marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 28 },
  action: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#ecece4", alignItems: "center" },
  actionText: { fontSize: 14, fontWeight: "600", color: "#17170f" },
  danger: { backgroundColor: "#f6dedb" },
  dangerText: { color: "#b03a2e" },
});
