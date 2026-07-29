"use client";

import { StatusInfo } from "@/lib/types";

export default function ConnectGoogle({
  status,
  customerId,
  onCustomerIdChange,
  onSimulate,
  onDisconnect,
  error,
}: {
  status: StatusInfo | null;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  onSimulate: () => void;
  onDisconnect: () => void;
  error: string | null;
}) {
  if (!status) {
    return <p className="text-sm text-neutral-500">Lade Status…</p>;
  }

  if (!status.googleConfigured) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          Die Google-Ads-Verbindung ist auf diesem Server noch nicht konfiguriert.
        </p>
        <button className="btn-primary self-start" onClick={onSimulate}>
          Im Testmodus fortfahren
        </button>
      </div>
    );
  }

  if (!status.googleConnected) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">Verbinde dein Google-Ads-Konto, um fortzufahren.</p>
        {error && <p className="text-sm text-red-600">Verbindung fehlgeschlagen: {error}</p>}
        <a className="btn-primary self-start" href="/api/auth/google">
          Mit Google Ads verbinden
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-600" /> Verbunden
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Google-Ads-Kunden-ID (Customer ID)
        <input
          className="input"
          placeholder="123-456-7890"
          value={customerId}
          onChange={(e) => onCustomerIdChange(e.target.value)}
        />
      </label>
      <button className="btn-secondary self-start text-sm" onClick={onDisconnect}>
        Trennen
      </button>
    </div>
  );
}
