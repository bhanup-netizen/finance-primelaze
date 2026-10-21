"use strict";
// Simulation of the leads persistence model to prove the v423 permanent fix.
// Models Firestore set({...},{merge:true}) EXACTLY: deep-merges map fields,
// REPLACES array fields wholesale, honours delete() and arrayUnion() sentinels.

let pass = 0, fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log("  ✗ FAIL:", msg); } };
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isPlainObj = (v) => v && typeof v === "object" && !Array.isArray(v) && !v.__sentinel;
const DEL = { __sentinel: "delete" };
const AU = (...values) => ({ __sentinel: "arrayUnion", values });

// --- Model of Firestore's merge write -------------------------------------
function fsSetMerge(doc, data) {
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (v && v.__sentinel === "delete") { delete doc[k]; }
    else if (v && v.__sentinel === "arrayUnion") {
      const arr = Array.isArray(doc[k]) ? doc[k].slice() : [];
      v.values.forEach((x) => { if (!arr.some((y) => deepEq(y, x))) arr.push(x); });
      doc[k] = arr;
    } else if (isPlainObj(v)) {
      if (!isPlainObj(doc[k])) doc[k] = {};
      fsSetMerge(doc[k], v);           // MAPS are deep-merged (keys preserved)
    } else {
      doc[k] = Array.isArray(v) ? v.slice() : v;  // ARRAYS + scalars REPLACE
    }
  }
}

// --- v423 write-payload builder (mirrors saveEdits) -----------------------
function buildWrite_v423(s) {
  const lp = { updatedAt: 1, updatedBy: s.me };
  if (s.leadEditKeysDirty.size) { lp.leadEdits = {}; s.leadEditKeysDirty.forEach((k) => { lp.leadEdits[k] = (k in s.leadEdits) ? s.leadEdits[k] : DEL; }); }
  if (s.leadAddIdsDirty.size) { lp.leadAddsMap = {}; s.leadAddIdsDirty.forEach((id) => { const o = s.leadAdds.find((x) => x.id === id); lp.leadAddsMap[id] = o ? o : DEL; }); }
  if (s.leadArchiveDirty.size) { lp.leadArchiveMap = {}; s.leadArchiveDirty.forEach((on, id) => { lp.leadArchiveMap[id] = !!on; }); }
  if (s.leadRemovalsDirty.length) { lp.leadRemovalsMap = {}; s.leadRemovalsDirty.forEach((id) => { lp.leadRemovalsMap[id] = true; }); }
  return lp;
}
// --- OLD (pre-fix) write: rebuilds the WHOLE leadAdds ARRAY from local -----
function buildWrite_OLD(s) {
  return { updatedAt: 1, updatedBy: s.me, leadAdds: s.leadAdds.slice() };
}

// --- v423 reconstruction (mirrors loadEdits) ------------------------------
function reconstruct(e) {
  const leadEdits = {}; if (e.leadEdits) Object.assign(leadEdits, e.leadEdits);
  const rmSet = new Set();
  if (Array.isArray(e.leadRemovals)) e.leadRemovals.forEach((id) => rmSet.add(id));
  if (e.leadRemovalsMap) Object.keys(e.leadRemovalsMap).forEach((id) => { if (e.leadRemovalsMap[id]) rmSet.add(id); });
  const byId = new Map();
  if (Array.isArray(e.leadAdds)) e.leadAdds.forEach((l) => { if (l && l.id) byId.set(l.id, l); });
  if (e.leadAddsMap) Object.keys(e.leadAddsMap).forEach((id) => { const v = e.leadAddsMap[id]; if (v && typeof v === "object") byId.set(id, v); else byId.delete(id); });
  const leadAdds = []; byId.forEach((l, id) => { if (!rmSet.has(id)) leadAdds.push(l); });
  const arSet = new Set();
  if (Array.isArray(e.leadArchive)) e.leadArchive.forEach((id) => arSet.add(id));
  if (e.leadArchiveMap) Object.keys(e.leadArchiveMap).forEach((id) => { if (e.leadArchiveMap[id]) arSet.add(id); else arSet.delete(id); });
  return { leadEdits, leadAdds, leadArchive: [...arSet].filter((id) => !rmSet.has(id)), leadRemovals: [...rmSet] };
}
const mkState = (me) => ({ me, leadEdits: {}, leadAdds: [], leadEditKeysDirty: new Set(), leadAddIdsDirty: new Set(), leadArchiveDirty: new Map(), leadRemovalsDirty: [] });

// ==========================================================================
console.log("\n# 1. The exact bug: a STALE tab edits one lead");
{
  // Server already holds 100 added leads.
  const server = { leadAddsMap: {} };
  for (let i = 0; i < 100; i++) server.leadAddsMap["u" + i] = { id: "u" + i, name: "Lead " + i };

  // Session B is stale — it only ever loaded 2 of them, then edits u1's name.
  const B = mkState("b@x");
  B.leadAdds = [{ id: "u0", name: "Lead 0" }, { id: "u1", name: "Lead 1 EDITED" }];
  B.leadAddIdsDirty.add("u1");

  // --- NEW (v423) ---
  const srvNew = JSON.parse(JSON.stringify(server));
  fsSetMerge(srvNew, buildWrite_v423(B));
  const recNew = reconstruct(srvNew);
  assert(recNew.leadAdds.length === 100, "v423: all 100 leads survive a stale-tab edit (got " + recNew.leadAdds.length + ")");
  assert(recNew.leadAdds.find((l) => l.id === "u1").name === "Lead 1 EDITED", "v423: the edit was applied to u1");

  // --- OLD (pre-fix) on the SAME inputs, to show it was the real cause ---
  const srvOld = JSON.parse(JSON.stringify(server));
  // old doc stored an array; emulate server holding the array form too
  srvOld.leadAdds = Object.values(server.leadAddsMap); delete srvOld.leadAddsMap;
  fsSetMerge(srvOld, buildWrite_OLD(B));
  assert(srvOld.leadAdds.length === 2, "OLD: array write WIPED 98 leads (left " + srvOld.leadAdds.length + ") — this was the bug");
}

