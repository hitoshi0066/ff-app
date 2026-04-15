"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Visitor = { id: number; name: string; company: string; email: string };

export default function ConfirmPage() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([{ id: 1, name: "", company: "", email: "" }]);
  const [title, setTitle] = useState("");
  const [guidance, setGuidance] = useState("");
  const [nid, setNid] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // TODO: Get slots from state/context/URL params
  const demoSlots = [
    { date: "2026-04-16", startMin: 840, endMin: 900, label: "2:00 PM〜3:00 PM" },
    { date: "2026-04-16", startMin: 960, endMin: 1020, label: "4:00 PM〜5:00 PM" },
    { date: "2026-04-17", startMin: 960, endMin: 1020, label: "4:00 PM〜5:00 PM" },
  ];

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          guidance,
          issueCode: true,
          issueMeet: true,
          timeSlots: demoSlots.map(s => ({ date: s.date, startMin: s.startMin, endMin: s.endMin })),
          assigneeIds: [], // TODO: pass from calendar page
          visitors: visitors.map(v => ({ name: v.name, company: v.company, email: v.email })),
        }),
      });
      const data = await res.json();
      if (data.appointment) {
        // Store result and navigate to complete page
        sessionStorage.setItem("ff_appointment_result", JSON.stringify(data));
        router.push("/appointment/complete");
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-200 px-5 py-3 text-center">
        <h1 className="text-sm font-bold">新規アポイントメント</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <button onClick={() => router.back()} className="text-brand-500 text-xs font-medium mb-4">← カレンダーに戻る</button>
        <h2 className="text-sm font-bold text-gray-500 mb-5 pb-2.5 border-b-2 border-gray-200">送信内容の確認</h2>

        {/* 担当者 */}
        <div className="text-sm font-semibold text-brand-600 mb-1.5">担当者一覧</div>
        <div className="flex gap-1.5 mb-5">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
            <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-xs font-bold">中</div>
            <span className="text-sm font-medium">中沢 仁</span>
          </div>
        </div>

        {/* 選択した日時 */}
        <div className="text-sm font-semibold text-brand-600 mb-1.5">選択した日時</div>
        <div className="mb-5">
          {demoSlots.map((s, i) => (
            <span key={i} className="inline-block bg-white border border-gray-200 rounded px-3 py-1.5 text-xs mr-1.5 mb-1.5">{s.label}</span>
          ))}
        </div>

        {/* 会議タイトル */}
        <div className="text-sm font-semibold text-brand-600 mb-1.5">会議タイトル</div>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm mb-7 focus:outline-none focus:border-brand-500" />

        {/* 来訪者情報 */}
        <div className="border-t-2 border-gray-200 pt-4 mb-3">
          <div className="text-sm font-semibold text-brand-600 mb-2.5">来訪者情報</div>
        </div>
        <div className="mb-3 space-y-2">
          <label className="flex items-start gap-1.5 text-xs text-gray-500">
            <input type="checkbox" defaultChecked className="accent-brand-500 w-4 h-4 mt-0.5" />
            メールを送らず、日程調整URLのみ発行する
          </label>
          <label className="flex items-start gap-1.5 text-xs text-gray-500">
            <input type="checkbox" defaultChecked className="accent-brand-500 w-4 h-4 mt-0.5" />
            来訪者が2名以上の場合、1名の受付コードで同時に受付
          </label>
        </div>

        <div className="flex gap-1.5 mb-1 text-[11px] font-semibold text-brand-600">
          <div className="flex-1">氏名</div>
          <div className="w-[18px]" />
          <div className="flex-1">会社名</div>
          <div className="flex-[1.4]">メールアドレス</div>
          <div className="w-7" />
        </div>
        {visitors.map(v => (
          <div key={v.id} className="flex gap-1.5 mb-1.5 items-center">
            <input value={v.name} onChange={e => setVisitors(p => p.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))} placeholder="山田 太郎" className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-brand-500" />
            <span className="text-xs text-gray-400">様</span>
            <input value={v.company} onChange={e => setVisitors(p => p.map(x => x.id === v.id ? { ...x, company: e.target.value } : x))} placeholder="株式会社〇〇" className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-brand-500" />
            <input value={v.email} onChange={e => setVisitors(p => p.map(x => x.id === v.id ? { ...x, email: e.target.value } : x))} placeholder="example@co.jp" className="flex-[1.4] border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:border-brand-500" />
            <div className="w-7 flex justify-center">
              {visitors.length > 1 && <button onClick={() => setVisitors(p => p.filter(x => x.id !== v.id))} className="text-gray-300 hover:text-red-500 text-sm">✕</button>}
            </div>
          </div>
        ))}
        <button onClick={() => { setVisitors(p => [...p, { id: nid, name: "", company: "", email: "" }]); setNid(n => n + 1); }} className="flex items-center gap-1 border border-dashed border-brand-200 rounded px-3 py-1.5 text-brand-500 text-xs mt-1">＋ 来訪者を追加</button>

        {/* ご案内 */}
        <div className="mt-6 mb-7">
          <div className="text-xs font-semibold text-brand-600 mb-1.5">ご案内（招待メールに記載）</div>
          <textarea value={guidance} onChange={e => setGuidance(e.target.value)} placeholder="例）ビル1階にあるインターホンにて、401を呼び出してください。" rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm leading-relaxed resize-y focus:outline-none focus:border-brand-500" />
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-brand-500 text-white rounded-md text-base font-bold">
          {submitting ? "処理中..." : "日程調整用URLを発行する"}
        </button>
      </div>
    </div>
  );
}
