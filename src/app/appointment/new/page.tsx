"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const SH = 60;
const SNAP = 15;
const DJ = ["日", "月", "火", "水", "木", "金", "土"];

const COLORS = [
  { bg: "#00bfa5", light: "#e0f7f3", evBg: "#e0f7f3", evBorder: "#00bfa5", evText: "#00796b" },
  { bg: "#f97316", light: "#fff7ed", evBg: "#fff7ed", evBorder: "#fb923c", evText: "#c2410c" },
  { bg: "#3b82f6", light: "#eff6ff", evBg: "#eff6ff", evBorder: "#60a5fa", evText: "#1e40af" },
  { bg: "#e11d48", light: "#fff1f2", evBg: "#fff1f2", evBorder: "#fb7185", evText: "#9f1239" },
  { bg: "#8b5cf6", light: "#f5f3ff", evBg: "#f5f3ff", evBorder: "#a78bfa", evText: "#5b21b6" },
  { bg: "#eab308", light: "#fefce8", evBg: "#fefce8", evBorder: "#facc15", evText: "#854d0e" },
];

type Staff = { id: string; name: string; evs: { d: number; s: number; e: number; t: string }[] };
type Slot = { id: string; dk: string; date: Date; sM: number; eM: number };
type CalEv = { sM: number; eM: number; t: string; staffName: string; dayIdx: number; c: typeof COLORS[0] };

// Mock staff (will be replaced with API)
const STAFF: Staff[] = [
  { id: "s1", name: "中沢 仁", evs: [{ d: 1, s: 570, e: 600, t: "振り返り" }, { d: 1, s: 780, e: 840, t: "CRMミーティング" }, { d: 2, s: 780, e: 840, t: "さらばし銀行" }, { d: 4, s: 780, e: 900, t: "バンクMT" }] },
  { id: "s2", name: "凛砂 舞", evs: [{ d: 1, s: 600, e: 660, t: "チームMTG" }, { d: 2, s: 840, e: 900, t: "1on1" }, { d: 3, s: 780, e: 840, t: "企画会議" }] },
];

