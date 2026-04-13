"use client";

import { useState, useEffect, useRef } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BlastEvent {
  type: "sent" | "failed" | "skipped" | "complete" | "stopped";
  phone?: string;
  message?: string;
  error?: string;
  reason?: string;
  index?: number;
  timestamp: string;
}

export default function LiveFeedPage() {
  const [events, setEvents] = useState<BlastEvent[]>([]);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/blast-status`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSent(data.sent);
      setFailed(data.failed);
      setTotal(data.total);
      setRunning(data.running);
      if (data.events?.length > 0) {
        setEvents((prev) => [...prev, ...data.events]);
      }
      // Close connection when blast is done to prevent reconnect loop
      if (!data.running && data.total > 0) {
        es.close();
        setConnected(false);
      }
    };
    es.onerror = () => {
      es.close();
      setConnected(false);
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  async function handleStop() {
    try {
      await apiFetch("/blast-stop", { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  }

  const progress = total > 0 ? ((sent + failed) / total) * 100 : 0;
  const remaining = total - sent - failed;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Live Feed</h1>
          <p className="text-[13px] text-[#888] mt-1">Watch your blast in real time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : connected ? "bg-yellow-500" : "bg-[#555]"}`} />
            <span className="text-[12px] text-[#888]">
              {running ? "Sending..." : connected ? "Idle" : "Disconnected"}
            </span>
          </div>
          {running && (
            <Button
              onClick={handleStop}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 text-[12px] h-8 px-3"
            >
              Stop Blast
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: total, color: "text-white" },
          { label: "Sent", value: sent, color: "text-green-400" },
          { label: "Failed", value: failed, color: "text-red-400" },
          { label: "Remaining", value: remaining, color: "text-[#888]" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-[#111] border-[#1e1e1e] p-4">
            <p className="text-[11px] text-[#888] uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-[28px] font-semibold tracking-tight ${stat.color}`}>
              {stat.value.toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      {total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#888]">Progress</span>
            <span className="text-[12px] text-[#888]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden progress-glow">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Card className="bg-[#111] border-[#1e1e1e] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-white">Activity</h2>
          <span className="text-[11px] text-[#555]">{events.length} events</span>
        </div>
        <div ref={feedRef} className="max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="2"/>
                  <path d="M5 5a4.24 4.24 0 000 6M11 5a4.24 4.24 0 010 6"/>
                </svg>
              </div>
              <p className="text-[13px] text-[#555]">Waiting for blast events...</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1e1e1e]">
              {events.map((event, i) => (
                <div key={i} className="feed-item px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  {event.type === "sent" ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    </div>
                  ) : event.type === "failed" || event.type === "skipped" ? (
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 3l6 6M9 3l-6 6"/>
                      </svg>
                    </div>
                  ) : event.type === "complete" ? (
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 2v4M6 8v1"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/80 truncate">
                      {event.type === "sent" && (
                        <>
                          <span className="text-green-400">Sent</span>
                          <span className="text-[#555] mx-2">&rarr;</span>
                          <span className="text-[#888] font-mono text-[12px]">{event.phone}</span>
                        </>
                      )}
                      {event.type === "failed" && (
                        <>
                          <span className="text-red-400">Failed</span>
                          <span className="text-[#555] mx-2">&rarr;</span>
                          <span className="text-[#888] font-mono text-[12px]">{event.phone}</span>
                          {event.error && <span className="text-[#555] ml-2 text-[11px]">{event.error}</span>}
                        </>
                      )}
                      {event.type === "skipped" && (
                        <>
                          <span className="text-red-400">Skipped</span>
                          <span className="text-[#555] mx-2">&rarr;</span>
                          <span className="text-[#888] font-mono text-[12px]">{event.phone}</span>
                          <span className="text-[#555] ml-2 text-[11px]">(opted out)</span>
                        </>
                      )}
                      {event.type === "complete" && <span className="text-blue-400">Blast complete</span>}
                      {event.type === "stopped" && <span className="text-yellow-400">Blast stopped by user</span>}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#444] shrink-0 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
