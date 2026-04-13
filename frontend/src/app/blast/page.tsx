"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Template {
  id: number;
  name: string;
  body: string;
}

interface ListSummary {
  id: number;
  name: string;
  columns: string;
  row_count: number;
}

interface ListFull {
  id: number;
  name: string;
  columns: string[];
  data: Record<string, string>[];
}

export default function BlastPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedList, setSelectedList] = useState<ListFull | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    apiFetch("/templates").then(setTemplates).catch(console.error);
    apiFetch("/lists").then(setLists).catch(console.error);
  }, []);

  function extractFields(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  }

  function handleTemplateSelect(id: string | null) {
    if (!id) return;
    const t = templates.find((t) => t.id === parseInt(id));
    if (t) setSelectedTemplate(t);
  }

  async function handleListSelect(id: string | null) {
    if (!id) return;
    try {
      const fullList = await apiFetch(`/lists/${id}`);
      setSelectedList(fullList);

      // Auto-map matching fields
      if (selectedTemplate) {
        const fields = extractFields(selectedTemplate.body);
        const autoMap: Record<string, string> = {};
        fields.forEach((f) => {
          const match = fullList.columns.find(
            (h: string) => h.toLowerCase() === f.toLowerCase()
          );
          if (match) autoMap[f] = match;
        });
        setFieldMapping(autoMap);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function renderPreview(template: string, row: Record<string, string>): string {
    let result = template;
    for (const [field, col] of Object.entries(fieldMapping)) {
      result = result.replace(
        new RegExp(`\\{\\{${field}\\}\\}`, "g"),
        row[col] || `[${field}]`
      );
    }
    return result;
  }

  async function handleLaunch() {
    if (!selectedTemplate || !selectedList || selectedList.data.length === 0) return;
    setLaunching(true);
    try {
      await apiFetch("/blast", {
        method: "POST",
        body: JSON.stringify({
          contacts: selectedList.data,
          template_body: selectedTemplate.body,
          field_mapping: {
            ...fieldMapping,
            _phone_column: fieldMapping["Phone"] || selectedList.columns.find(c =>
              c.toLowerCase().includes("phone") || c.toLowerCase().includes("mobile") || c.toLowerCase().includes("number")
            ) || selectedList.columns[0],
          },
        }),
      });
      router.push("/live");
    } catch (e) {
      console.error(e);
      setLaunching(false);
    }
  }

  const fields = selectedTemplate ? extractFields(selectedTemplate.body) : [];
  const columns = selectedList?.columns || [];
  const allMapped = fields.length > 0 && fields.every((f) => fieldMapping[f]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Blast</h1>
        <p className="text-[13px] text-[#888] mt-1">Send personalized SMS messages at scale.</p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                step >= s ? "bg-white text-black" : "bg-[#1a1a1a] text-[#555]"
              }`}
            >
              {s}
            </div>
            <span className={`text-[13px] font-medium ${step >= s ? "text-white" : "text-[#555]"}`}>
              {s === 1 ? "Template" : s === 2 ? "List" : "Map & Launch"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-[#1e1e1e] mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Template */}
      {step === 1 && (
        <Card className="bg-[#111] border-[#1e1e1e] p-6 max-w-xl">
          <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-3 block">
            Choose a template
          </Label>
          {templates.length === 0 ? (
            <p className="text-[13px] text-[#555]">No templates found. Create one first.</p>
          ) : (
            <>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] h-10">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#1e1e1e]">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()} className="text-white text-[13px]">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="mt-4 bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
                  <p className="text-[13px] text-white/80 leading-relaxed">{selectedTemplate.body}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {fields.map((f) => (
                      <Badge key={f} variant="secondary" className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px]">
                        {`{{${f}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!selectedTemplate}
                className="mt-4 bg-white text-black hover:bg-white/90 text-[13px] font-medium h-9 px-4"
              >
                Continue
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 2: Select List */}
      {step === 2 && selectedTemplate && (
        <Card className="bg-[#111] border-[#1e1e1e] p-6 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-[12px] text-[#888] uppercase tracking-wider block">
              Choose a list
            </Label>
            <button onClick={() => setStep(1)} className="text-[12px] text-[#888] hover:text-white transition-colors">
              &larr; Back
            </button>
          </div>
          {lists.length === 0 ? (
            <p className="text-[13px] text-[#555]">No lists found. Upload one first.</p>
          ) : (
            <>
              <Select onValueChange={handleListSelect}>
                <SelectTrigger className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] h-10">
                  <SelectValue placeholder="Select a list..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-[#1e1e1e]">
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()} className="text-white text-[13px]">
                      {l.name} ({l.row_count} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedList && (
                <div className="mt-4 bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[13px] text-white font-medium">{selectedList.name}</p>
                    <Badge className="bg-[#1a1a1a] text-[#888] border-0 text-[10px]">
                      {selectedList.data.length} contacts
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedList.columns.map((col) => (
                      <Badge key={col} variant="secondary" className="bg-[#1a1a1a] text-[#666] border-0 text-[10px]">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(3)}
                disabled={!selectedList}
                className="mt-4 bg-white text-black hover:bg-white/90 text-[13px] font-medium h-9 px-4"
              >
                Continue
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 3: Map & Launch */}
      {step === 3 && selectedTemplate && selectedList && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-[#1a1a1a] text-white border-0 text-[11px]">{selectedTemplate.name}</Badge>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
                <path d="M3 8h10M10 5l3 3-3 3"/>
              </svg>
              <Badge className="bg-[#1a1a1a] text-white border-0 text-[11px]">{selectedList.name}</Badge>
            </div>
            <button onClick={() => setStep(2)} className="text-[12px] text-[#888] hover:text-white transition-colors">
              &larr; Back
            </button>
          </div>

          <Card className="bg-[#111] border-[#1e1e1e] p-6">
            <h2 className="text-[14px] font-semibold text-white mb-4">Map Fields</h2>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] min-w-[120px] justify-center">
                    {`{{${field}}}`}
                  </Badge>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5">
                    <path d="M3 8h10M10 5l3 3-3 3"/>
                  </svg>
                  <Select
                    value={fieldMapping[field] || ""}
                    onValueChange={(val) => { if (val) setFieldMapping((prev) => ({ ...prev, [field]: val })); }}
                  >
                    <SelectTrigger className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] h-9 flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-[#1e1e1e]">
                      {columns.map((col) => (
                        <SelectItem key={col} value={col} className="text-white text-[13px]">
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          {allMapped && (
            <Card className="bg-[#111] border-[#1e1e1e] p-6">
              <h2 className="text-[14px] font-semibold text-white mb-4">Preview</h2>
              <div className="space-y-3">
                {selectedList.data.slice(0, 3).map((row, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1e1e1e]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-[10px] text-green-400 font-bold">{i + 1}</span>
                      </div>
                      <span className="text-[11px] text-[#555]">
                        {row[fieldMapping["Phone"] || Object.keys(row)[0]]}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/80 leading-relaxed pl-7">
                      {renderPreview(selectedTemplate.body, row)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <p className="text-[12px] text-[#888]">{selectedList.data.length} messages will be sent</p>
                <Button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="bg-green-600 hover:bg-green-500 text-white text-[13px] font-medium h-10 px-6"
                >
                  {launching ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Launching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 14s-3-2-4.5-5.5S3 2 8 1c5 1 5 4 3.5 7.5S8 14 8 14z"/>
                      </svg>
                      Launch Blast
                    </span>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