const ws = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0, 0, 0, 0); return r; };
const ad = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ft = (h: number, m: number) => { const a = h < 12 ? "AM" : "PM"; return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${a}`; };
const sm = (r: number) => Math.round(r / SNAP) * SNAP;
const m2y = (m: number) => ((m - HOURS[0] * 60) / 60) * SH;
const y2m = (y: number, t: number) => sm(((y - t) / SH) * 60 + HOURS[0] * 60);
const fds = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}（${DJ[d.getDay()]}）`;

export default function NewAppointmentPage() {
  const router = useRouter();
  const [wk, setWk] = useState(() => ws(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [drg, setDrg] = useState<{ di: number; s: number; c: number } | null>(null);
  const [pop, setPop] = useState<{ di: number; sM: number; eM: number; x: number; y: number } | null>(null);
  const [asgn, setAsgn] = useState<Staff[]>([STAFF[0]]);
  const [showStaff, setShowStaff] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const cols = useRef<(HTMLDivElement | null)[]>([]);

  const wds = useMemo(() => Array.from({ length: 7 }, (_, i) => ad(wk, i)), [wk]);
  const tk = fk(new Date());
  const wl = useMemo(() => {
    const s = wds[0], e = wds[6];
    return s.getMonth() === e.getMonth()
      ? `${s.getMonth() + 1}月 ${s.getDate()}-${e.getDate()}`
      : `${s.getMonth() + 1}月 ${s.getDate()}-${e.getMonth() + 1}月 ${e.getDate()}`;
  }, [wds]);

  const sorted = useMemo(() => [...slots].sort((a, b) => a.dk < b.dk ? -1 : a.dk > b.dk ? 1 : a.sM - b.sM), [slots]);
  const grouped = useMemo(() => {
    const g: Record<string, { date: Date; sl: Slot[] }> = {};
    for (const s of sorted) { if (!g[s.dk]) g[s.dk] = { date: s.date, sl: [] }; g[s.dk].sl.push(s); }
    return g;
  }, [sorted]);
  const copyText = useMemo(() => {
    if (!slots.length) return "";
    return "【日程候補】\n" + sorted.map(s => `${fds(s.date)} ${ft(Math.floor(s.sM / 60), s.sM % 60)} - ${ft(Math.floor(s.eM / 60), s.eM % 60)}`).join("\n");
  }, [slots, sorted]);

  const colorMap = useMemo(() => {
    const m: Record<string, typeof COLORS[0]> = {};
    asgn.forEach((s, i) => { m[s.id] = COLORS[i % COLORS.length]; });
    return m;
  }, [asgn]);

  const calEvs = useMemo(() => {
    const evs: CalEv[] = [];
    asgn.forEach(staff => {
      const c = colorMap[staff.id];
      if (!staff.evs) return;
      staff.evs.forEach(ev => { evs.push({ sM: ev.s, eM: ev.e, t: ev.t, staffName: staff.name, dayIdx: ev.d, c }); });
    });
    return evs;
  }, [asgn, colorMap]);

  const hmd = useCallback((e: React.MouseEvent, di: number) => {
    if (e.button !== 0) return;
    const c = cols.current[di];
    if (!c) return;
    const r = c.getBoundingClientRect();
    setDrg({ di, s: y2m(e.clientY, r.top), c: y2m(e.clientY, r.top) });
    setPop(null);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!drg) return;
    const mv = (e: MouseEvent) => {
      const c = cols.current[drg.di];
      if (!c) return;
      const r = c.getBoundingClientRect();
      let m = y2m(e.clientY, r.top);
      m = Math.max(HOURS[0] * 60, Math.min(HOURS[HOURS.length - 1] * 60 + 60, m));
      setDrg(p => p ? { ...p, c: m } : null);
    };
    const up = (e: MouseEvent) => {
      setDrg(p => {
        if (!p) return null;
        const s1 = Math.min(p.s, p.c), e1 = Math.max(p.s, p.c);
        if (e1 - s1 < SNAP) return null;
        const c = cols.current[p.di];
        const r = c ? c.getBoundingClientRect() : { left: 200, width: 100 };
        let px = Math.max(10, r.left + r.width / 2 - 130);
        let py = Math.min(e.clientY, window.innerHeight - 140);
        setPop({ di: p.di, sM: s1, eM: e1, x: px, y: Math.max(60, py) });
        return null;
      });
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [drg]);

  const save = () => {
    if (!pop) return;
    const dk = fk(wds[pop.di]);
    const id = `${dk}-${pop.sM}-${pop.eM}`;
    if (!slots.find(s => s.id === id)) setSlots(p => [...p, { id, dk, date: wds[pop.di], sM: pop.sM, eM: pop.eM }]);
    setPop(null);
  };
  const rm = (id: string) => { setSlots(p => p.filter(s => s.id !== id)); setPop(null); };

  const dp = drg ? { di: drg.di, sM: Math.min(drg.s, drg.c), eM: Math.max(drg.s, drg.c) } : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", userSelect: "none" }} className="font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b border-gray-200">
        <button onClick={() => router.push("/dashboard")} className="absolute text-brand-500 text-xs font-medium">← 戻る</button>
        <div className="flex-1 text-center text-sm font-bold">新規アポイントメント</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[200px] shrink-0 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-3 flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold">選択した日時</span>
              <button onClick={() => slots.length && setShowCopy(true)} className={`text-[10px] ${slots.length ? "text-brand-500" : "text-gray-300"}`}>日時候補をコピー</button>
            </div>
            {!slots.length ? (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-[11px] text-gray-400 leading-relaxed min-h-[100px]">カレンダーで選んだ日程がこちらに表示されます。</div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 min-h-[100px]">
                {Object.entries(grouped).map(([dk, g]) => (
                  <div key={dk} className="mb-1.5">
                    <div className="text-[11px] font-semibold text-gray-500 mb-0.5">{fds(g.date)}</div>
                    {g.sl.map(s => (
                      <div key={s.id} className="flex justify-between bg-brand-50 rounded px-1.5 py-0.5 mb-0.5 text-[10px] text-brand-600">
                        <span>{ft(Math.floor(s.sM / 60), s.sM % 60)}-{ft(Math.floor(s.eM / 60), s.eM % 60)}</span>
                        <button onClick={() => rm(s.id)} className="text-brand-600">✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 py-2.5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold">担当者一覧</span>
              <button onClick={() => setShowStaff(true)} className="text-[10px] text-brand-500">担当者を選択する</button>
            </div>
            {asgn.map((s, idx) => {
              const c = COLORS[idx % COLORS.length];
              return (
                <div key={s.id} className="flex items-center justify-between rounded-full px-2.5 py-1 mb-1" style={{ background: c.bg }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold" style={{ color: c.bg }}>{s.name[0]}</div>
                    <span className="text-xs text-white">{s.name}</span>
                  </div>
                  <button onClick={() => asgn.length > 1 && setAsgn(p => p.filter(x => x.id !== s.id))} className="text-white/70 text-xs">✕</button>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-2.5">
            <button
              onClick={() => slots.length && router.push("/appointment/confirm")}
              className={`w-full py-2.5 rounded-md text-white text-sm font-bold ${slots.length ? "bg-brand-500" : "bg-brand-200 cursor-default"}`}
            >
              内容を確認する
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-200">
            <button onClick={() => setWk(ws(new Date()))} className="border border-gray-300 rounded bg-white px-2.5 py-0.5 text-xs">今日</button>
            <button onClick={() => setWk(w => ad(w, -7))} className="text-lg">‹</button>
            <button onClick={() => setWk(w => ad(w, 7))} className="text-lg">›</button>
            <span className="text-sm font-semibold">{wl}</span>
          </div>

          <div className="flex border-b border-gray-200">
            <div className="w-[52px] shrink-0 border-r border-gray-200 px-0.5 py-1.5 text-[10px] text-gray-400 text-center">GMT+9</div>
            {wds.map((d, i) => {
              const isT = fk(d) === tk;
              return (
                <div key={i} className={`flex-1 text-center py-1.5 ${i < 6 ? "border-r border-gray-200" : ""} ${isT ? "bg-brand-50" : ""}`}>
                  <div className={`text-[10px] ${d.getDay() === 0 ? "text-red-500" : d.getDay() === 6 ? "text-blue-500" : "text-gray-400"}`}>{DJ[d.getDay()]}</div>
                  <div className={`text-lg ${isT ? "font-bold text-brand-500" : "font-medium"}`}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-auto">
            <div className="flex" style={{ minHeight: HOURS.length * SH }}>
              <div className="w-[52px] shrink-0 relative">
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full text-right pr-1.5 text-[10px] text-gray-400" style={{ top: (h - HOURS[0]) * SH - 7 }}>{ft(h, 0)}</div>
                ))}
              </div>
              {wds.map((d, di) => {
                const dk = fk(d);
                const ds = slots.filter(s => s.dk === dk);
                const dayEvs = calEvs.filter(e => e.dayIdx === di);
                const isT = dk === tk;

                // Overlap layout
                const laid: (CalEv & { col: number })[] = [];
                dayEvs.forEach(ev => {
                  let col = 0;
                  while (laid.some(l => l.col === col && !(ev.sM >= l.eM || ev.eM <= l.sM))) col++;
                  laid.push({ ...ev, col });
                });
                const maxCol = laid.length ? Math.max(...laid.map(l => l.col)) + 1 : 1;

                return (
                  <div
                    key={di}
                    ref={el => { cols.current[di] = el; }}
                    onMouseDown={e => hmd(e, di)}
                    className={`flex-1 relative ${di < 6 ? "border-r border-gray-100" : ""} ${isT ? "bg-[#f9fffe]" : ""}`}
                    style={{ cursor: "crosshair" }}
                  >
                    {HOURS.map(h => <div key={h} className="absolute left-0 right-0 border-t border-gray-200" style={{ top: (h - HOURS[0]) * SH }} />)}
                    {HOURS.map(h => <div key={`h${h}`} className="absolute left-0 right-0 border-t border-dotted border-gray-300" style={{ top: (h - HOURS[0]) * SH + SH / 2 }} />)}

                    {/* Staff events with overlap */}
                    {laid.map((ev, ei) => {
                      const tp = m2y(ev.sM), h = m2y(ev.eM) - tp;
                      const w = `calc(${100 / maxCol}% - 3px)`;
                      const lf = `calc(${(ev.col * 100 / maxCol)}% + 2px)`;
                      return (
                        <div key={`ev${ei}`} className="absolute rounded overflow-hidden pointer-events-none" style={{ top: tp, left: lf, width: w, height: Math.max(h - 2, 18), background: ev.c.evBg, border: `1px solid ${ev.c.evBorder}`, borderLeft: `3px solid ${ev.c.bg}`, padding: "2px 4px", fontSize: 9, color: ev.c.evText, zIndex: 2, boxSizing: "border-box" }}>
                          <div className="font-medium">{ft(Math.floor(ev.sM / 60), ev.sM % 60)}-{ft(Math.floor(ev.eM / 60), ev.eM % 60)}</div>
                          <div className="whitespace-nowrap overflow-hidden text-ellipsis">{ev.t}</div>
                        </div>
                      );
                    })}

                    {/* Selected slots */}
                    {ds.map(sl => {
                      const tp = m2y(sl.sM), h = m2y(sl.eM) - tp;
                      return (
                        <div key={sl.id} onMouseDown={e => e.stopPropagation()} className="absolute left-0.5 right-0.5 bg-brand-500 rounded text-white text-[10px] px-1 py-0.5" style={{ top: tp, height: Math.max(h - 2, 18), zIndex: 3 }}>
                          <div className="font-semibold">{ft(Math.floor(sl.sM / 60), sl.sM % 60)}-{ft(Math.floor(sl.eM / 60), sl.eM % 60)}</div>
                        </div>
                      );
                    })}

                    {/* Drag preview */}
                    {dp && dp.di === di && dp.eM - dp.sM >= SNAP && (
                      <div className="absolute left-0.5 right-0.5 bg-brand-500/25 border-2 border-dashed border-brand-500 rounded flex items-center justify-center text-[11px] text-brand-700 font-semibold pointer-events-none" style={{ top: m2y(dp.sM), height: m2y(dp.eM) - m2y(dp.sM), zIndex: 4 }}>
                        {ft(Math.floor(dp.sM / 60), dp.sM % 60)}-{ft(Math.floor(dp.eM / 60), dp.eM % 60)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popover */}
          {pop && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPop(null)} />
              <div className="fixed z-50 bg-white rounded-lg shadow-xl p-3.5 w-[260px]" style={{ left: pop.x, top: pop.y }}>
                <div className="flex justify-between mb-2.5">
                  <div className="text-sm font-semibold">
                    {wds[pop.di].getMonth() + 1}月{wds[pop.di].getDate()}日 {ft(Math.floor(pop.sM / 60), pop.sM % 60)} - {ft(Math.floor(pop.eM / 60), pop.eM % 60)}
                  </div>
                  <button onClick={() => setPop(null)} className="text-gray-400 text-base">✕</button>
                </div>
                <button onClick={save} className="w-full py-2 bg-brand-500 text-white rounded-md text-sm font-semibold">保存</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Copy Modal */}
      {showCopy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowCopy(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative bg-white rounded-lg w-[380px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold">日時候補をコピー</h2>
              <button onClick={() => setShowCopy(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-1.5">全選択してコピー</p>
              <textarea readOnly value={copyText} onFocus={e => (e.target as HTMLTextAreaElement).select()} className="w-full min-h-[80px] p-2.5 border border-gray-300 rounded-md text-sm bg-gray-50 leading-relaxed resize-y outline-none" />
            </div>
            <div className="px-4 pb-3 flex justify-end">
              <button onClick={() => setShowCopy(false)} className="bg-brand-500 text-white rounded-md px-5 py-1.5 text-sm font-semibold">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowStaff(false)}>
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative bg-white rounded-lg w-[360px] max-h-[70vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-bold">担当者を選択</h2>
              <button onClick={() => setShowStaff(false)} className="text-gray-400">✕</button>
            </div>
            <div className="px-4 py-3 flex-1 overflow-auto">
              {STAFF.map(s => {
                const ai = asgn.findIndex(a => a.id === s.id);
                const added = ai >= 0;
                const c = added ? COLORS[ai % COLORS.length] : null;
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: added && c ? c.bg : "#e0f2f1", color: added ? "#fff" : "#00897b" }}>{s.name[0]}</div>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    {added ? (
                      <button onClick={() => asgn.length > 1 && setAsgn(p => p.filter(x => x.id !== s.id))} className="border border-gray-200 rounded px-2.5 py-0.5 text-[11px] text-gray-400">解除</button>
                    ) : (
                      <button onClick={() => setAsgn(p => [...p, s])} className="border border-brand-500 rounded px-2.5 py-0.5 text-[11px] text-brand-500">追加</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowStaff(false)} className="bg-brand-500 text-white rounded-md px-5 py-1.5 text-sm font-semibold">完了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
