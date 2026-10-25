import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { enquiryStatuses } from "@/lib/enquiry";
import { getEnquiryStatus, updateEnquiryStatus } from "@/lib/notion-leads";
import { isTrustedMutation } from "@/lib/request-security";
import { boundedRequest } from "@/lib/bounded-request";

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/enquiries/[pageId]/status">) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  }
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ ok: false, message: "Request blocked." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ ok: false, message: "Request must use JSON." }, { status: 415 });
  }

  const { pageId } = await context.params;
  if (!/^[0-9a-f-]{32,36}$/i.test(pageId)) {
    return NextResponse.json({ ok: false, message: "Invalid enquiry." }, { status: 400 });
  }

  let status: unknown;
  try {
    status = (await (await boundedRequest(request, 4096)).json() as { status?: unknown }).status;
  } catch {
    return NextResponse.json({ ok: false, message: "Choose a valid status." }, { status: 400 });
  }
  if (!enquiryStatuses.includes(status as (typeof enquiryStatuses)[number])) {
    return NextResponse.json({ ok: false, message: "Choose a valid status." }, { status: 400 });
  }

  try {
    const currentStatus = await getEnquiryStatus(pageId);
    if (currentStatus === "Served" && status !== "Served") {
      return NextResponse.json({ ok: false, message: "Served enquiries are final and cannot be changed." }, { status: 409 });
    }
    await updateEnquiryStatus(pageId, status as (typeof enquiryStatuses)[number]);
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("[Dentist At Door] Status update failed", error);
    return NextResponse.json({ ok: false, message: "Status could not be updated." }, { status: 503 });
  }
}
