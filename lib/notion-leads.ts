import "server-only";
import type { DentalLead } from "./lead-schema";
import { enquiryStatuses, type DashboardEnquiry, type EnquiryStatus } from "./enquiry";

const NOTION_VERSION = "2026-03-11";
const NOTION_API = "https://api.notion.com/v1";

type RichTextItem = {
  plain_text?: string;
  href?: string | null;
  text?: { link?: { url?: string } | null };
};
type NotionProperty = {
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  select?: { name?: string } | null;
  phone_number?: string | null;
  url?: string | null;
  date?: { start?: string } | null;
  number?: number | null;
  checkbox?: boolean;
  files?: Array<{
    name?: string;
    type?: string;
    file?: { url?: string };
    external?: { url?: string };
  }>;
};

type NotionPage = {
  id: string;
  url: string;
  properties: Record<string, NotionProperty>;
};

function getConfig() {
  const token = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!token || !dataSourceId) {
    throw new Error("Notion integration is not configured. Add NOTION_API_KEY and NOTION_DATA_SOURCE_ID.");
  }
  return { token, dataSourceId };
}

async function notionRequest<T>(path: string, init: RequestInit = {}) {
  const { token } = getConfig();
  const response = await fetch(`${NOTION_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: init.signal || AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = await response.text().then((value) => value.slice(0, 600)).catch(() => "Unavailable");
    throw new Error(`Notion API returned ${response.status}: ${detail}`);
  }
  return response.json() as Promise<T>;
}

function richText(value: string) {
  const chunks = value.match(/[\s\S]{1,2000}/g) || [];
  return chunks.map((content) => ({ type: "text", text: { content } }));
}

function richTextLink(label: string, url: string) {
  return { type: "text", text: { content: label, link: { url } } };
}

async function uploadFile(file: File) {
  const created = await notionRequest<{ id: string; upload_url?: string }>("/file_uploads", {
    method: "POST",
    body: JSON.stringify({ mode: "single_part", filename: file.name, content_type: file.type || "application/octet-stream" }),
  });

  const form = new FormData();
  form.append("file", file, file.name);
  const { token } = getConfig();
  const response = await fetch(created.upload_url || `${NOTION_API}/file_uploads/${created.id}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().then((value) => value.slice(0, 600)).catch(() => "Unavailable");
    throw new Error(`Notion file upload returned ${response.status}: ${detail}`);
  }
  return { id: created.id, name: file.name };
}

export async function saveLeadToNotion(lead: DentalLead, files: File[]) {
  const { dataSourceId } = getConfig();
  const schema = await notionRequest<{ properties: Record<string, unknown> }>(`/data_sources/${dataSourceId}`);
  const uploads = new Array<{ id: string; name: string }>(files.length);
  let nextFileIndex = 0;
  const uploadWorker = async () => {
    while (nextFileIndex < files.length) {
      const index = nextFileIndex++;
      uploads[index] = await uploadFile(files[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, files.length) }, uploadWorker));

  return notionRequest<{ id: string; url: string }>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: Object.fromEntries(Object.entries({
        "Lead ID": { type: "title", title: richText(lead.leadId) },
        Status: { type: "select", select: { name: "Active" } },
        "Full Name": { type: "rich_text", rich_text: richText(lead.name) },
        Phone: { type: "phone_number", phone_number: lead.phone },
        WhatsApp: { type: "phone_number", phone_number: lead.whatsapp },
        Address: {
          type: "rich_text",
          rich_text: [
            ...richText(lead.address),
            richTextLink(" · Open in Google Maps", lead.mapUrl),
          ],
        },
        Landmark: { type: "rich_text", rich_text: richText(lead.landmark || "") },
        City: { type: "rich_text", rich_text: richText(lead.city) },
        State: { type: "rich_text", rich_text: richText(lead.state) },
        Country: { type: "select", select: { name: lead.country } },
        "Map URL": { type: "url", url: lead.mapUrl },
        Latitude: { type: "number", number: lead.latitude ?? null },
        Longitude: { type: "number", number: lead.longitude ?? null },
        "Place ID": { type: "rich_text", rich_text: richText(lead.placeId || "") },
        "Address Source": { type: "select", select: { name: lead.addressSource } },
        Pincode: { type: "rich_text", rich_text: richText(lead.pincode || "") },
        Concern: { type: "rich_text", rich_text: richText(lead.concern || "") },
        Transcript: { type: "rich_text", rich_text: richText(lead.transcript || "") },
        "Summary English": { type: "rich_text", rich_text: richText(lead.summaryEnglish || "") },
        "Summary Hindi": { type: "rich_text", rich_text: richText(lead.summaryHindi || "") },
        Attachments: {
          type: "files",
          files: uploads.map((upload) => ({ type: "file_upload", name: upload.name, file_upload: { id: upload.id } })),
        },
        "Attachment Count": { type: "number", number: uploads.length },
        Consent: { type: "checkbox", checkbox: lead.consent },
        Source: { type: "select", select: { name: lead.source } },
        "Page URL": { type: "url", url: lead.pageUrl.startsWith("http") ? lead.pageUrl : null },
        "Submitted At": { type: "date", date: { start: lead.createdAt } },
      }).filter(([name]) => name in schema.properties)),
    }),
  });
}

