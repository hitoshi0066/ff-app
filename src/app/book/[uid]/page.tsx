"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SlotData = { id: string; date: string; startMin: number; endMin: number };
type AppData = {
  visitor: { name: string; company: string | null; email: string | null; hasResponded: boolean };
  appointment: {
    status: string;
    host: { name: string; email: string };
    timeSlots: SlotData[];
    guidance: string | null;
  };
};

const DJ = ["日", "月", "火", "水", "木", "金", "土"];
function ft(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  const a = h < 12 ? "AM" : "PM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${a}`;
}

function groupSlots(slots: SlotData[]) {
  const g: Record<string, SlotData[]> = {};
  for (const s of slots) {
    const dk = s.date.slice(0, 10);
    if (!g[dk]) g[dk] = [];
    g[dk].push(s);
  }
  return Object.entries(g).sort(([a], [b]) => (a < b ? -1 : 1));
}

export default function BookPage() {
  const { uid } = useParams<{ uid: string }>();
  const [data, setData] = useState<AppData | null>(null);
  const [selected, setSelected] = useState<SlotData | null>(null);
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ date: string; time: string; meetUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/book/${uid}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [uid]);

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  const { visitor, appointment } = data;
  const host = appointment.host;
  const gs = groupSlots(appointment.timeSlots);

  const handleConfirm = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/book/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSlotId: selected.id, company, email }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json);
        setStep(1);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (step === 1 && result) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-xl mx-auto px-5 py-16 text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-6">
            <circle cx="40" cy="40" r="36" stroke="#00bfa5" strokeWidth="3" />
            <path d="M24 40l11 11 21-21" stroke="#00bfa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="text-xl font-bold mb-2">アポイントメントが確定しました</h1>
          <p className="text-sm text-gray-500 mb-6">確認メールを送信しました。当日のご参加をお待ちしております。</p>
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-left mb-6">
            <div className="text-xs text-gray-400 mb-1">確定日時</div>
            <div className="text-base font-semibold text-brand-500 mb-4">{result.date} {result.time}</div>
            <div className="text-xs text-gray-400 mb-1">主催者</div>
            <div className="text-sm mb-4">{host.name}</div>
            <div className="text-xs text-gray-400 mb-1">会議</div>
            <div className="text-sm">Google Meet（URLは確認メールに記載）</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-xl mx-auto px-5 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-sm font-semibold mb-2 leading-relaxed">
            {host.name} 様 ({host.email})<br />より、日程調整の依頼が届いています。
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            下記の日時候補から都合の良いスケジュールを１つ選択し、未入力の項目があれば入力してアポイントメントを確定してください。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="text-sm font-semibold text-brand-600 mb-3">担当者からの日時候補スケジュール</div>
          {gs.map(([dk, sl]) => {
            const d = new Date(dk + "T00:00:00");
            return (
              <div key={dk} className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  {d.getMonth() + 1}/{d.getDate()}({DJ[d.getDay()]})
                </div>
                <div className="flex flex-wrap gap-2">
                  {sl.map((s) => {
                    const isSel = selected?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelected(isSel ? null : s)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          isSel ? "bg-brand-500 text-white" : "bg-white border border-gray-300 text-gray-700 hover:border-brand-300"
                        }`}
                      >
                        {ft(s.startMin)}~{ft(s.endMin)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-5">
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたのお名前</div>
            <div className="text-base font-semibold">{visitor.name}様</div>
          </div>
          <div className="mb-5">
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたの会社名</div>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="会社名を入力"
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-brand-600 mb-1">あなたのメールアドレス</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              type="email"
              className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full py-3 border border-gray-300 rounded-lg bg-white text-brand-500 text-base font-semibold">
            都合の良い日時がないため、再調整を依頼する
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className={`w-full py-3 rounded-lg text-white text-base font-bold transition ${
              selected ? "bg-brand-500 hover:bg-brand-600" : "bg-brand-200 cursor-default"
            }`}
          >
            {submitting ? "処理中..." : "アポイントメントを確定する"}
          </button>
        </div>
      </div>
    </div>
  );
}
