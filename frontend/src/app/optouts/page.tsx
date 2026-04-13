"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OptOut {
  id: number;
  phone: string;
  reason: string;
  created_at: string;
}

export default function OptOutsPage() {
  const [optouts, setOptouts] = useState<OptOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptouts();
  }, []);

  async function loadOptouts() {
    try {
      const data = await apiFetch("/optouts");
      setOptouts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Opt-Outs</h1>
          <p className="text-[13px] text-[#888] mt-1">
            Contacts who have unsubscribed. Permanently excluded from all future blasts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[11px]">
            {optouts.length} blocked
          </Badge>
          <Button
            onClick={loadOptouts}
            variant="secondary"
            className="bg-[#1a1a1a] text-[#888] hover:text-white border border-[#1e1e1e] text-[12px] h-8 px-3"
          >
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#555] text-[13px]">Loading...</div>
      ) : optouts.length === 0 ? (
        <Card className="bg-[#111] border-[#1e1e1e] p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#555]">No opt-outs yet.</p>
        </Card>
      ) : (
        <Card className="bg-[#111] border-[#1e1e1e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Phone</th>
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Keyword</th>
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {optouts.map((optout) => (
                  <tr key={optout.id} className="border-b border-[#1e1e1e] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-white font-mono">{optout.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase">
                        {optout.reason}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#888]">{formatDate(optout.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
