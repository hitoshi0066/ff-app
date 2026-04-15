"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SlotData = { id: string; date: string; startMin: number; endMin: number };
type VoteData = { timeSlotId: string; answer: string };
type VisitorData = { id: string; name: string; company: string | null; votes: VoteData[]; hasResponded: boolean };

const DJ = ["日", "月", "火", "水", "木", "金", "土"];
function ft(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  const a = h < 12 ? "AM" : "PM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${a}`;
}

const OPT = ["OK", "MAYBE", "NG"] as const;
const OPT_DISPLAY: Record<string, { symbol: string; bg: string; active: string; text: string }> = {
  OK: { symbol: "○", bg: "bg-emerald-50 text-emerald-700 border-emerald-300", active: "bg-emerald-500 text-white", text: "text-emerald-500" },
  MAYBE: { symbol: "△", bg: "bg-yellow-50 text-yellow-700 border-yellow-300", active: "bg-yellow-500 text-white", text: "text-yellow-500" },
  NG: { symbol: "×", bg: "bg-red-50 text-red-700 border-red-300", active: "bg-red-500 text-white", text: "text-red-500" },
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

export default function VotePage() {
  const { uid } = useParams<{ uid: string }>();
  const [data, setData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/vote/${uid}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [uid]);

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  const { visitor, appointment } = data;
  const host = appointment.host;
  const slots: SlotData[] = appointment.timeSlots;
  const otherVisitors: VisitorData[] = appointment.visitors.filter((v: VisitorData) => v.id !== visitor.id && v.hasResponded);
  const gs = groupSlots(slots);
  const allAnswered = slots.every((s) => answers[s.id]);

  const setAns = (slotId: string, val: string) => {
    setAnswers((p) => ({ ...p, [slotId]: p[slotId] === val ? "" : val }));
  };

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vote/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, company, email }),
      });
      const json = await res.json();
      if (json.success) setSubmitted(true);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-xl mx-auto px-5 py-16 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-6">
            <circle cx="40" cy="40" r="36" stroke="#00bfa5" strokeWidth="3" />
            <path d="M24 40l11 11 21-21" stroke="#00bfa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-xl font-bold mb-2">回答を送信しました</h1>
          <p className="text-sm text-gray-500">全員の回答が揃い次第、主催者が日程を確定します。確定後にメールでお知らせします。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-sm font-semibold mb-2 leading-relaxed">
            {host.name} 様 ({host.email})<br />より、日程調整の依頼が届いています。
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            下記の日時候補について、参加可能かどうかを <strong>○△×</strong> で回答してください。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-auto">
          <div className="text-sm font-semibold text-brand-600 px-6 py-4">日時候補スケジュール</div>

          {/* Header */}
          <div className="flex items-center px-6 py-2 border-b-2 border-gray-200 text-xs font-semibold text-gray-500">
            <div className="flex-1 min-w-[140px]">日時</div>
            {otherVisitors.map((v) => (
              <div key={v.id} className="w-20 text-center">{v.name}</div>
            ))}
            <div className="w-44 text-center text-brand-600">あなたの回答</div>
          </div>

          {gs.map(([dk, sl]) => {
            const d = new Date(dk + "T00:00:00");
            return (
              <div key={dk}>
                <div className="px-6 py-2 text-xs font-bold text-gray-500 bg-gray-50">
                  {d.getMonth() + 1}/{d.getDate()}({DJ[d.getDay()]})
                </div>
                {sl.map((s) => (
                  <div key={s.id} className="flex items-center px-6 py-2 border-b border-gray-100">
                    <div className="flex-1 min-w-[140px] text-sm">{ft(s.startMin)} ~ {ft(s.endMin)}</div>
                    {otherVisitors.map((v) => {
                      const vote = v.votes.find((vt) => vt.timeSlotId === s.id);
                      const ans = vote?.answer || "";
                      const d = OPT_DISPLAY[ans];
                      return (
                        <div key={v.id} className="w-20 text-center">
                          {d ? (
                            <span className={`inline-block w-7 h-7 leading-7 rounded-full text-sm font-bold ${d.text}`}>
                              {d.symbol}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="w-44 flex justify-center gap-1">
                      {OPT.map((opt) => {
                        const d = OPT_DISPLAY[opt];
                        const active = answers[s.id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAns(s.id, opt)}
                            className={`w-10 h-8 rounded text-base font-bold transition ${active ? d.active : `${d.bg} border`}`}
                          >
                            {d.symbol}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="flex items-center px-6 py-3 bg-gray-50 border-t-2 border-gray-200 text-xs text-gray-500">
            <div className="flex-1 font-semibold">回答状況</div>
            {otherVisitors.map((v) => (
              <div key={v.id} className="w-20 text-center text-brand-500 font-semibold">回答済</div>
            ))}
            <div className={`w-44 text-center font-semibold ${allAnswered ? "text-brand-500" : "text-amber-500"}`}>
              {allAnswered ? "全て回答済" : `${Object.values(answers).filter(Boolean).length}/${slots.length}`}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-5">
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたのお名前</div>
            <div className="text-base font-semibold">{visitor.name}様</div>
          </div>
          <div className="mb-5">
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたの会社名</div>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="会社名を入力"
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたのメールアドレス</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレスを入力" type="email"
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full py-3 border border-gray-300 rounded-lg bg-white text-brand-500 text-base font-semibold">
            都合の良い日時がないため、再調整を依頼する
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`w-full py-3 rounded-lg text-white text-base font-bold transition ${allAnswered ? "bg-brand-500 hover:bg-brand-600" : "bg-brand-200 cursor-default"}`}
          >
            {submitting ? "送信中..." : "回答を送信する"}
          </button>
        </div>
      </div>
    </div>
  );
}
