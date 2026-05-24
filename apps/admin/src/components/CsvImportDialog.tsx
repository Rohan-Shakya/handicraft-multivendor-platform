import * as React from "react";
import { FileUp, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { trackEvent } from "@/lib/observability";
import { cn } from "@/lib/utils";

export interface CsvImportColumn {
  key: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface Props<TPayload extends Record<string, unknown>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human label for the entity being imported, e.g. "products". */
  entityLabel: string;
  /** Backend endpoint that accepts `{ rows: TPayload[] }`. */
  endpoint: string;
  /** Declared column contract so we can preview + validate before POST. */
  columns: CsvImportColumn[];
  /** Transform a parsed row into the backend payload. */
  mapRow?: (raw: Record<string, string>) => TPayload;
  /** URL of an example CSV that matches the expected schema. */
  sampleHref?: string;
  /** Query keys to invalidate on success. */
  invalidateKeys?: string[];
  onSuccess?: (summary: { imported: number; skipped: number }) => void;
}

/**
 * Drag-and-drop CSV importer. Stages:
 *   1. `select`  — user picks / drops a file
 *   2. `preview` — we parse locally, show first rows, list missing required cols
 *   3. `submit`  — POST rows to the backend; show counts
 *   4. `done`    — success screen, invalidate caches, close
 */
export function CsvImportDialog<TPayload extends Record<string, unknown>>({
  open,
  onOpenChange,
  entityLabel,
  endpoint,
  columns,
  mapRow,
  sampleHref,
  onSuccess,
}: Props<TPayload>) {
  type Stage = "select" | "preview" | "submit" | "done";
  const [stage, setStage] = React.useState<Stage>("select");
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<{ imported: number; skipped: number } | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStage("select");
      setRows([]);
      setHeaders([]);
      setError(null);
      setSummary(null);
    }
  }, [open]);

  const missingRequired = React.useMemo(() => {
    return columns
      .filter((c) => c.required)
      .filter((c) => !headers.includes(c.key))
      .map((c) => c.label);
  }, [columns, headers]);

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        setError("CSV has no data rows");
        return;
      }
      setHeaders(parsed.header);
      setRows(parsed.rows);
      setStage("preview");
    } catch (err) {
      setError((err as Error).message ?? "Couldn't parse this CSV");
    }
  }

  async function submit() {
    setStage("submit");
    try {
      const payload = rows.map((r) => (mapRow ? mapRow(r) : (r as unknown as TPayload)));
      const res = await apiFetch<{ imported: number; skipped: number }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ rows: payload }),
      });
      setSummary(res);
      setStage("done");
      trackEvent("import", { entity: entityLabel, count: res.imported });
      onSuccess?.(res);
    } catch (err) {
      setError((err as Error).message ?? "Import failed");
      setStage("preview");
      toast({
        title: "Import failed",
        description: (err as Error).message ?? "Please check the file and retry.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entityLabel}</DialogTitle>
        </DialogHeader>

        {stage === "select" && (
          <div className="flex flex-col gap-4">
            <FileDrop onFile={handleFile} />
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-semibold">Expected columns</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {columns.map((c) => (
                  <li key={c.key} className="flex items-center gap-1.5">
                    <span
                      className={c.required ? "font-semibold text-foreground" : "text-muted-foreground"}
                    >
                      {c.key}
                    </span>
                    {c.required && (
                      <span className="text-[10px] font-bold uppercase text-destructive">
                        Required
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {sampleHref && (
                <a
                  href={sampleHref}
                  className="mt-2 inline-block text-primary hover:underline"
                  download
                >
                  Download sample CSV →
                </a>
              )}
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4" aria-hidden /> {error}
              </p>
            )}
          </div>
        )}

        {stage === "preview" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Parsed <strong>{rows.length}</strong> row{rows.length === 1 ? "" : "s"} with {headers.length}{" "}
              column{headers.length === 1 ? "" : "s"}.
            </p>
            {missingRequired.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Missing required columns: {missingRequired.join(", ")}
              </div>
            )}
            <div className="max-h-60 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      {headers.map((h) => (
                        <td key={h} className="truncate px-2 py-1.5">
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && (
              <p className="text-[11px] text-muted-foreground">
                Showing first 10 rows. All {rows.length} will be imported.
              </p>
            )}
          </div>
        )}

        {stage === "submit" && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm">Importing {rows.length} records…</p>
          </div>
        )}

        {stage === "done" && summary && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="size-7 text-emerald-500" aria-hidden />
            </div>
            <p className="text-base font-semibold">Import complete</p>
            <p className="text-sm text-muted-foreground">
              Imported <strong>{summary.imported}</strong> record
              {summary.imported === 1 ? "" : "s"}
              {summary.skipped > 0 && `, skipped ${summary.skipped} due to validation errors.`}
            </p>
          </div>
        )}

        <DialogFooter>
          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStage("select")}>
                Back
              </Button>
              <Button onClick={submit} disabled={missingRequired.length > 0}>
                <Upload className="size-4" aria-hidden /> Import {rows.length} rows
              </Button>
            </>
          )}
          {stage === "done" && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileDrop({ onFile }: { onFile: (file: File) => void }) {
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <label
      htmlFor="csv-upload"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "hover:bg-muted/40"
      )}
    >
      <FileUp className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">Drop a CSV file, or click to browse</p>
      <p className="text-xs text-muted-foreground">UTF-8, comma-separated, header row required</p>
      <input
        id="csv-upload"
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

interface ParsedCsv {
  header: string[];
  rows: Record<string, string>[];
}

/**
 * Minimal CSV parser — handles quoted fields (with embedded commas + escaped
 * double-quotes) and Windows / Unix line endings. Not a replacement for
 * papa-parse; good enough for admin imports under a few thousand rows.
 */
function parseCsv(text: string): ParsedCsv {
  const cleaned = text.replace(/^\ufeff/, ""); // strip BOM
  const lines = cleaned.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { header: [], rows: [] };

  function parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  const header = parseLine(lines[0]!).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
  return { header, rows };
}
