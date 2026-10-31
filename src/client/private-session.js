// Reject late responses after locking, even if a browser completes an aborted fetch.
export function createPrivateSession(
  baseURL,
  fetcher = fetch,
  timeoutMs = 20000,
) {
  let token = "",
    generation = 0;
  const pending = new Set();
  function lock() {
    token = "";
    generation++;
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  return {
    lock,
    unlock(value) {
      lock();
      token = value;
    },
    get unlocked() {
      return !!token;
    },
    async request(path, options = {}) {
      if (!token) throw new DOMException("Inbox is locked.", "AbortError");
      const current = generation,
        controller = new AbortController();
      pending.add(controller);
      const timer = setTimeout(
        () =>
          controller.abort(
            new DOMException(
              "The inbox request timed out. Please try again.",
              "TimeoutError",
            ),
          ),
        timeoutMs,
      );
      try {
        const response = await fetcher(new URL("api/admin/" + path, baseURL), {
          ...options,
          headers: {
            ...options.headers,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (generation !== current || !token)
          throw new DOMException("Inbox is locked.", "AbortError");
        if (controller.signal.aborted) throw controller.signal.reason;
        if (!response.ok)
          throw Object.assign(Error(data.error || "Could not load inbox."), {
            status: response.status,
          });
        return data;
      } catch (err) {
        if (generation !== current || !token)
          throw new DOMException("Inbox is locked.", "AbortError");
        if (controller.signal.aborted) throw controller.signal.reason;
        throw err;
      } finally {
        clearTimeout(timer);
        pending.delete(controller);
      }
    },
  };
}
