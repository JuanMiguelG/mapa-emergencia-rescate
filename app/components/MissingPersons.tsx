"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  DatabaseZap,
  ImageOff,
  MapPin,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  UserRoundSearch,
  X,
} from "lucide-react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";
import {
  trackMissingReportAfterNoResults,
  trackMissingReportStarted,
  trackPersonDetailViewed,
  trackPersonSearchResultsLoaded,
  trackPersonSearchStarted,
} from "./analytics";
import { timeAgo } from "@/lib/format";

interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  photoUrl: string | null;
  status?: "active" | "found";
  resolutionNote?: string | null;
  resolutionPhotoUrl?: string | null;
  resolvedAt?: number | null;
  createdAt: number;
}

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 48;
// Mínimo de caracteres para buscar (espeja MIN_SEARCH_LEN del servidor): por
// debajo, el índice trigram no aplica y haríamos un seq scan completo.
const MIN_SEARCH_LEN = 3;
const ADMIN_STORAGE_KEY = "emergency:adminToken";

function initialPersonSearch(): string {
  if (typeof window === "undefined") return "";
  const search = new URLSearchParams(window.location.search)
    .get("personSearch")
    ?.trim();
  return search && search.length >= MIN_SEARCH_LEN ? search : "";
}

function extractPhone(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? digits : null;
}

