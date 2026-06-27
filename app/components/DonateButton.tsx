"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ExternalLink,
  HandCoins,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  formatDonationUsd,
} from "@/lib/donation-shared";
import { trackEvent } from "./openpanel";

const SUGGESTED_AMOUNTS = [500, 1000, 2500, 5000, 10000] as const;

type DonateNavButtonProps = {
  variant: "desktop" | "sheet";
  onAfterDonate?: () => void;
};

function DonateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [selectedCents, setSelectedCents] = useState<number>(2500);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setName("");
      setSelectedCents(2500);
      setCustomMode(false);
      setCustomAmount("");
      setSubmitting(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const resolveAmountCents = useCallback((): number | null => {
    if (customMode) {
      const dollars = Number.parseFloat(customAmount.replace(",", "."));
      if (!Number.isFinite(dollars)) return null;
      return Math.round(dollars * 100);
    }
    return selectedCents;
  }, [customAmount, customMode, selectedCents]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amountCents = resolveAmountCents();
    if (amountCents === null) {
      setError("Ingresa un monto válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amountCents }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        paypalUrl?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo registrar la donación.");
      }

      trackEvent("donation_intent", { amountCents });

      if (data.paypalUrl) {
        window.open(data.paypalUrl, "_blank", "noopener,noreferrer");
      }

      setSuccessMessage("Gracias. Te redirigimos a PayPal para completar tu donación.");
      onSuccess();

      window.setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la donación.");
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  const previewCents = resolveAmountCents();

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/70 px-3 pb-3 pt-8 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-white/20 sm:max-h-[min(92dvh,46rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-4 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <HandCoins aria-hidden className="h-5 w-5" strokeWidth={2.3} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-bold leading-tight text-slate-950">
                Donar ahora
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tu aporte mantiene activo el mapa y los reportes de ayuda.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <X aria-hidden className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            <div>
              <label
                htmlFor="donation-name"
                className="mb-1.5 block text-sm font-bold text-slate-800"
              >
                Nombre para el muro
              </label>
              <input
                id="donation-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                autoComplete="name"
                placeholder="Ej.: María G."
                className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                required
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Monto en USD</p>
                <span className="text-xs font-semibold text-slate-500">
                  Elige una opción
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SUGGESTED_AMOUNTS.map((amountCents) => {
                  const selected = !customMode && selectedCents === amountCents;
                  return (
                    <button
                      key={amountCents}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setCustomMode(false);
                        setSelectedCents(amountCents);
                      }}
                      className={`min-h-12 rounded-lg border px-2 text-base font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                        selected
                          ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {formatDonationUsd(amountCents)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={customMode}
                  onClick={() => setCustomMode(true)}
                  className={`min-h-12 rounded-lg border px-2 text-base font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                    customMode
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-100"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Otro
                </button>
              </div>

              {customMode && (
                <div className="mt-3">
                  <label htmlFor="donation-custom-amount" className="sr-only">
                    Monto personalizado en USD
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">
                      $
                    </span>
                    <input
                      id="donation-custom-amount"
                      type="number"
                      inputMode="decimal"
                      min={MIN_DONATION_CENTS / 100}
                      max={MAX_DONATION_CENTS / 100}
                      step="0.01"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                      placeholder="25.00"
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3.5 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                <ShieldCheck
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  strokeWidth={2.3}
                />
                <span>
                  Tu nombre y monto aparecerán en el muro de donaciones. El pago se
                  completa en PayPal.
                </span>
              </p>
            </div>

            {previewCents !== null && previewCents >= MIN_DONATION_CENTS && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950">
                <CheckCircle2
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-amber-600"
                  strokeWidth={2.3}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                    Aporte seleccionado
                  </p>
                  <p className="text-lg font-black leading-tight">
                    {formatDonationUsd(previewCents)}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p
                aria-live="polite"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            )}

            {successMessage && (
              <p
                aria-live="polite"
                className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
              >
                {successMessage}
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
            <button
              type="submit"
              disabled={submitting || Boolean(successMessage)}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-base font-black text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-60"
            >
              {submitting ? (
                <LoaderCircle
                  aria-hidden
                  className="h-5 w-5 animate-spin"
                  strokeWidth={2.3}
                />
              ) : (
                <ExternalLink aria-hidden className="h-5 w-5" strokeWidth={2.3} />
              )}
              {submitting ? "Registrando..." : "Continuar con PayPal"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function DonateNavButton({ variant, onAfterDonate }: DonateNavButtonProps) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  if (variant === "desktop") {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          aria-label="Donar ahora"
          title="Donar ahora"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 lg:gap-1.5 lg:px-3 lg:text-[13px]"
        >
          <HandCoins aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span className="sr-only lg:not-sr-only">Donar</span>
        </button>
        <DonateModal
          open={open}
          onClose={() => setOpen(false)}
          onSuccess={onAfterDonate ?? (() => {})}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 transition hover:bg-amber-100"
      >
        <HandCoins aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        Donar ahora
      </button>
      <DonateModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onAfterDonate ?? (() => {})}
      />
    </>
  );
}
