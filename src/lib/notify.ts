const KEY = "biterate:notify:v1";
const CHECK_KEY = "biterate:notify:lastCheck";

export type NotifyPrefs = {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
};

function defaultPrefs(): NotifyPrefs {
  const supported =
    typeof window !== "undefined" && "Notification" in window;
  return {
    enabled: false,
    permission: supported ? Notification.permission : "unsupported",
  };
}

export function loadNotifyPrefs(): NotifyPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
    const base = defaultPrefs();
    return {
      enabled: Boolean(parsed.enabled),
      permission: base.permission,
    };
  } catch {
    return defaultPrefs();
  }
}

export function saveNotifyPrefs(prefs: NotifyPrefs): NotifyPrefs {
  const next = {
    enabled: prefs.enabled,
    permission: prefs.permission,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: next.enabled }));
  } catch {
    // ignore
  }
  return next;
}

export async function requestNotifyPermission(): Promise<NotifyPrefs> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return saveNotifyPrefs({ enabled: false, permission: "unsupported" });
  }
  try {
    const permission = await Notification.requestPermission();
    return saveNotifyPrefs({
      enabled: permission === "granted",
      permission,
    });
  } catch {
    return saveNotifyPrefs({
      enabled: false,
      permission: Notification.permission,
    });
  }
}

export function canNotify(): boolean {
  const prefs = loadNotifyPrefs();
  return (
    prefs.enabled &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export function fireAlertNotification(title: string, body: string) {
  if (!canNotify()) return false;
  try {
    new Notification(title, {
      body,
      tag: `biterate-${title.slice(0, 40)}`,
    });
    return true;
  } catch {
    return false;
  }
}

export function shouldAutoCheckAlerts(minIntervalMs = 15 * 60 * 1000): boolean {
  try {
    const last = Number(sessionStorage.getItem(CHECK_KEY) || 0);
    if (Date.now() - last < minIntervalMs) return false;
    sessionStorage.setItem(CHECK_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}
