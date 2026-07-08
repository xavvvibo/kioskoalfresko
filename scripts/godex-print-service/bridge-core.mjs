export function hasHistoricalBacklog(summary, bridgeStartedAt) {
  const started = bridgeStartedAt instanceof Date ? bridgeStartedAt : new Date(bridgeStartedAt);
  const oldest = summary?.oldestJob?.created_at ? new Date(summary.oldestJob.created_at) : null;
  if (!oldest || Number.isNaN(oldest.getTime()) || Number.isNaN(started.getTime())) return false;

  const counts = summary?.counts || {};
  const pending = Number(counts.queued || 0) + Number(counts.claimed || 0) + Number(counts.sending || 0) + Number(counts.sent_unconfirmed || 0);
  return pending > 0 && oldest.getTime() < started.getTime();
}

export function startupQueueDecision(summary, options = {}) {
  const historical = hasHistoricalBacklog(summary, options.bridgeStartedAt);
  const processHistoricalJobs = options.processHistoricalJobs === true;
  return {
    historical,
    shouldPoll: !historical || processHistoricalJobs,
    reason: historical && !processHistoricalJobs ? "historical_queue_held" : "poll_allowed",
    queued: Number(summary?.counts?.queued || 0),
    claimed: Number(summary?.counts?.claimed || 0),
    sending: Number(summary?.counts?.sending || 0),
    sent_unconfirmed: Number(summary?.counts?.sent_unconfirmed || 0),
    pendingCopies: Number(summary?.pendingCopies || 0),
    oldestJob: summary?.oldestJob || null,
  };
}

export async function processBridgeJob(job, handlers, options = {}) {
  const bytes = typeof job.raw_command === "string" ? Buffer.byteLength(job.raw_command, "utf8") : 0;
  const transportMeta = {
    bytes,
    transport: options.transport,
    host: options.host,
    port: options.port,
  };

  if (job.command_language !== "ezpl") {
    const message = `Lenguaje no soportado por este bridge: ${job.command_language}`;
    await handlers.markError(job.id, message);
    return { ok: false, status: "error", phase: "before_tcp_validation_failed", error: message, ...transportMeta };
  }
  if (!options.isValidEzpl(job.raw_command)) {
    const message = "Invalid or empty EZPL payload";
    await handlers.markError(job.id, message);
    return { ok: false, status: "error", phase: "before_tcp_validation_failed", error: message, ...transportMeta };
  }

  try {
    await handlers.markSending(job.id);
  } catch (error) {
    return {
      ok: false,
      status: "claimed",
      phase: "sending_transition_failed_no_tcp",
      error: error instanceof Error ? error.message : String(error),
      ...transportMeta,
    };
  }

  try {
    await handlers.printRaw(job.raw_command, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await handlers.markError(job.id, message);
    return {
      ok: false,
      status: "error",
      phase: "during_tcp_before_acceptance",
      error: message,
      ...transportMeta,
    };
  }

  if (handlers.writeJournal) {
    await handlers.writeJournal({
      jobId: job.id,
      printerKey: job.printer_key,
      timestamp: new Date().toISOString(),
      bytes,
      tcpResult: "accepted",
    });
  }

  try {
    await handlers.markSentUnconfirmed(job.id, {
      ...transportMeta,
      note: "TCP aceptado por la impresora; pendiente ACK final del ERP.",
    });
  } catch (error) {
    return {
      ok: false,
      status: "sent_unconfirmed",
      phase: "tcp_accepted_ack_uncertain",
      error: error instanceof Error ? error.message : String(error),
      ...transportMeta,
    };
  }

  try {
    await handlers.markPrinted(job.id);
    return {
      ok: true,
      status: "printed",
      phase: "tcp_accepted_ack_confirmed",
      ...transportMeta,
    };
  } catch (error) {
    return {
      ok: false,
      status: "sent_unconfirmed",
      phase: "tcp_accepted_printed_ack_failed",
      error: error instanceof Error ? error.message : String(error),
      ...transportMeta,
    };
  }
}