console.log("\n# 2. Two sessions add a lead at the same time");
{
  const server = { leadAddsMap: {} };
  for (let i = 0; i < 50; i++) server.leadAddsMap["u" + i] = { id: "u" + i, name: "L" + i };
  const A = mkState("a@x"); A.leadAdds = [{ id: "uA", name: "Added by A" }]; A.leadAddIdsDirty.add("uA");
  const B = mkState("b@x"); B.leadAdds = [{ id: "uB", name: "Added by B" }]; B.leadAddIdsDirty.add("uB");
  fsSetMerge(server, buildWrite_v423(A));
  fsSetMerge(server, buildWrite_v423(B));
  const rec = reconstruct(server);
  assert(rec.leadAdds.length === 52, "both concurrent adds survive (got " + rec.leadAdds.length + ")");
  assert(rec.leadAdds.some((l) => l.id === "uA") && rec.leadAdds.some((l) => l.id === "uB"), "both A's and B's new leads present");
}

console.log("\n# 3. Local state EMPTY (failed read) then user adds one lead");
{
  const server = { leadAddsMap: {} };
  for (let i = 0; i < 30; i++) server.leadAddsMap["u" + i] = { id: "u" + i, name: "L" + i };
  const C = mkState("c@x"); // completely empty local (read failed at login)
  C.leadAdds = [{ id: "uNew", name: "First lead after reconnect" }]; C.leadAddIdsDirty.add("uNew");
  fsSetMerge(server, buildWrite_v423(C));
  const rec = reconstruct(server);
  assert(rec.leadAdds.length === 31, "empty-local session cannot wipe server leads (got " + rec.leadAdds.length + ")");
}

console.log("\n# 4. Delete (tombstone) removes only the target");
{
  const server = { leadAddsMap: { u1: { id: "u1", name: "A" }, u2: { id: "u2", name: "B" }, u3: { id: "u3", name: "C" } } };
  const D = mkState("d@x");
  // leadRemove: tombstone + drop local add
  D.leadRemovalsDirty.push("u2"); D.leadAddIdsDirty.add("u2"); // u2 not in D.leadAdds -> DEL
  fsSetMerge(server, buildWrite_v423(D));
  const rec = reconstruct(server);
  assert(rec.leadAdds.length === 2 && !rec.leadAdds.some((l) => l.id === "u2"), "only u2 removed, u1 & u3 intact");
}

console.log("\n# 5. Archive then restore");
{
  const server = { leadAddsMap: { u1: { id: "u1" }, u2: { id: "u2" } } };
  const E = mkState("e@x"); E.leadArchiveDirty.set("u1", true);
  fsSetMerge(server, buildWrite_v423(E));
  assert(reconstruct(server).leadArchive.includes("u1"), "u1 archived");
  const F = mkState("f@x"); F.leadArchiveDirty.set("u1", false); // restore
  fsSetMerge(server, buildWrite_v423(F));
  assert(!reconstruct(server).leadArchive.includes("u1"), "u1 restored (un-archived)");
}

console.log("\n# 6. Legacy array-only doc still loads; 7. legacy+map transition (map wins)");
{
  const legacy = { leadAdds: [{ id: "u1", name: "old1" }, { id: "u2", name: "old2" }] };
  assert(reconstruct(legacy).leadAdds.length === 2, "legacy array-only doc loads all leads");
  // Someone edits u1 on the new build -> goes to the map; legacy array still there.
  const G = mkState("g@x"); G.leadAdds = [{ id: "u1", name: "NEW name" }]; G.leadAddIdsDirty.add("u1");
  fsSetMerge(legacy, buildWrite_v423(G));
  const rec = reconstruct(legacy);
  assert(rec.leadAdds.length === 2, "transition doc: still 2 leads (no dup)");
  assert(rec.leadAdds.find((l) => l.id === "u1").name === "NEW name", "transition doc: map value wins over legacy array");
}

console.log("\n# 8. Stress: 200 random edits from 5 stale sessions never lose a lead");
{
  const server = { leadAddsMap: {} };
  const N = 300;
  for (let i = 0; i < N; i++) server.leadAddsMap["u" + i] = { id: "u" + i, name: "L" + i, v: 0 };
  for (let step = 0; step < 200; step++) {
    const s = mkState("s" + (step % 5) + "@x");
    const id = "u" + Math.floor(Math.random() * N);
    // stale session: only knows a random handful, edits `id`
    s.leadAdds = [{ id, name: "L" + id.slice(1), v: step }]; s.leadAddIdsDirty.add(id);
    fsSetMerge(server, buildWrite_v423(s));
  }
  const rec = reconstruct(server);
  assert(rec.leadAdds.length === N, "after 200 stale concurrent edits, all " + N + " leads remain (got " + rec.leadAdds.length + ")");
}

console.log("\n============================================");
console.log("PASSED: " + pass + "   FAILED: " + fail);
process.exit(fail ? 1 : 0);
