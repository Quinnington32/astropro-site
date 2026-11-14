export const highLevelRetryCron = "*/5 * * * *";

const source = "AstroPro Student Resource Center";
const api = "https://services.leadconnectorhq.com";

function requestHighLevel(token, fetcher) {
  return async (operation, path, body) => {
    let response;
    try {
      response = await fetcher(api + path, {
        method: body ? "POST" : "GET",
        headers: {
          accept: "application/json",
          authorization: "Bearer " + token,
          version: "v3",
          ...(body && { "content-type": "application/json" }),
        },
        body: body && JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      throw Error(operation + "_unavailable");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const error = Error(operation + "_" + response.status);
      error.status = response.status;
      if (result?.code === "OPPORTUNITY_NO_DUPLICATE")
        error.existingId = result.meta?.existingId;
      throw error;
    }
    if (!result) throw Error(operation + "_response");
    return result;
  };
}

async function findContact(call, locationId, email) {
  const query = new URLSearchParams({ locationId, email });
  const { contact } = await call("contact_lookup", "/contacts/search/duplicate?" + query);
  if (contact === null) return null;
  if (!contact?.id || (contact.locationId && contact.locationId !== locationId))
    throw Error("contact_lookup_response");
  return contact.id;
}

async function getContact(call, locationId, lead) {
  const existing = await findContact(call, locationId, lead.email);
  if (existing) return existing;
  try {
    const { contact } = await call("contact_create", "/contacts", {
      locationId,
      email: lead.email,
      name: lead.contactName || lead.organization,
      source,
      ...(lead.organization && { companyName: lead.organization }),
    });
    if (!contact?.id || (contact.locationId && contact.locationId !== locationId))
      throw Error("contact_create_response");
    return contact.id;
  } catch (error) {
    if (error.status !== 400 && error.status !== 409) throw error;
    const contactId = await findContact(call, locationId, lead.email);
    if (contactId) return contactId;
    throw error;
  }
}

async function getOpportunity(call, lead, config, contactId) {
  const { locationId, pipelineId, stageId, assignedTo } = config;
  const query = new URLSearchParams({ locationId, pipelineId, contactId, status: "all", q: lead.receipt, limit: "20" });
  const { opportunities } = await call("opportunity_lookup", "/opportunities/search?" + query);
  if (!Array.isArray(opportunities)) throw Error("opportunity_lookup_response");
  const existing = opportunities.find((item) => item.pipelineId === pipelineId &&
    item.contactId === contactId && item.name?.endsWith(` (${lead.receipt})`));
  if (existing?.id) return existing.id;
  try {
    const { opportunity } = await call("opportunity_create", "/opportunities", {
      locationId,
      pipelineId,
      pipelineStageId: stageId,
      contactId,
      assignedTo,
      name: lead.opportunityName,
      source,
      monetaryValue: 0,
      status: "open",
    });
    if (!opportunity?.id || opportunity.pipelineId !== pipelineId || opportunity.contactId !== contactId)
      throw Error("opportunity_create_response");
    return opportunity.id;
  } catch (error) {
    if (error.existingId) return error.existingId;
    throw error;
  }
}

function makeLead(row) {
  const payload = JSON.parse(row.payload_json);
  const campaign = row.type === "partner-campaign";
  const nextStep = campaign ? "Verify campaign payment" : "Review listing suggestion";
  const summary = campaign
    ? `${payload.marketName} (${payload.orderRef})`
    : `${payload.organization} · ${payload.title}`;
  const label = `${campaign ? "Campaign" : "Listing"} · ${summary}`.replace(/\s+/g, " ").slice(0, 110);
  return {
    receipt: row.submission_id,
    email: payload.email,
    contactName: payload.contactName,
    organization: payload.organization,
    opportunityName: `${label} (${row.submission_id})`,
    taskTitle: `${nextStep} · ${row.submission_id}`,
    taskBody: [
      source,
      summary,
      campaign
        ? "Match the reference to a completed PayPal payment before approving or scheduling the campaign."
        : `Verify the official source and review the ${payload.listingType.toLowerCase()} before publishing.`,
      ...(campaign && payload.phone ? [`Callback number provided: ${payload.phone}`] : []),
      `Open the private request for full details and follow up directly. https://students.goastropro.com/admin.html?receipt=${row.submission_id}`,
    ].join("\n\n"),
  };
}

async function ensureTask(call, lead, contactId, assignedTo) {
  const path = `/contacts/${encodeURIComponent(contactId)}/tasks`;
  const { tasks } = await call("task_lookup", path);
  if (!Array.isArray(tasks)) throw Error("task_lookup_response");
  if (tasks.some((task) => task.title === lead.taskTitle)) return;
  const { task } = await call("task_create", path, {
    title: lead.taskTitle,
    body: lead.taskBody,
    assignedTo,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false,
  });
  if (!task?.id) throw Error("task_create_response");
}

export async function deliverHighLevel(env, submissionId, fetcher = fetch) {
  if (!env.GHL_PRIVATE_TOKEN) return;
  const db = env.DB;
  const now = Date.now();
  const lease = crypto.randomUUID();
  const claim = await db.prepare(`UPDATE highlevel_deliveries AS current
    SET lease_token=?, lease_until=?, attempts=attempts+1
    WHERE submission_id=? AND synced_at IS NULL AND next_attempt_at<=? AND lease_until<=?
    AND NOT EXISTS (
      SELECT 1 FROM highlevel_deliveries AS other WHERE other.contact_key=current.contact_key
      AND other.submission_id<>current.submission_id AND other.lease_until>? AND other.synced_at IS NULL
    ) RETURNING submission_id, attempts, contact_id, opportunity_id`)
    .bind(lease, now + 120000, submissionId, now, now, now).first();
  if (!claim) return;
  const update = (set, ...values) => db.prepare(`UPDATE highlevel_deliveries SET ${set} WHERE submission_id=? AND lease_token=?`)
    .bind(...values, submissionId, lease).run();
  try {
    const row = await db.prepare("SELECT type,json_remove(payload_json,'$.flyerBase64') AS payload_json FROM submissions WHERE id=?")
      .bind(submissionId).first();
    if (!row) return;
    const campaign = row.type === "partner-campaign";
    const config = {
      locationId: env.GHL_LOCATION_ID,
      pipelineId: env.GHL_PIPELINE_ID,
      stageId: campaign ? env.GHL_CAMPAIGN_STAGE_ID : env.GHL_LISTING_STAGE_ID,
      assignedTo: campaign ? env.GHL_CAMPAIGN_OWNER_ID : env.GHL_LISTING_OWNER_ID,
    };
    if (Object.values(config).some((value) => !value)) throw Error("highlevel_configuration");
    const lead = makeLead({ ...row, submission_id: submissionId });
    const call = requestHighLevel(env.GHL_PRIVATE_TOKEN, fetcher);
    const contactId = claim.contact_id ?? await getContact(call, config.locationId, lead);
    if (!claim.contact_id && !(await update("contact_id=?", contactId)).meta.changes) return;
    const opportunityId = claim.opportunity_id ?? await getOpportunity(call, lead, config, contactId);
    if (!claim.opportunity_id && !(await update("opportunity_id=?", opportunityId)).meta.changes) return;
    await ensureTask(call, lead, contactId, config.assignedTo);
    await update("synced_at=?, error_code=NULL, lease_token=NULL, lease_until=0", new Date().toISOString());
  } catch (error) {
    const code = /^(?:(?:contact|opportunity|task)_(?:lookup|create)_(?:\d{3}|response|unavailable)|highlevel_configuration)$/.test(error.message)
      ? error.message : "highlevel_sync_error";
    const delay = Math.min(360, 5 * 2 ** Math.min(claim.attempts - 1, 7)) * 60000;
    await update("next_attempt_at=?, error_code=?, lease_token=NULL, lease_until=0", Date.now() + delay, code);
    console.warn("Resource Center HighLevel delivery queued for retry", code);
  }
}

export async function retryHighLevel(env, fetcher = fetch) {
  if (!env.GHL_PRIVATE_TOKEN) return;
  const now = Date.now();
  const { results } = await env.DB.prepare(`SELECT submission_id FROM highlevel_deliveries
    WHERE synced_at IS NULL AND next_attempt_at<=? AND lease_until<=?
    ORDER BY next_attempt_at LIMIT 5`).bind(now, now).all();
  for (const row of results) await deliverHighLevel(env, row.submission_id, fetcher);
}