function propertyText(property?: NotionProperty) {
  return [...(property?.title || []), ...(property?.rich_text || [])].map((item) => item.plain_text || "").join("");
}

function propertyLink(property?: NotionProperty) {
  const items = [...(property?.title || []), ...(property?.rich_text || [])];
  return items.map((item) => item.href || item.text?.link?.url || "").find(Boolean) || "";
}

function parsePage(page: NotionPage): DashboardEnquiry {
  const property = page.properties;
  const status = property.Status?.select?.name;
  const attachments = (property.Attachments?.files || []).flatMap((file) => {
    const url = file.file?.url || file.external?.url;
    return url ? [{ name: file.name || "Attachment", url, type: file.type || "file" }] : [];
  });
  return {
    pageId: page.id,
    notionUrl: page.url,
    leadId: propertyText(property["Lead ID"]),
    status: enquiryStatuses.includes(status as EnquiryStatus) ? status as EnquiryStatus : "Active",
    name: propertyText(property["Full Name"]),
    phone: property.Phone?.phone_number || "",
    whatsapp: property.WhatsApp?.phone_number || "",
    address: propertyText(property.Address).replace(/\s*·\s*Open in Google Maps\s*$/, ""),
    landmark: propertyText(property.Landmark),
    city: propertyText(property.City),
    state: propertyText(property.State),
    country: property.Country?.select?.name || "",
    latitude: property.Latitude?.number ?? null,
    longitude: property.Longitude?.number ?? null,
    placeId: propertyText(property["Place ID"]),
    addressSource: property["Address Source"]?.select?.name || "",
    consent: property.Consent?.checkbox === true,
    pincode: propertyText(property.Pincode),
    mapUrl: property["Map URL"]?.url || propertyLink(property.Address),
    concern: propertyText(property.Concern),
    transcript: propertyText(property.Transcript),
    summaryEnglish: propertyText(property["Summary English"]),
    summaryHindi: propertyText(property["Summary Hindi"]),
    source: property.Source?.select?.name || "",
    pageUrl: property["Page URL"]?.url || "",
    submittedAt: property["Submitted At"]?.date?.start || "",
    attachmentCount: property["Attachment Count"]?.number || attachments.length,
    attachments,
  };
}

export async function listEnquiries() {
  const { dataSourceId } = getConfig();
  const enquiries: DashboardEnquiry[] = [];
  let cursor: string | undefined;

  do {
    const result = await notionRequest<{ results: NotionPage[]; has_more: boolean; next_cursor?: string | null }>(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        sorts: [{ property: "Submitted At", direction: "descending" }],
      }),
    });
    enquiries.push(...result.results.map(parsePage));
    cursor = result.has_more && result.next_cursor ? result.next_cursor : undefined;
  } while (cursor && enquiries.length < 500);

  return enquiries;
}

export async function updateEnquiryStatus(pageId: string, status: EnquiryStatus) {
  return notionRequest<{ id: string }>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { Status: { type: "select", select: { name: status } } } }),
  });
}

export async function getEnquiryStatus(pageId: string) {
  const page = await notionRequest<NotionPage>(`/pages/${pageId}`);
  const status = page.properties.Status?.select?.name;
  return enquiryStatuses.includes(status as EnquiryStatus) ? status as EnquiryStatus : "Active";
}
