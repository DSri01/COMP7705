import { ApiError } from "../api/generated";

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (typeof err.body === "string" && err.body.length > 0) {
      return err.body;
    }
    if (err.body && typeof err.body === "object" && "message" in err.body) {
      const m = (err.body as { message?: unknown }).message;
      if (typeof m === "string") {
        return m;
      }
    }
    return `${err.status} ${err.statusText}`.trim() || err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unknown error occurred";
}
