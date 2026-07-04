const baseUrl = (process.env.PRINT_JOBS_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const token = process.env.PRINT_JOBS_API_TOKEN || "";

const endpoints = [
  "/api/print-jobs/test-label",
  "/api/print-jobs/test-product-label",
  "/api/print-jobs/test-ingredient-label",
  "/api/print-jobs/test-prep-label",
];

function curlFor(endpoint) {
  return `curl -X POST "${baseUrl}${endpoint}" -H "Authorization: Bearer PRINT_JOBS_API_TOKEN"`;
}

function statusUrl(jobId) {
  return `${baseUrl}/api/print-jobs/${encodeURIComponent(jobId)}`;
}

async function postEndpoint(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${endpoint} -> HTTP ${response.status}: ${body.error || "sin detalle"}`);
  }

  const job = body.job || {};
  if (!job.id) {
    throw new Error(`${endpoint} -> respuesta sin job.id`);
  }

  return job;
}

async function main() {
  if (!token.trim()) {
    throw new Error("Falta PRINT_JOBS_API_TOKEN.");
  }

  console.info("[PRINT SMOKE START]", { baseUrl, endpoints: endpoints.length });

  for (const endpoint of endpoints) {
    const job = await postEndpoint(endpoint);
    console.info("[PRINT SMOKE JOB]", {
      endpoint,
      jobId: job.id,
      initialStatus: job.status,
      curl: curlFor(endpoint),
      statusUrl: statusUrl(job.id),
    });
  }

  console.info("[PRINT SMOKE DONE]");
}

main().catch((error) => {
  console.error("[PRINT SMOKE ERROR]", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
