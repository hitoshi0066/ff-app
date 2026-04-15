"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Appointment = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  visitors: { name: string; company: string | null }[];
  timeSlots: { date: string; startMin: number; endMin: number }[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  PENDING: { label: "回答待ち", color: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "確定済み", color: "bg-brand-50 text-brand-700" },
  CANCELLED: { label: "キャンセル", color: "bg-red-50 text-red-700" },
};

function ft(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  const a = h < 12 ? "AM" : "PM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${a}`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/appointments")
        .then((r) => r.json())
        .then((data) => {
          setAppointments(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#2e8b57" />
              <path d="M12 26 Q14 14 22 12 Q16 18 18 26 Z" fill="#fff" opacity="0.9" />
              <path d="M24 10 L26 8 L25 11 Z" fill="#90ee90" />
            </svg>
            <span className="text-lg font-bold text-gray-800">First Friends App</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">アポイントメント一覧</h1>
          <button
            onClick={() => router.push("/appointment/new")}
            className="bg-brand-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-brand-600 transition"
          >
            ＋ 新規作成
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">アポイントメントがありません</p>
            <button
              onClick={() => router.push("/appointment/new")}
              className="bg-brand-500 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-brand-600 transition"
            >
              新規アポイントメントを作成
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => {
              const st = STATUS_LABELS[apt.status] || STATUS_LABELS.DRAFT;
              const firstSlot = apt.timeSlots[0];
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-brand-300 transition cursor-pointer"
                  onClick={() => {
                    if (apt.status === "PENDING") {
                      router.push(`/host-confirm/${apt.id}`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-sm">
                          {apt.title || "無題のアポイントメント"}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        来訪者: {apt.visitors.map((v) => `${v.name}（${v.company || "未設定"}）`).join(", ")}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {firstSlot && (
                        <div>
                          {new Date(firstSlot.date).toLocaleDateString("ja-JP")} {ft(firstSlot.startMin)}〜
                        </div>
                      )}
                      <div>候補: {apt.timeSlots.length}件</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
