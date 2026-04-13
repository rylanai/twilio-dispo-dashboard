"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ListItem {
  id: number;
  name: string;
  columns: string;
  row_count: number;
  created_at: string;
  updated_at: string;
}

export default function ListsPage() {
  const [lists, setLists] = useState<ListItem[]>([]);
  const [name, setName] = useState("");
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists() {
    try {
      const data = await apiFetch("/lists");
      setLists(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!name) setName(file.name.replace(/\.csv$/i, ""));

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
    };
    reader.readAsText(file);
  }

  async function handleSave() {
    if (!name.trim() || csvData.length === 0) return;
    try {
      await apiFetch("/lists", {
        method: "POST",
        body: JSON.stringify({ name, columns: csvColumns, data: csvData }),
      });
      setName("");
      setCsvData([]);
      setCsvColumns([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadLists();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/lists/${id}`, { method: "DELETE" });
      loadLists();
    } catch (e) {
      console.error(e);
    }
  }

  function parseColumns(cols: string): string[] {
    try {
      return JSON.parse(cols);
    } catch {
      return [];
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Lists</h1>
        <p className="text-[13px] text-[#888] mt-1">Upload and manage your contact lists.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <Card className="bg-[#111] border-[#1e1e1e] p-6">
            <h2 className="text-[14px] font-semibold text-white mb-4">Upload New List</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                  List Name
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Phoenix Homeowners"
                  className="bg-[#0a0a0a] border-[#1e1e1e] text-white text-[13px] placeholder:text-[#444] h-10"
                />
              </div>

              <div>
                <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                  CSV File
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#1e1e1e] rounded-lg p-6 text-center hover:border-[#333] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#222] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M8 12V3M4 7l4-4 4 4"/>
                    </svg>
                  </div>
                  <p className="text-[13px] text-[#666] group-hover:text-[#888] transition-colors">
                    {fileName ? fileName : "Click to upload CSV"}
                  </p>
                </button>
              </div>

              {csvColumns.length > 0 && (
                <div>
                  <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                    Columns Detected
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {csvColumns.map((col) => (
                      <Badge
                        key={col}
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium"
                      >
                        {col}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#555] mt-2">{csvData.length} rows</p>
                </div>
              )}

              {csvData.length > 0 && (
                <div>
                  <Label className="text-[12px] text-[#888] uppercase tracking-wider mb-2 block">
                    Preview
                  </Label>
                  <div className="bg-[#0a0a0a] rounded-lg border border-[#1e1e1e] overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1e1e1e]">
                          {csvColumns.map((col) => (
                            <th key={col} className="text-left px-3 py-2 text-[10px] text-[#888] uppercase tracking-wider font-medium whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-[#1e1e1e] last:border-0">
                            {csvColumns.map((col) => (
                              <td key={col} className="px-3 py-2 text-[12px] text-white/70 whitespace-nowrap">
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 3 && (
                      <p className="px-3 py-2 text-[11px] text-[#555]">+ {csvData.length - 3} more rows</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || csvData.length === 0}
                  className="bg-white text-black hover:bg-white/90 text-[13px] font-medium h-9 px-4"
                >
                  Save List
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-[#555] text-[13px]">Loading...</div>
            ) : lists.length === 0 ? (
              <Card className="bg-[#111] border-[#1e1e1e] p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 4h12M2 8h12M2 12h12"/>
                  </svg>
                </div>
                <p className="text-[13px] text-[#555]">No lists yet. Upload your first one.</p>
              </Card>
            ) : (
              lists.map((lst) => {
                const cols = parseColumns(lst.columns);
                return (
                  <Card
                    key={lst.id}
                    className="bg-[#111] border-[#1e1e1e] p-4 hover:border-[#2a2a2a] transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-[14px] font-medium text-white truncate">{lst.name}</h3>
                          <Badge className="bg-[#1a1a1a] text-[#888] border-0 text-[10px]">
                            {lst.row_count} contacts
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {cols.map((col) => (
                            <Badge
                              key={col}
                              variant="secondary"
                              className="bg-[#1a1a1a] text-[#666] border-0 text-[10px]"
                            >
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        <button
                          onClick={() => handleDelete(lst.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-[#666] hover:text-red-400 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
