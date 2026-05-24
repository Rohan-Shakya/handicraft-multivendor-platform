import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { FormField } from "@/components/FormField";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MailIcon, SendIcon, UsersIcon } from "lucide-react";

interface CampaignRow {
  id: string;
  subject: string;
  recipientCount: number;
  segmentId: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface Segment {
  id: string;
  name: string;
}

export function NewsletterCampaignsPage() {
  const navigate = useNavigate();
  void navigate;

  // List
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [segmentId, setSegmentId] = useState<string>("all");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [estCount, setEstCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const [campaignsRes, segmentsRes] = await Promise.all([
          apiFetch<{ data: CampaignRow[] }>(
            "/admin/newsletter/campaigns?limit=20",
            { signal: ctrl.signal }
          ),
          apiFetch<{ data: Segment[] } | Segment[]>(
            "/admin/customer-segments?limit=100",
            { signal: ctrl.signal }
          ).catch(() => ({ data: [] })),
        ]);
        setCampaigns(campaignsRes.data ?? []);
        const segs = Array.isArray(segmentsRes)
          ? segmentsRes
          : segmentsRes.data ?? [];
        setSegments(segs);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({
            title: "Failed to load campaigns",
            description: e.message,
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // Refresh recipient estimate whenever segment changes.
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (segmentId !== "all") params.set("segmentId", segmentId);
        const res = await apiFetch<{ count: number }>(
          `/admin/newsletter/recipient-count?${params}`
        );
        if (!aborted) setEstCount(res.count);
      } catch {
        if (!aborted) setEstCount(null);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [segmentId]);

  async function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast({
        title: "Subject and body are required",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        id: string;
        recipientCount: number;
        delivered: number;
      }>("/admin/newsletter/campaigns", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          bodyHtml: bodyHtml,
          bodyText: bodyText.trim() || undefined,
          segmentId: segmentId === "all" ? undefined : segmentId,
        }),
      });
      toast({
        title: "Campaign sent",
        description: `${res.delivered} of ${res.recipientCount} emails delivered.`,
      });
      setSubject("");
      setBodyHtml("");
      setBodyText("");
      setConfirmOpen(false);
      // Refresh the list
      const refreshed = await apiFetch<{ data: CampaignRow[] }>(
        "/admin/newsletter/campaigns?limit=20"
      );
      setCampaigns(refreshed.data ?? []);
    } catch (e: any) {
      toast({
        title: "Send failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter campaigns"
        description="Send a one-off email blast to subscribers or a customer segment."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <SendIcon className="size-4 text-muted-foreground" /> Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Subject" htmlFor="subject" required>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="11.11 Sale starts today — up to 50% off"
                  maxLength={200}
                />
              </FormField>
              <FormField label="HTML body" htmlFor="bodyHtml" required>
                <Textarea
                  id="bodyHtml"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={10}
                  placeholder="<h1>Hello!</h1><p>Our biggest sale is here…</p>"
                  className="font-mono text-xs"
                />
              </FormField>
              <FormField
                label="Plain-text fallback"
                htmlFor="bodyText"
                hint="Optional — we auto-strip HTML when not provided."
              >
                <Textarea
                  id="bodyText"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={3}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label="Send to" htmlFor="segment">
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger id="segment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All newsletter subscribers
                    </SelectItem>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Segment: {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
                <span>
                  Will send to{" "}
                  <strong>
                    {estCount === null ? "—" : estCount.toLocaleString()}
                  </strong>{" "}
                  recipient{estCount === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={() => setConfirmOpen(true)}
                disabled={
                  submitting ||
                  !subject.trim() ||
                  !bodyHtml.trim() ||
                  estCount === 0
                }
              >
                <SendIcon className="size-4 mr-1" />
                {submitting ? "Sending…" : "Send campaign"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sent log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MailIcon className="size-4 text-muted-foreground" /> Sent campaigns
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="space-y-2 px-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No campaigns sent yet. Compose one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold text-right">
                    Recipients
                  </TableHead>
                  <TableHead className="font-semibold">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.subject}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.recipientCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sentAt
                        ? new Date(c.sentAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send to ${estCount?.toLocaleString() ?? "—"} recipient${estCount === 1 ? "" : "s"}?`}
        description="This will email everyone in the target list immediately. You can't undo a send — review your subject and body carefully before confirming."
        confirmLabel="Send now"
        loading={submitting}
        onConfirm={handleSend}
      />
    </div>
  );
}
