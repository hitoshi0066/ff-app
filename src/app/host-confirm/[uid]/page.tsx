"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SlotData = { id: string; date: string; startMin: number; endMin: number; votes: { visitor: { name: string; company: string | null }; answer: string }[] };

const DJ = ["日", "月", "火", "水", "木", "金", "土"];
function ft(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  const a = h < 12 ? "AM" : "PM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${a}`;
}

const ANS_DISPLAY: Record<string, { symbol: string; color: string }> = {
  OK: { symbol: "○", color: "bg-emerald-50 text-emerald-500" },
  MAYBE: { symbol: "△", color: "bg-yellow-50 text-yellow-500" },
  NG: { symbol: "×", color: "bg-red-50 text-red-500" },
};

function groupSlots(slots: SlotData[]) {
  const g: Record<string, SlotData[]> = {};
  for (const s of slots) {
    const dk = s.date.slice(0, 10);
    if (!g[dk]) g[dk] = [];
    g[dk].push(s);
  }
  return Object.entries(g).sort(([a], [b]) => (a < b ? -1 : 1));
}

export default function HostConfirmPage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<SlotData | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/${uid}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [uid]);

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  const slots: SlotData[] = data.timeSlots;
  const visitors = data.visitors;
  const gs = groupSlots(slots);

  const allOk: Record<string, boolean> = {};
  slots.forEach((s) => {
    allOk[s.id] = s.votes.length > 0 && s.votes.every((v: any) => v.answer === "OK");
  });

  const handleConfirm = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSlotId: selected.id }),
      });
      const json = await res.json();
      if (json.success) setStep(1);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (step === 1) {
    const d = new Date(selected!.date.slice(0, 10) + "T00:00:00");
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-xl mx-auto px-5 py-16 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-6">
            <circle cx="40" cy="40" r="36" stroke="#00bfa5" strokeWidth="3" />
            <path d="M24 40l11 11 21-21" stroke="#00bfa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-xl font-bold mb-2">アポイントメントを確定しました</h1>
          <p className="text-sm text-gray-500 mb-6">全参加者に確定メールを送信しました。</p>
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-left mb-6">
            <div className="text-xs text-gray-400 mb-1">確定日時</div>
            <div className="text-base font-semibold text-brand-500 mb-4">
              {d.getMonth() + 1}/{d.getDate()}({DJ[d.getDay()]}) {ft(selected!.startMin)} 〜 {ft(selected!.endMin)}
            </div>
            <div className="text-xs text-gray-400 mb-1">参加者</div>
            {visitors.map((v: any, i: number) => (
              <div key={i} className="text-sm mb-1">{v.company} {v.name} 様</div>
            ))}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 bg-brand-500 text-white rounded-lg font-bold"
          >
            アポイントメント一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="36" stroke="#00bfa5" strokeWidth="3" />
              <path d="M24 40l11 11 21-21" stroke="#00bfa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="text-lg font-bold text-brand-500">全員の回答が揃いました</h1>
              <p className="text-xs text-gray-500">日程を確定してください</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            全員が <span className="text-brand-500 font-semibold">○（参加可能）</span> の日時がハイライト表示されています。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-auto">
          <div className="flex items-center px-6 py-2 border-b-2 border-gray-200 text-xs font-semibold text-gray-500">
            <div className="w-6" />
            <div className="flex-1 min-w-[140px]">日時</div>
            {visitors.map((v: any) => (
              <div key={v.id} className="w-24 text-center">
                <div className="text-[10px] text-gray-400">{v.company}</div>
                <div>{v.name}</div>
              </div>
            ))}
            <div className="w-16 text-center">状態</div>
          </div>

          {gs.map(([dk, sl]) => {
            const d = new Date(dk + "T00:00:00");
            return (
              <div key={dk}>
                <div className="px-6 py-2 text-xs font-bold text-gray-500 bg-gray-50">
                  {d.getMonth() + 1}/{d.getDate()}({DJ[d.getDay()]})
                </div>
                {sl.map((s) => {
                  const isAllOk = allOk[s.id];
                  const isSel = selected?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => isAllOk && setSelected(isSel ? null : s)}
                      className={`flex items-center px-6 py-2 border-b border-gray-100 transition ${
                        isSel ? "bg-brand-50" : isAllOk ? "bg-emerald-50/40 cursor-pointer hover:bg-emerald-50" : ""
                      }`}
                    >
                      <div className="w-6">
                        {isAllOk && (
                          <div className={`w-4 h-4 rounded-full border-2 ${isSel ? "bg-brand-500 border-brand-500" : "border-brand-500 bg-white"}`}>
                            {isSel && <div className="w-2 h-2 rounded-full bg-white mx-auto mt-0.5" />}
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 min-w-[140px] text-sm ${isAllOk ? "font-semibold" : "text-gray-400"}`}>
                        {ft(s.startMin)} ~ {ft(s.endMin)}
                      </div>
                      {visitors.map((v: any) => {
                        const vote = s.votes.find((vt: any) => vt.visitor?.id === v.id || vt.visitorId === v.id);
                        const ans = vote?.answer || "";
                        const d = ANS_DISPLAY[ans];
                        return (
                          <div key={v.id} className="w-24 text-center">
                            {d ? (
                              <span className={`inline-block w-7 h-7 leading-7 rounded-full text-sm font-bold ${d.color}`}>{d.symbol}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        );
                      })}
                      <div className="w-16 text-center text-xs font-semibold">
                        {isAllOk ? <span className="text-brand-500">全員OK</span> : <span className="text-gray-300">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || submitting}
          className={`w-full py-3 rounded-lg text-white text-base font-bold transition ${
            selected ? "bg-brand-500 hover:bg-brand-600" : "bg-brand-200 cursor-default"
          }`}
        >
          {submitting ? "処理中..." : selected ? "この日時で確定する" : "全員○の日時を選択してください"}
        </button>
      </div>
    </div>
  );
}
