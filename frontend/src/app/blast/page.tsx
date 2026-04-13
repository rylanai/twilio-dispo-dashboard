"use client";

import { useState, useEffect, useRef } from "react";
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

export default function BlastPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [launching, setLaunching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/templates").then(setTemplates).catch(console.error);
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setCsvColumns(headers);

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
          row[h] = values[j] || "";
        });
        rows.push(row);
      }
      setCsvData(rows);

      if (selectedTemplate) {
        const fields = extractFields(selectedTemplate.body);
        const autoMap: Record<string, string> = {};
        fields.forEach((f) => {
          const match = headers.find(
            (h) => h.toLowerCase() === f.toLowerCase()
          );
          if (match) autoMap[f] = match;
        });
        setFieldMapping(autoMap);
      }
    };
    reader.readAsText(file);
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
    if (!selectedTemplate || csvData.length === 0) return;
    setLaunching(true);
    try {
      await apiFetch("/blast", {
        method: "POST",
        body: JSON.stringify({
          contacts: csvData,
          template_body: selectedTemplate.body,
          field_mapping: {
            ...fieldMapping,
            _phone_column: fieldMapping["Phone"] || csvColumns.find(c =>
              c.toLowerCase().includes("phone") || c.toLowerCase().includes("mobile") || c.toLowerCase().includes("number")
            ) || csvColumns[0],
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
  const allMapped = fields.length > 0 && fields.every((f) => fieldMapping[f]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Blast</h1>
        <p className="text-[13px] text-[#888] mt-1">Send personalized SMS messages at scale.</p>
      </div>

      <div className="flex items-center gap-4 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                step >= s ? "bg-white text-black" : "bg-[#1a1a1a] text-[#555]"
              }`}
            >
              {s}
            </div>
            <span className={`text-[13px] font-medium ${step >= s ? "text-white" : "text-[#555]"}`}>
              {s === 1 ? "Select Template" : "Upload & Map"}
            </span>
            {s === 1 && <div className="w-12 h-px bg-[#1e1e1e] mx-2" />}
          </div>
        ))}
      </div>

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

      {step === 2 && selectedTemplate && (
        <div className="space-y-6">
          <Card className="bg-[#111] border-[#1e1e1e] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-semibold text-white">Upload CSV</h2>
                <p className="text-[12px] text-[#888] mt-1">Upload a CSV with your contacts. Map columns to template fields.</p>
              </div>
              <button onClick={() => setStep(1)} className="text-[12px] text-[#888] hover:text-white transition-colors">
                &larr; Back
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[#1e1e1e] rounded-lg p-8 text-center hover:border-[#333] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#222] transition-colors">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M8 12V3M4 7l4-4 4 4"/>
                </svg>
              </div>
              <p className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">
                {csvData.length > 0 ? `${csvData.length} contacts loaded` : "Click to upload CSV"}
              </p>
            </button>
          </Card>

          {csvColumns.length > 0 && (
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
                        {csvColumns.map((col) => (
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
          )}

          {allMapped && csvData.length > 0 && (
            <Card className="bg-[#111] border-[#1e1e1e] p-6">
              <h2 className="text-[14px] font-semibold text-white mb-4">Preview</h2>
              <div className="space-y-3">
                {csvData.slice(0, 3).map((row, i) => (
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
                <p className="text-[12px] text-[#888]">{csvData.length} messages will be sent</p>
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
