"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type UrlInfo = { url: string; company?: string; visitors?: { name: string }[] };
type ResultData = {
  appointment: { id: string };
  urls: UrlInfo[];
  type: "direct" | "vote";
};

function UrlRow({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const copy = () => {
    ref.current?.select();
    try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {}
  };
  return (
    <div className={label ? "mb-3.5" : ""}>
      {label && <div className="text-sm font-semibold text-gray-500 mb-1">{label}</div>}
      <div className="flex gap-2">
        <input ref={ref} readOnly value={url} onFocus={e => (e.target as HTMLInputElement).select()} className="flex-1 px-2.5 py-2 border border-gray-300 rounded-md text-xs text-gray-700 bg-gray-50 outline-none" />
        <button onClick={copy} className={`px-4 py-2 border rounded-md text-xs font-semibold whitespace-nowrap ${copied ? "bg-brand-500 text-white border-brand-500" : "bg-white text-brand-500 border-brand-500"}`}>
          {copied ? "コピー済" : "URLをコピー"}
        </button>
      </div>
    </div>
  );
}

export default function CompletePage() {
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ff_appointment_result");
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <p className="text-gray-400 mb-4">データがありません</p>
          <button onClick={() => router.push("/dashboard")} className="text-brand-500 text-sm font-medium">ダッシュボードに戻る</button>
        </div>
      </div>
    );
  }

  const isVote = data.type === "vote";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-200 px-5 py-3 text-center">
        <h1 className="text-sm font-bold">新規アポイントメント</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-9 text-center">
        <p className="text-sm text-gray-500 font-medium mb-5">日程調整用URLを発行しました。</p>

        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-7">
          <circle cx="40" cy="40" r="36" stroke="#00bfa5" strokeWidth="3" />
          <path d="M24 40l11 11 21-21" stroke="#00bfa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="text-left mb-5">
          {!isVote ? (
            <UrlRow url={data.urls[0]?.url || ""} />
          ) : (
            <>
              <div className="text-xs text-brand-600 font-semibold mb-2.5 bg-brand-50 rounded px-3 py-1.5">
                来訪者が複数社のため、会社ごとに個別の投票URLを発行しました。
              </div>
              {data.urls.map((u, i) => (
                <UrlRow
                  key={i}
                  url={u.url}
                  label={`${u.company || "未設定"}（${(u.visitors || []).map(v => v.name || "未入力").join("、")} 様）`}
                />
              ))}
            </>
          )}
        </div>

        <div className="text-left text-sm text-gray-500 leading-relaxed mb-2.5">
          上記の日程調整URLをお客様に送ってください。<br />
          {isVote ? "全社の回答が揃うとメールでお知らせが届きます。" : "お客様が日程を確定すると、メールでお知らせが届きます。"}
        </div>
        <div className="text-left text-xs text-gray-400 leading-relaxed mb-7">
          すべての日時候補がご都合と合わなかった場合、再度調整依頼が届きます。
        </div>

        <button onClick={() => { sessionStorage.removeItem("ff_appointment_result"); router.push("/dashboard"); }} className="w-full max-w-md py-3 bg-brand-500 text-white rounded-md text-base font-bold">
          アポイントメント一覧に戻る
        </button>
      </div>
    </div>
  );
}
