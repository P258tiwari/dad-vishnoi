"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ChevronRight, ExternalLink, FileText, MapPin, Paperclip, Phone, Search, UserRound, X } from "lucide-react";
import { enquiryStatuses, type DashboardEnquiry, type EnquiryStatus, type EnquiryFile } from "@/lib/enquiry";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const statusClasses: Record<EnquiryStatus, string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Contacted: "border-blue-200 bg-blue-50 text-blue-700",
  Scheduled: "border-violet-200 bg-violet-50 text-violet-700",
  Served: "border-slate-200 bg-slate-100 text-slate-700",
  Closed: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function EnquiryDashboard({ initialEnquiries, loadError }: { initialEnquiries: DashboardEnquiry[]; loadError?: string }) {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | EnquiryStatus>("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [detailTab, setDetailTab] = useState<"details" | "concern" | "files">("details");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const detailDialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailDialogRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (event.key !== "Tab" || !detailDialogRef.current) return;
      const focusables = Array.from(detailDialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), audio[controls], [role="tabpanel"]',
      ));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      const matchesStatus = filter === "All" || enquiry.status === filter;
      const matchesQuery = !needle || [enquiry.leadId, enquiry.name, enquiry.phone, enquiry.whatsapp, enquiry.address, enquiry.city, enquiry.state, enquiry.pincode, enquiry.concern, enquiry.summaryEnglish, enquiry.summaryHindi]
        .some((value) => value.toLowerCase().includes(needle));
      return matchesStatus && matchesQuery && (stateFilter === "All" || enquiry.state === stateFilter);
    });
  }, [enquiries, filter, query, stateFilter]);

  const availableStates = [...new Set(enquiries.map((enquiry) => enquiry.state).filter(Boolean))].sort();

  const selected = enquiries.find((enquiry) => enquiry.pageId === selectedId) || null;
  const activeCount = enquiries.filter((enquiry) => enquiry.status === "Active").length;
  const scheduledCount = enquiries.filter((enquiry) => enquiry.status === "Scheduled").length;
  const servedCount = enquiries.filter((enquiry) => enquiry.status === "Served").length;
  const summaryCards = [
    { label: "All enquiries", target: "All" as const, caption: "Your complete inbox", value: enquiries.length, icon: UserRound, tone: "text-[#7164b1] bg-[#f0eef9]" },
    { label: "Active", target: "Active" as const, caption: "Ready for a follow-up", value: activeCount, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Scheduled", target: "Scheduled" as const, caption: "Next steps arranged", value: scheduledCount, icon: CalendarClock, tone: "text-violet-700 bg-violet-50" },
    { label: "Served", target: "Served" as const, caption: "Care coordinated", value: servedCount, icon: CheckCircle2, tone: "text-slate-700 bg-slate-100" },
  ];

  async function updateStatus(pageId: string, status: EnquiryStatus) {
    if (updatingId) return;
    setUpdatingId(pageId);
    setActionError("");
    try {
      const response = await fetchWithTimeout(`/api/admin/enquiries/${pageId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }, 20_000);
      const result = await response.json() as { ok?: boolean; message?: string };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !result.ok) throw new Error(result.message || "Status could not be updated.");
      setEnquiries((current) => current.map((enquiry) => enquiry.pageId === pageId ? { ...enquiry, status } : enquiry));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Status could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <section className="dashboard-metrics" aria-label="Enquiry summary">
        {summaryCards.map(({ label, target, caption, value, icon: Icon, tone }) => (
          <button key={label} type="button" className={`dashboard-metric ${filter === target ? 'is-selected' : ''}`} aria-pressed={filter === target} onClick={() => setFilter(target)}>
            <div className="dashboard-metric-top"><span className={`dashboard-metric-icon ${tone}`}><Icon size={19} /></span><ChevronRight size={16} aria-hidden="true" /></div>
            <div className="dashboard-metric-value"><strong>{value}</strong><span>{label}</span></div>
            <p>{caption}</p>
          </button>
        ))}
      </section>

      <section className="dashboard-inbox">
        <div className="dashboard-inbox-toolbar">
          <div>
            <h2 className="text-xl font-black tracking-[-.03em] text-[#1f184c]">Enquiry inbox <span className="dashboard-count">{enquiries.length}</span></h2>
            <p className="mt-1 text-sm text-[#756e7d]">A clear view of every conversation, newest first.</p>
          </div>
          <div className="dashboard-filters">
            <label className="relative block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9185c4]" size={17} />
              <input className="min-h-11 w-full rounded-xl border border-[#ded8ef] bg-[#faf9fd] pl-10 pr-3 text-sm outline-none focus:border-[#8b7ec8] sm:w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone, city, state or ID" aria-label="Search enquiries" />
            </label>
            <select aria-label="Filter by status" className="min-h-11 rounded-xl border border-[#ded8ef] bg-[#faf9fd] px-3 text-sm font-bold text-[#292057] outline-none focus:border-[#8b7ec8]" value={filter} onChange={(event) => setFilter(event.target.value as "All" | EnquiryStatus)}>
              <option value="All">All statuses</option>
              {enquiryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select aria-label="Filter by state" className="min-h-11 max-w-full rounded-xl border border-[#ded8ef] bg-[#faf9fd] px-3 text-sm font-bold text-[#292057] sm:max-w-48" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
              <option value="All">All states</option>
              {availableStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>
        </div>

        {loadError ? <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{loadError}</div> : null}
        {actionError ? <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{actionError}</div> : null}

        <div className="overflow-x-auto">
          <table className="dashboard-table w-full min-w-[1080px] border-collapse text-left">
            <thead className="bg-[#faf9fd] text-[.68rem] font-black uppercase tracking-[.12em] text-[#8175a2]">
              <tr>
                <th className="px-5 py-3.5">Enquiry</th>
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5">Files</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf5]">
              {filtered.map((enquiry) => (
                <tr key={enquiry.pageId} className="transition hover:bg-[#fcfbfe]">
                  <td className="px-5 py-4"><b className="dashboard-enquiry-id">{enquiry.leadId}</b><span className="mt-1 block max-w-52 truncate text-xs text-[#8a8393]">{enquiry.concern || "No concern provided"}</span></td>
                  <td className="px-5 py-4"><div className="min-w-0"><b className="text-sm text-[#292057]">{enquiry.name}</b><span className="mt-1 block max-w-40 truncate text-xs text-[#8a8393]" title={enquiry.address}>{enquiry.address}</span></div></td>
                  <td className="px-5 py-4"><a className="text-sm font-bold text-[#7164b1] hover:underline" href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></td>
                  <td className="px-5 py-4"><b className="block text-sm text-[#292057]">{enquiry.city || "—"}</b><span className="mt-1 block text-xs text-[#8a8393]">{[enquiry.state, enquiry.pincode].filter(Boolean).join(" · ")}</span></td>
                  <td className="px-5 py-4 text-xs font-semibold text-[#6f6878]">{formatDate(enquiry.submittedAt)}</td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#655a8f]"><Paperclip size={15} /> {enquiry.attachmentCount}</span></td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-extrabold ${statusClasses[enquiry.status]}`}>
                      {enquiry.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right"><button className="dashboard-view-button" type="button" onClick={(event) => { restoreFocusRef.current = event.currentTarget; setDetailTab("details"); setActionError(""); setSelectedId(enquiry.pageId); }}>View <ChevronRight size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dashboard-table-footer"><span>{filtered.length} of {enquiries.length} enquiries</span><span><span className="dashboard-footer-dot" /> All times in IST</span></div>
        {!loadError && !filtered.length ? <div className="grid min-h-52 place-items-center p-8 text-center"><div><Search className="mx-auto text-[#b0a7c8]" /><p className="mt-3 font-bold text-[#655f6d]">{enquiries.length ? "No enquiries match this view." : "No Ping enquiries yet."}</p><p className="mt-2 text-sm text-[#817989]">{enquiries.length ? "Try a different search, status or state." : "New submissions will appear here automatically when you refresh."}</p></div></div> : null}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#16102e]/65 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <section ref={detailDialogRef} className="flex h-[min(88dvh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="enquiry-detail-title">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#ece8f3] bg-[#faf9fd] px-5 py-5 sm:px-7">
              <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${statusClasses[selected.status]}`}>{selected.status}</span><h2 id="enquiry-detail-title" className="mt-3 text-2xl font-black tracking-[-.04em] text-[#1f184c]">{selected.name}</h2><p className="mt-1 text-xs font-bold tracking-wide text-[#9185a0]">{selected.leadId}</p></div>
              <button className="grid size-10 place-items-center rounded-full bg-[#f0eef9] text-[#655a8f] hover:bg-[#e5e0f1]" type="button" onClick={() => setSelectedId(null)} aria-label="Close enquiry"><X size={19} /></button>
            </div>

            <div className="shrink-0 border-b border-[#ece8f3] px-5 py-4 sm:px-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-xs font-bold text-[#655a8f]">Change status</legend>
                  <div className="flex flex-wrap gap-2">
                    {enquiryStatuses.map((status) => (
                      <button key={status} type="button" aria-pressed={selected.status === status}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7164b1] disabled:cursor-default ${selected.status === status ? `${statusClasses[status]} ring-1 ring-current` : "border-[#e4dfed] bg-white text-[#756e7d] hover:border-[#b5a5ce] hover:bg-[#f7f5fb] disabled:opacity-40"}`}
                        disabled={Boolean(updatingId) || selected.status === "Served" || selected.status === status}
                        onClick={() => void updateStatus(selected.pageId, status)}>
                        {selected.status === status ? <CheckCircle2 size={14} aria-hidden="true" /> : null}{status}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ded8ef] px-4 text-sm font-extrabold text-[#292057] hover:bg-[#f7f5fb]" href={`tel:${selected.phone}`}><Phone size={16} /> Call patient</a>
              </div>
              {selected.status === "Served" ? <p className="text-xs text-[#756e7d]">This enquiry has been served. Its status is final.</p> : null}
              {actionError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{actionError}</p> : null}

            </div>
            <div className="flex shrink-0 gap-1 border-b border-[#ece8f3] px-5 pt-2 sm:px-7" role="tablist" aria-label="Enquiry information">
              {([['details', 'Details'], ['concern', 'Concern & summaries'], ['files', 'Files & audio']] as const).map(([id, label], index, tabs) => (
                <button key={id} id={`enquiry-tab-${id}`} role="tab" type="button" aria-selected={detailTab === id} aria-controls={`enquiry-panel-${id}`} tabIndex={detailTab === id ? 0 : -1}
                  className={`min-h-12 flex-1 border-b-2 px-2 py-3 text-xs font-bold transition sm:flex-none sm:px-5 sm:text-sm ${detailTab === id ? 'border-[#7164b1] text-[#1f184c]' : 'border-transparent text-[#817989] hover:text-[#1f184c]'}`}
                  onClick={() => setDetailTab(id)}
                  onKeyDown={(event) => {
                    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
                    if (next < 0) return;
                    event.preventDefault(); setDetailTab(tabs[next][0]); document.getElementById(`enquiry-tab-${tabs[next][0]}`)?.focus();
                  }}>
                  {label}{id === 'files' ? <span className="ml-1.5 rounded-full bg-[#f0eef9] px-1.5 py-0.5 text-[.65rem]">{selected.attachments.length}</span> : null}
                </button>
              ))}
            </div>
            <div key={detailTab} id={`enquiry-panel-${detailTab}`} role="tabpanel" aria-labelledby={`enquiry-tab-${detailTab}`} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 focus-visible:outline-[#7164b1] sm:p-7">
              {detailTab === 'details' ? (
<div className="grid gap-3 sm:grid-cols-2">
                <DetailCard icon={<Phone size={17} />} label="Phone" value={selected.phone} />
                <DetailCard icon={<Phone size={17} />} label="WhatsApp" value={selected.whatsapp} />
                <DetailCard icon={<MapPin size={17} />} label="Address" value={[selected.address, selected.landmark, selected.pincode && !selected.address.includes(selected.pincode) ? selected.pincode : ""].filter(Boolean).join(" · ")} wide />
                <DetailCard icon={<CalendarClock size={17} />} label="Submitted" value={formatDate(selected.submittedAt)} />
                <DetailCard icon={<MapPin size={17} />} label="City / State" value={[selected.city, selected.state, selected.country].filter(Boolean).join(", ")} />
                <DetailCard icon={<MapPin size={17} />} label="Pincode" value={selected.pincode} />
                <DetailCard icon={<MapPin size={17} />} label="Address source" value={({ manual: "Entered manually", current_location: "Current location", google_search: "Address search" } as Record<string, string>)[selected.addressSource] || selected.addressSource} />
              </div>
              ) : null}
              {detailTab === 'concern' ? <div className="grid gap-6">
<DetailSection title="Dental concern" value={selected.concern || "No concern provided."} />
              {selected.summaryEnglish ? <DetailSection title="Summary — English" value={selected.summaryEnglish} /> : null}
              {selected.summaryHindi ? <DetailSection title="Summary — Hindi" value={selected.summaryHindi} /> : null}
              {selected.transcript ? <DetailSection title="Voice transcript" value={selected.transcript} /> : null}
              </div> : null}
              {detailTab === 'files' ? <div className="grid gap-4">
                <div><h3 className="text-lg font-bold text-[#1f184c]">Files & voice notes</h3><p className="mt-1 text-sm text-[#817989]">Play recorded audio here, or open a supporting document.</p></div>
                {selected.attachments.length ? selected.attachments.map((file, index) => <EnquiryAttachment key={`${selected.pageId}-${index}`} file={file} />) : <p className="rounded-2xl border border-dashed border-[#d9d3e6] p-8 text-center text-sm text-[#817989]">No files or voice notes were attached.</p>}
              </div> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function DetailCard({ icon, label, value, wide = false }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-2xl border border-[#e7e3ef] bg-[#faf9fd] p-4 ${wide ? "sm:col-span-2" : ""}`}><span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.09em] text-[#8175a2]">{icon}{label}</span><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#292057]">{value || "—"}</p></div>;
}

function DetailSection({ title, value }: { title: string; value: string }) {
  return <section><h3 className="text-sm font-black uppercase tracking-[.1em] text-[#655a8f]">{title}</h3><p className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#e7e3ef] bg-[#faf9fd] p-4 text-sm leading-7 text-[#514b59]">{value}</p></section>;
}

function EnquiryAttachment({ file }: { file: EnquiryFile }) {
  const [playbackError, setPlaybackError] = useState(false);
  const isAudio = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(file.name) || /^audio\//i.test(file.type) || /^voice-note-.*\.webm$/i.test(file.name);
  return (
    <article className="min-w-0 rounded-2xl border border-[#e4e0ef] bg-[#faf9fd] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#7164b1]"><FileText size={19} /></span>
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold text-[#292057]">{isAudio ? 'Voice recording' : file.name}</p><p className="mt-1 break-all text-xs text-[#817989]">{isAudio ? file.name : 'Supporting attachment'}</p></div>
        <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#ded8ef] bg-white px-3 text-xs font-bold text-[#655a8f]" aria-label={`Open ${file.name}`}>Open <ExternalLink size={14} /></a>
      </div>
      {isAudio ? <audio className="mt-4 w-full" controls preload="none" src={file.url} aria-label={`Play ${file.name}`} onError={() => setPlaybackError(true)}>Your browser does not support audio playback. Use the Open link above.</audio> : null}
      {playbackError ? <p className="mt-3 text-xs leading-5 text-[#a52e40]" role="alert">Audio could not load. Refresh the dashboard to renew the file link, or use Open to play it in another tab.</p> : null}
    </article>
  );
}
