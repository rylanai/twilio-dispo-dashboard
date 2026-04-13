"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Reply {
  id: number;
  from_number: string;
  body: string;
  contacted: number;
  received_at: string;
}

export default function RepliesPage() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReplies();
  }, []);

  async function loadReplies() {
    try {
      const data = await apiFetch("/replies");
      setReplies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function markContacted(id: number) {
    try {
      await apiFetch(`/replies/${id}/contacted`, { method: "PUT" });
      loadReplies();
    } catch (e) {
      console.error(e);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Replies</h1>
          <p className="text-[13px] text-[#888] mt-1">Inbound messages from your contacts.</p>
        </div>
        <Button
          onClick={loadReplies}
          variant="secondary"
          className="bg-[#1a1a1a] text-[#888] hover:text-white border border-[#1e1e1e] text-[12px] h-8 px-3"
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#555] text-[13px]">Loading...</div>
      ) : replies.length === 0 ? (
        <Card className="bg-[#111] border-[#1e1e1e] p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M3 9h3l1 2h2l1-2h3"/>
              <path d="M3.5 4L2 9v4a1 1 0 001 1h10a1 1 0 001-1V9l-1.5-5a1 1 0 00-1-.96H4.5a1 1 0 00-1 .96z"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#555]">No replies yet.</p>
        </Card>
      ) : (
        <Card className="bg-[#111] border-[#1e1e1e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">From</th>
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Message</th>
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] text-[#888] uppercase tracking-wider font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {replies.map((reply) => (
                  <tr key={reply.id} className="border-b border-[#1e1e1e] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-white font-mono">{reply.from_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-white/80">{reply.body}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-[#888]">{formatDate(reply.received_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {reply.contacted ? (
                        <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">Contacted</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">New</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!reply.contacted && (
                        <Button
                          onClick={() => markContacted(reply.id)}
                          className="bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[11px] h-7 px-3 border border-[#1e1e1e]"
                        >
                          Mark Contacted
                        </Button>
                      )}
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