/** Ventana compacta de números de página alrededor de la página actual. */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export default function MissingPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalCapped, setTotalCapped] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialPersonSearch);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const lastTrackedSearchRef = useRef("");
  const lastTrackedResultsRef = useRef("");
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const requestIdRef = useRef(0);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const initialPageRef = useRef(true);

  // Debounce de la búsqueda: al cambiar el término volvemos a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || lastTrackedSearchRef.current === q) return;
    lastTrackedSearchRef.current = q;
    trackPersonSearchStarted("missing_persons", true);
  }, [debouncedQuery]);

  const load = useCallback(
    async (manual = false) => {
      const requestId = ++requestIdRef.current;
      setAdminToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
      if (manual) setRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        // Solo buscamos con MIN_SEARCH_LEN+ caracteres; por debajo, listado normal.
        if (debouncedQuery.trim().length >= MIN_SEARCH_LEN) {
          params.set("q", debouncedQuery.trim());
        }
        // El refresco manual evita la caché del CDN; el polling la aprovecha.
        if (manual) params.set("_", String(Date.now()));
        const res = await fetch(`/api/missing?${params.toString()}`, {
          cache: "no-cache",
        });
        if (!res.ok) return;
        const data = await res.json();
        // Ignorar respuestas de solicitudes anteriores (carrera con polling).
        if (requestId !== requestIdRef.current) return;
        const nextPeople = data.people ?? [];
        const nextTotal = data.total ?? 0;
        setPeople(nextPeople);
        setTotal(nextTotal);
        setTotalCapped(Boolean(data.totalCapped));
        setTotalPages(data.totalPages ?? 1);
        setPersistent(Boolean(data.persistent));
        setLastFetchAt(Date.now());
        if (debouncedQuery.trim()) {
          const resultsKey = `${debouncedQuery.trim()}:${page}:${nextTotal}`;
          if (lastTrackedResultsRef.current !== resultsKey) {
            lastTrackedResultsRef.current = resultsKey;
            trackPersonSearchResultsLoaded({
              source: "missing_persons",
              resultsCount: nextTotal,
              page,
            });
          }
        }
        // El servidor acota la página al rango válido (p. ej. tras borrados).
        if (typeof data.page === "number" && data.page !== page) {
          setPage(data.page);
        }
      } catch {
        // se reintenta en el siguiente ciclo
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [page, debouncedQuery],
  );

  // Re-render del indicador "actualizado hace X" cada 5 s sin pedir red.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  // Carga de la página actual + polling, pausado cuando la pestaña no es visible.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      load();
      interval = setInterval(() => load(), network.pollIntervalMs);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, network.pollIntervalMs]);

  // Al cambiar de página, hacemos scroll al inicio de la lista para mostrar
  // los nuevos resultados (no en la carga inicial).
  useEffect(() => {
    if (initialPageRef.current) {
      initialPageRef.current = false;
      return;
    }
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#reportar-desaparecido") {
        setShowForm(true);
        document
          .getElementById("desaparecidas")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const handleSubmit = useCallback(async (payload: MissingPersonPayload) => {
    const res = await fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo guardar el reporte.");
    }
    setShowForm(false);
    // El nuevo reporte es el más reciente: volvemos al inicio para verlo.
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!adminToken) return;
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((current) => (current?.id === id ? null : current));
      await fetch(`/api/missing/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      }).catch(() => null);
      // Resincronizamos para rellenar la página y corregir totales.
      load();
    },
    [adminToken, load],
  );

  const handleMarkFound = useCallback(
    async (id: string, payload: { note: string; photo: string | null }) => {
      const res = await fetch(`/api/missing/${id}/found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo marcar como localizada.");
      }
      // Quitamos de la lista pública y cerramos modal con feedback.
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected(null);
      load();
    },
    [load],
  );

  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const isSearching = debouncedQuery.trim().length >= MIN_SEARCH_LEN;
  // El usuario empezó a escribir pero aún no alcanza el mínimo para buscar.
  const queryTooShort =
    debouncedQuery.trim().length > 0 &&
    debouncedQuery.trim().length < MIN_SEARCH_LEN;

  return (
    <div ref={listTopRef} className="bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <UserRoundSearch
              aria-hidden
              className="h-5 w-5"
              strokeWidth={2.5}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-950 sm:text-xl">
                Personas desaparecidas
              </h2>
              <span
                className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800"
                aria-label={`${total} personas reportadas`}
                title="Total de personas reportadas"
              >
                {total} reportada{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Si reconoces a alguien o tienes información, abre su tarjeta y
              contacta a la persona indicada.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock
                  aria-hidden
                  className="h-3.5 w-3.5"
                  strokeWidth={2.4}
                />
                {lastFetchAt
                  ? `Actualizada ${timeAgo(lastFetchAt, now)}`
                  : "Actualizando…"}
              </span>
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw
                  aria-hidden
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  strokeWidth={2.4}
                />
                {refreshing ? "Cargando" : "Refrescar"}
              </button>
            </div>
          </div>
        </div>
        {!isSearching && (
          <button
            type="button"
            onClick={() => {
              trackMissingReportStarted("missing_persons_header");
              setShowForm(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus aria-hidden className="h-4 w-4" strokeWidth={2.6} />
            Reportar desaparecida
          </button>
        )}
      </div>

      <div className="relative mt-4">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2.4}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, zona o descripción…"
          aria-label="Buscar personas desaparecidas"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {queryTooShort && (
        <p className="mt-3 text-xs font-bold text-slate-500">
          Escribe al menos {MIN_SEARCH_LEN} letras para buscar.
        </p>
      )}

      {isSearching && (
        <p
          aria-live="polite"
          className="mt-3 text-xs font-bold text-slate-500"
        >
          {totalCapped ? `${total}+` : total} resultado
          {total === 1 ? "" : "s"} para “{debouncedQuery.trim()}”
        </p>
      )}

      {people.length === 0 ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-purple-700 shadow-sm">
            {isSearching ? (
              <SearchX aria-hidden className="h-5 w-5" strokeWidth={2.4} />
            ) : (
              <UserRoundSearch
                aria-hidden
                className="h-5 w-5"
                strokeWidth={2.4}
              />
            )}
          </span>
          <div>
            <p className="font-bold text-slate-950">
              {isSearching ? "Sin resultados" : "Sin personas reportadas"}
            </p>
            <p className="mt-1 leading-6">
              {isSearching
                ? `No se encontraron personas para “${debouncedQuery.trim()}”.`
                : "Cuando alguien reporte una persona desaparecida, aparecerá aquí con su foto, datos y contacto."}
            </p>
            {isSearching && (
              <button
                type="button"
                onClick={() => {
                  trackMissingReportAfterNoResults("missing_empty_state");
                  trackMissingReportStarted("missing_empty_state");
                  setShowForm(true);
                }}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <Plus aria-hidden className="h-4 w-4" strokeWidth={2.6} />
                Reportar desaparecida
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => {
              const phone = extractPhone(person.contact);
              return (
                <li
                  key={person.id}
                  className="relative overflow-hidden rounded-xl bg-white shadow-sm shadow-slate-200/80 transition hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => {
                      trackPersonDetailViewed({
                        status: person.status,
                        hasPhoto: Boolean(person.photoUrl),
                        source: "missing_card",
                      });
                      setSelected(person);
                    }}
                    aria-label={`Ver detalle de ${person.name}`}
                    className="flex w-full gap-3 p-3 text-left transition hover:bg-slate-50/70 active:bg-slate-100"
                  >
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photoUrl}
                        alt={`Foto de ${person.name}`}
                        loading="lazy"
                        className="h-24 w-24 shrink-0 rounded-lg bg-slate-100 object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-700">
                        <ImageOff
                          aria-hidden
                          className="h-6 w-6"
                          strokeWidth={2.4}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="pr-6 text-sm font-bold text-slate-950">
                        {person.name}
                        {person.age !== null && (
                          <span className="font-normal text-slate-500">
                            {" "}
                            · {person.age} años
                          </span>
                        )}
                      </p>
                      {person.lastSeen && (
                        <p className="mt-1 inline-flex items-start gap-1.5 text-xs text-slate-600">
                          <MapPin
                            aria-hidden
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600"
                            strokeWidth={2.4}
                          />
                          <span>{person.lastSeen}</span>
                        </p>
                      )}
                      {person.description && (
                        <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                          {person.description}
                        </p>
                      )}
                      {person.contact &&
                        (phone ? (
                          <a
                            href={`tel:${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700 transition hover:bg-red-100"
                          >
                            <PhoneCall
                              aria-hidden
                              className="h-3.5 w-3.5"
                              strokeWidth={2.4}
                            />
                            {person.contact}
                          </a>
                        ) : (
                          <p className="mt-2 text-xs font-bold text-slate-700">
                            {person.contact}
                          </p>
                        ))}
                      <p className="mt-2 text-[11px] font-bold text-purple-700">
                        Toca para ver más
                      </p>
                    </div>
                  </button>
                  {adminToken && (
                    <button
                      type="button"
                      onClick={() => handleDelete(person.id)}
                      aria-label="Eliminar reporte"
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-slate-400 shadow-sm backdrop-blur transition hover:bg-red-50 hover:text-red-600"
                    >
                      <X aria-hidden className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
              aria-label="Paginación de personas desaparecidas"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                ← Anterior
              </button>
              {pages[0] > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    1
                  </button>
                  {pages[0] > 2 && (
                    <span className="px-1 text-slate-400">…</span>
                  )}
                </>
              )}
              {pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={
                    p === page
                      ? "rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-bold text-white"
                      : "rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  }
                >
                  {p}
                </button>
              ))}
              {pages[pages.length - 1] < totalPages && (
                <>
                  {pages[pages.length - 1] < totalPages - 1 && (
                    <span className="px-1 text-slate-400">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </nav>
          )}
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Página {page} de {totalPages}
          </p>
        </>
      )}

      {!persistent && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-sm shadow-amber-100/80">
          <DatabaseZap
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
            strokeWidth={2.4}
          />
          <span>
            Modo demo: los reportes no se están guardando de forma permanente.
          </span>
        </p>
      )}

      {showForm && (
        <MissingPersonForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {selected && (
        <MissingPersonDetail
          person={selected}
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          onMarkFound={(payload) => handleMarkFound(selected.id, payload)}
        />
      )}
    </div>
  );
}
