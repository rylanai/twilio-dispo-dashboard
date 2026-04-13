"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: number;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const data = await apiFetch("/templates");
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !body.trim()) return;
    try {
      if (editingId) {
        await apiFetch(`/templates/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, body }),
        });
      } else {
        await apiFetch("/templates", {
          method: "POST",
          body: JSON.stringify({ name, body }),
        });
      }
      setName("");
      setBody("");
      setEditingId(null);
      loadTemplates();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/templates/${id}`, { method: "DELETE" });
      loadTemplates();
    } catch (e) {
      console.error(e);
    }
  }

  function handleEdit(t: Template) {
    setEditingId(t.id);
    setName(t.name);
    setBody(t.body);
  }

  function extractFields(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  }

  function renderPreview(text: string): string {
    return text.replace(
      /\{\{(\w+)\}\}/g,
      '<span style="color:#60a5fa;font-weight:500">[$1]</span>'
    );
  }

  const fields = extractFields(body);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Templates</h1>
        <p className="text-[13px] text-[#888] mt-1">Create and manage your SMS message templates.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <Card className="bg-[#111] border-[#1e1e1e] p-6">
            <h2 className="text-[14px] font-semibold text-white mb-4">
              {editingId ? "Edit Template" : "New Template"}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                  Template Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Property Offer"
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] placeholder:text-[#444] h-10"
                />
              </div>
              <div>
                <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                  Message Body
                </Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"Hi {{FirstName}}, we'd like to make an offer on your property at {{Address}}, {{City}}."}
                  rows={5}
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] placeholder:text-[#444] resize-none"
                />
              </div>

              {fields.length > 0 && (
                <div>
                  <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                    Custom Fields
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {fields.map((f) => (
                      <Badge
                        key={f}
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium"
                      >
                        {`{{${f}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || !body.trim()}
                  className="bg-white text-black hover:bg-white/90 text-[13px] font-medium h-9 px-4"
                >
                  {editingId ? "Update Template" : "Save Template"}
                </Button>
                {editingId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingId(null);
                      setName("");
                      setBody("");
                    }}
                    className="bg-[#1a1a1a] text-[#888] hover:text-white text-[13px] h-9"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {body && (
            <Card className="bg-[#111] border-[#1e1e1e] p-6 mt-4">
              <h3 className="text-[12px] text-[#888] uppercase tracking-wider mb-3">Live Preview</h3>
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="1.5">
                      <path d="M2 4l6 4 6-4M2 12l6-4 6 4"/>
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-[13px] text-white/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderPreview(body) }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-[#555] text-[13px]">Loading...</div>
            ) : templates.length === 0 ? (
              <Card className="bg-[#111] border-[#1e1e1e] p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
                    <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z"/>
                  </svg>
                </div>
                <p className="text-[13px] text-[#555]">No templates yet. Create your first one.</p>
              </Card>
            ) : (
              templates.map((t) => (
                <Card
                  key={t.id}
                  className="bg-[#111] border-[#1e1e1e] p-4 hover:border-[#2a2a2a] transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium text-white truncate">{t.name}</h3>
                      <p className="text-[12px] text-[#666] mt-1 line-clamp-2">{t.body}</p>
                      <div className="flex items-center gap-3 mt-3">
                        {extractFields(t.body).map((f) => (
                          <Badge
                            key={f}
                            variant="secondary"
                            className="bg-[#1a1a1a] text-[#666] border-0 text-[10px]"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 rounded-md hover:bg-white/5 text-[#666] hover:text-white transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M11 2l3 3L5 14H2v-3L11 2z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-[#666] hover:text-red-400 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
