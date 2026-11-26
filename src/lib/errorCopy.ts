import { ApiError } from "./api";

export type ErrorKind =
  | "network"
  | "not_found"
  | "rate_limited"
  | "server"
  | "generic";

export type FriendlyError = {
  kind: ErrorKind;
  title: string;
  detail: string;
  hint: string;
};

function kindFromStatus(status: number, code?: string): ErrorKind {
  if (status === 404 || code === "not_found") return "not_found";
  if (status === 429 || code === "rate_limited") return "rate_limited";
  if (status >= 500) return "server";
  return "generic";
}

function kindFromMessage(message: string): ErrorKind {
  const m = message.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("econnrefused") ||
    m.includes("load failed") ||
    m.includes("offline")
  ) {
    return "network";
  }
  if (m.includes("not found") || m.includes("unknown city")) return "not_found";
  if (m.includes("too many") || m.includes("rate")) return "rate_limited";
  if (m.includes("500") || m.includes("unable to")) return "server";
  return "generic";
}

const COPY: Record<
  ErrorKind,
  { title: string; hint: string; fallbackDetail: string }
> = {
  network: {
    title: "Can't reach BiteRate",
    hint: "Check your connection, or make sure the API is running locally.",
    fallbackDetail: "The request never made it to the server.",
  },
  not_found: {
    title: "Nothing here",
    hint: "Try another city or head back to Compare.",
    fallbackDetail: "That city or resource isn't in the catalog.",
  },
  rate_limited: {
    title: "Slow down a moment",
    hint: "Wait a few seconds, then retry.",
    fallbackDetail: "Too many requests in a short window.",
  },
  server: {
    title: "Something broke on our side",
    hint: "Retry in a moment. If it keeps happening, the API may need a restart.",
    fallbackDetail: "The server couldn't complete this request.",
  },
  generic: {
    title: "Couldn't load this",
    hint: "Retry, or refresh the page.",
    fallbackDetail: "An unexpected error stopped this action.",
  },
};

/** Turn raw fetch / ApiError / strings into UI-ready copy. */
export function friendlyError(input: unknown): FriendlyError {
  if (input instanceof ApiError) {
    const kind = kindFromStatus(input.status, input.code);
    const base = COPY[kind];
    return {
      kind,
      title: base.title,
      detail: input.message || base.fallbackDetail,
      hint: base.hint,
    };
  }

  const message =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : "";

  const kind = message ? kindFromMessage(message) : "generic";
  const base = COPY[kind];

  // Prefer human detail when the raw message isn't just a technical blob
  const technical =
    !message ||
    /failed to fetch|econnrefused|request failed \(\d+\)/i.test(message);

  return {
    kind,
    title: base.title,
    detail: technical ? base.fallbackDetail : message,
    hint: base.hint,
  };
}
