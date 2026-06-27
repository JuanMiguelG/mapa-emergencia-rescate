"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  ChevronDown,
  CircleCheck,
  Globe2,
  HandHeart,
  HeartHandshake,
  Link2,
  LoaderCircle,
  Menu,
  MapPin,
  MapPinned,
  MessageCircle,
  PhoneCall,
  Search,
  Share2,
  UserSearch,
  X,
} from "lucide-react";
import TranslateWidget from "./TranslateWidget";
import { DonateNavButton } from "./DonateButton";
import {
  DESKTOP_NAV_GROUPS,
  MOBILE_BAR_LINKS,
  PRIMARY_MAP_LINK,
  SECTION_LINKS,
  linksForDesktopGroup,
  type DesktopNavGroup,
  type SectionLink,
} from "@/lib/section-nav";
import { psychologyHelpUrl } from "@/lib/site";

const SHARE_TEXT =
  "Mapa de Emergencia y Rescate: Terremoto en Venezuela. Reporta y consulta el estado de las zonas en tiempo real.";

interface NavPlaceResult {
  lat: number;
  lng: number;
  label: string;
}

interface NavPersonResult {
  id: string;
  name: string;
  age: number | null;
  lastSeen: string;
  status?: "active" | "found";
}

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

/**
 * Devuelve el href final según el contexto:
 * - Ancla en el home: hash literal
 * - Ancla fuera del home: `/#xxx` para volver y posicionar
 * - Ruta absoluta: tal cual
 */
function resolveHref(href: string, onHome: boolean): string {
  if (!isAnchor(href)) return href;
  return onHome ? href : `/${href}`;
}

function replaceHashAndNotify(id: string) {
  const oldUrl = window.location.href;
  window.history.replaceState(null, "", `#${id}`);
  const newUrl = window.location.href;
  try {
    window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL: oldUrl, newURL: newUrl }));
  } catch {
    window.dispatchEvent(new Event("hashchange"));
  }
}

/** Navegación por ancla compatible con iOS Safari y barra inferior fija. */
function scrollToSection(href: string) {
  const id = href.replace(/^#/, "");
  if (!id) return;

  const targetId = id === "localizados" ? "desaparecidas" : id;
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    replaceHashAndNotify(id);
    return;
  }

  if (window.location.hash === `#${id}`) {
    window.dispatchEvent(new Event("hashchange"));
  } else {
    window.location.hash = id;
  }
}

function useIosScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    document.body.classList.add("mobile-sheet-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.classList.remove("mobile-sheet-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function usePeopleTotals() {
  const [missing, setMissing] = useState<number | null>(null);
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [activeRes, foundRes] = await Promise.all([
          fetch("/api/missing?pageSize=1", { cache: "no-store" }),
          fetch("/api/missing?status=found&pageSize=1", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (!cancelled) setMissing(data.total ?? 0);
        }
        if (foundRes.ok) {
          const data = await foundRes.json();
          if (!cancelled) setFound(data.total ?? 0);
        }
      } catch {
        // se reintenta en el próximo ciclo
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { missing, found };
}

function compactBadge(value: string): string {
  const digits = value.replace(/\D/g, "");
  const n = Number(digits);
  if (Number.isNaN(n) || n < 1000) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${Math.round(n / 1000)}k`;
}

function badgeValue(
  link: SectionLink,
  missing: number | null,
  found: number | null,
): string | null {
  if (link.badge === "missing" && missing !== null) {
    return missing.toLocaleString("es-VE");
  }
  if (link.badge === "found" && found !== null) {
    return found.toLocaleString("es-VE");
  }
  return null;
}

const DESKTOP_CHIP: Record<NonNullable<SectionLink["tone"]>, string> = {
  primary: "border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700",
  purple:
    "border-transparent bg-white/70 text-purple-900 hover:bg-purple-50",
  emerald:
    "border-transparent bg-white/70 text-emerald-900 hover:bg-emerald-50",
  sky: "border-transparent bg-white/70 text-sky-900 hover:bg-sky-50",
  default:
    "border-transparent bg-white/70 text-slate-800 hover:bg-slate-100",
};

const DESKTOP_ICON = {
  [PRIMARY_MAP_LINK.href]: MapPinned,
  "#desaparecidas": Search,
  "#localizados": CircleCheck,
  "/hospitales": HeartHandshake,
  "/telefonos": PhoneCall,
  "/guia": HeartHandshake,
  "/acopio": HandHeart,
  "/apoyo-global": Globe2,
  "/chat": MessageCircle,
};

const DESKTOP_ICON_COLOR: Record<string, string> = {
  [PRIMARY_MAP_LINK.href]: "text-red-600",
  "#desaparecidas": "text-purple-700",
  "#localizados": "text-emerald-700",
  "/hospitales": "text-rose-700",
  "/telefonos": "text-red-700",
  "/guia": "text-sky-700",
  "/acopio": "text-emerald-700",
  "/apoyo-global": "text-sky-700",
  "/chat": "text-violet-700",
};

const DESKTOP_GROUP_ICON: Record<
  DesktopNavGroup["id"],
  typeof Search
> = {
  personas: Search,
  salud: HeartHandshake,
  recursos: Globe2,
};

function groupBadge(
  group: DesktopNavGroup,
  missing: number | null,
  found: number | null,
): string | null {
  if (group.id === "personas") {
    if (missing !== null) return missing.toLocaleString("es-VE");
    if (found !== null) return found.toLocaleString("es-VE");
  }
  return null;
}

function NavDropdownItem({
  link,
  missing,
  found,
  onHome,
}: {
  link: SectionLink;
  missing: number | null;
  found: number | null;
  onHome: boolean;
}) {
  const badge = badgeValue(link, missing, found);
  const Icon = DESKTOP_ICON[link.href as keyof typeof DESKTOP_ICON] ?? Link2;

  const row = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
        <Icon
          aria-hidden
          className={`h-4 w-4 ${DESKTOP_ICON_COLOR[link.href] ?? "text-slate-700"}`}
          strokeWidth={2.2}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {link.label}
        </span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {compactBadge(badge)}
        </span>
      ) : null}
    </>
  );

  const itemClassName =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50";

  if (isAnchor(link.href)) {
    return (
      <a
        href={resolveHref(link.href, onHome)}
        onClick={
          onHome
            ? (e) => {
                e.preventDefault();
                scrollToSection(link.href);
              }
            : undefined
        }
        title={link.label}
        className={itemClassName}
      >
        {row}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      prefetch={false}
      title={link.label}
      className={itemClassName}
    >
      {row}
    </Link>
  );
}

function NavGroup({
  group,
  missing,
  found,
  onHome,
}: {
  group: DesktopNavGroup;
  missing: number | null;
  found: number | null;
  onHome: boolean;
}) {
  const links = linksForDesktopGroup(group);
  const tone = group.tone ?? "default";
  const GroupIcon = DESKTOP_GROUP_ICON[group.id];
  const badge = groupBadge(group, missing, found);

  return (
    <div className="group/nav relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-label={`${group.label}: ver secciones`}
        className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 lg:gap-1.5 lg:px-3 lg:text-[13px] ${DESKTOP_CHIP[tone]}`}
      >
        <GroupIcon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="hidden lg:inline xl:hidden">{group.shortLabel}</span>
        <span className="hidden xl:inline">{group.label}</span>
        <span className="lg:hidden">{group.shortLabel.slice(0, 4)}</span>
        {badge && (
          <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold leading-none">
            {compactBadge(badge)}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 opacity-70 transition group-hover/nav:rotate-180"
          strokeWidth={2.5}
        />
      </button>

      <div
        role="menu"
        className="invisible absolute left-1/2 top-full z-[1900] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 pt-1.5 opacity-0 transition-all duration-150 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100"
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {group.label}
          </p>
          {links.map((link) => (
            <NavDropdownItem
              key={link.href}
              link={link}
              missing={missing}
              found={found}
              onHome={onHome}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopNavSearch() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<NavPlaceResult[]>([]);
  const [people, setPeople] = useState<NavPersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setError("Escribe al menos 3 letras.");
      setOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      const peopleParams = new URLSearchParams({
        status: "all",
        page: "1",
        pageSize: "4",
        q,
      });
      const [placeResult, peopleResult] = await Promise.allSettled([
        fetch(`/api/geocode?${params.toString()}`),
        fetch(`/api/missing?${peopleParams.toString()}`, { cache: "no-cache" }),
      ]);

      let nextPlaces: NavPlaceResult[] = [];
      let nextPeople: NavPersonResult[] = [];

      if (placeResult.status === "fulfilled" && placeResult.value.ok) {
        const data = await placeResult.value.json().catch(() => ({}));
        nextPlaces = (data.results ?? []).slice(0, 3);
      }

      if (peopleResult.status === "fulfilled" && peopleResult.value.ok) {
        const data = await peopleResult.value.json().catch(() => ({}));
        nextPeople = (data.people ?? []).slice(0, 4);
      }

      setPlaces(nextPlaces);
      setPeople(nextPeople);
      setOpen(true);
      if (nextPlaces.length === 0 && nextPeople.length === 0) {
        setError("No encontré lugares ni personas con esa búsqueda.");
      }
    } catch {
      setError("No se pudo buscar. Intenta de nuevo.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const goToPlace = (place: NavPlaceResult) => {
    window.location.assign(`/?lat=${place.lat}&lng=${place.lng}#mapa`);
  };

  const goToPerson = (person: NavPersonResult) => {
    const hash = person.status === "found" ? "localizados" : "desaparecidas";
    const params = new URLSearchParams({ personSearch: person.name || query.trim() });
    window.location.assign(`/?${params.toString()}#${hash}`);
  };

  return (
    <div
      ref={rootRef}
      className="relative ml-auto hidden min-w-[17rem] flex-[0_1_24rem] lg:block"
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-800 shadow-sm transition focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100"
      >
        <Search
          aria-hidden
          className="h-4 w-4 shrink-0 text-red-600"
          strokeWidth={2.3}
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => (people.length || places.length || error) && setOpen(true)}
          placeholder="Zona, dirección o nombre"
          aria-label="Buscar en el mapa o personas"
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] font-medium outline-none placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPlaces([]);
              setPeople([]);
              setError(null);
              setOpen(false);
            }}
            aria-label="Limpiar búsqueda"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        )}
        <button
          type="submit"
          disabled={loading || query.trim().length === 0}
          aria-label="Buscar"
          title="Buscar"
          className="grid h-8 w-8 shrink-0 place-items-center text-slate-500 transition hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:text-slate-300"
        >
          {loading ? (
            <LoaderCircle
              aria-hidden
              className="h-4 w-4 animate-spin"
              strokeWidth={2.4}
            />
          ) : (
            <Search aria-hidden className="h-4 w-4" strokeWidth={2.4} />
          )}
        </button>
      </form>

      {open && (
        <div className="absolute right-0 top-full z-[1950] mt-2 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5">
          {error && (
            <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {error}
            </p>
          )}

          {people.length > 0 && (
            <div className="p-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Personas
              </p>
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => goToPerson(person)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-purple-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-700">
                    <UserSearch aria-hidden className="h-4 w-4" strokeWidth={2.3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {person.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {person.status === "found" ? "Localizada" : "Desaparecida"}
                      {person.lastSeen ? ` · ${person.lastSeen}` : ""}
                    </span>
                  </span>
                  {person.status === "found" && (
                    <CircleCheck
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      strokeWidth={2.3}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {places.length > 0 && (
            <div className="border-t border-slate-100 p-2">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Lugares en Venezuela
              </p>
              {places.map((place, index) => (
                <button
                  key={`${place.lat}-${place.lng}-${index}`}
                  type="button"
                  onClick={() => goToPlace(place)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-red-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
                    <MapPin aria-hidden className="h-4 w-4" strokeWidth={2.3} />
                  </span>
                  <span className="line-clamp-2 text-sm font-semibold text-slate-800">
                    {place.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Menú superior de secciones — solo desktop/tablet. */
export function HeroDesktopNav() {
  const { missing, found } = usePeopleTotals();
  const pathname = usePathname();
  const onHome = pathname === "/";

  const primaryHref = resolveHref(PRIMARY_MAP_LINK.href, onHome);

  return (
    // JMG: los cambios visuales de esta barra estan documentados en /jmg_cambios.md.
    <nav
      aria-label="Secciones principales"
      className="fixed inset-x-0 top-0 z-[1800] hidden w-full border-b border-slate-200 bg-white px-3 py-2 shadow-sm md:block"
    >
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-start gap-1 lg:gap-1.5">
        <a
          href={primaryHref}
          onClick={
            onHome
              ? (e) => {
                  e.preventDefault();
                  scrollToSection(PRIMARY_MAP_LINK.href);
                }
              : undefined
          }
          title={PRIMARY_MAP_LINK.label}
          aria-label={PRIMARY_MAP_LINK.label}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-red-600 px-2.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 lg:gap-1.5 lg:px-3 lg:text-[13px]"
        >
          <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.2} />
          {PRIMARY_MAP_LINK.shortLabel}
        </a>

        <div className="flex shrink-0 flex-nowrap items-center justify-start gap-1 lg:gap-1.5">
          {DESKTOP_NAV_GROUPS.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              missing={missing}
              found={found}
              onHome={onHome}
            />
          ))}
          <PsychologyHelpNavButton />
          <DonateNavButton variant="desktop" />
        </div>

        <DesktopNavSearch />
      </div>
    </nav>
  );
}

/** Header superior solo móvil: reemplaza los flotantes de idioma/apoyo. */
export function MobileTopHeader() {
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  useEffect(() => {
    document.body.classList.add("has-mobile-header");
    return () => document.body.classList.remove("has-mobile-header");
  }, []);

  const trackPsychologyClick = useCallback(() => {
    fetch("/api/stats/psychology-help", {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return (
    <header
      aria-label="Accesos rápidos móviles"
      className="fixed inset-x-0 top-0 z-[1845] border-b border-slate-200 bg-white pb-2 pl-3 pr-14 pt-[calc(0.35rem+env(safe-area-inset-top))] shadow-sm md:hidden"
    >
      <div className="flex min-h-12 w-full items-center justify-between gap-2">
        <Link
          href="/#mapa"
          prefetch={false}
          className="inline-flex min-w-0 items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-black text-red-700"
        >
          <MapPinned aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">Mapa</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <TranslateWidget />
          <a
            href={psychologyUrl}
            target={psychologyIsExternal ? "_blank" : undefined}
            rel={psychologyIsExternal ? "noopener noreferrer" : undefined}
            onClick={trackPsychologyClick}
            aria-label="Apoyo psicológico"
            title="Apoyo psicológico"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-violet-600/20 transition active:bg-violet-700"
          >
            <Brain aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            <span className="hidden min-[390px]:inline">Apoyo</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function PsychologyHelpNavButton() {
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  const trackPsychologyClick = useCallback(() => {
    fetch("/api/stats/psychology-help", {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return (
    <a
      href={psychologyUrl}
      target={psychologyIsExternal ? "_blank" : undefined}
      rel={psychologyIsExternal ? "noopener noreferrer" : undefined}
      onClick={trackPsychologyClick}
      title="Apoyo psicológico"
      aria-label="Apoyo psicológico"
      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-transparent bg-white/70 px-2.5 py-2 text-xs font-semibold text-violet-900 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 lg:gap-1.5 lg:px-3 lg:text-[13px]"
    >
      <Brain aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span className="lg:hidden">Psi.</span>
      <span className="hidden lg:inline xl:hidden">Psico</span>
      <span className="hidden xl:inline">Apoyo psicológico</span>
    </a>
  );
}

function ShareNavButton({
  variant,
  onAfterShare,
}: {
  variant: "desktop" | "sheet";
  onAfterShare?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    onAfterShare?.();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mapa de Emergencia y Rescate",
          text: SHARE_TEXT,
          url,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin permisos */
    }
  }, [onAfterShare]);

  if (variant === "desktop") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={copied ? "Enlace copiado" : "Compartir mapa"}
        title={copied ? "Enlace copiado" : "Compartir mapa"}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:gap-1.5 lg:px-2 lg:text-[13px] xl:px-2.5"
      >
        <Share2 aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        <span className="sr-only lg:not-sr-only">
          {copied ? "Copiado" : "Compartir"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
    >
      <Link2 aria-hidden className="h-4 w-4" strokeWidth={2.3} />
      {copied ? "Enlace copiado" : "Compartir mapa"}
    </button>
  );
}

/** Barra inferior fija en móvil + hoja de más secciones. */
export function MobileStickyNav() {
  const { missing, found } = usePeopleTotals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  useIosScrollLock(sheetOpen);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const sheetLinks = [PRIMARY_MAP_LINK, ...SECTION_LINKS];
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, link: SectionLink) => {
      if (isAnchor(link.href) && onHome) {
        e.preventDefault();
        scrollToSection(link.href);
      }
    },
    [onHome],
  );

  const handleSheetClick = useCallback(
    (link: SectionLink) => {
      setSheetOpen(false);
      if (isAnchor(link.href) && onHome) {
        window.setTimeout(() => scrollToSection(link.href), 50);
        return;
      }
      const href = resolveHref(link.href, onHome);
      if (href.startsWith("#")) {
        window.location.href = `/${href}`;
        return;
      }
      router.push(href);
    },
    [onHome, router],
  );

  const handlePsychologySheetClick = useCallback(() => {
    setSheetOpen(false);
    fetch("/api/stats/psychology-help", {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return (
    <>
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-[1850] border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-sm md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {MOBILE_BAR_LINKS.map((link) => {
            const badge = badgeValue(link, missing, found);
            const Icon =
              DESKTOP_ICON[link.href as keyof typeof DESKTOP_ICON] ?? Link2;
            return (
              <a
                key={link.href}
                href={resolveHref(link.href, onHome)}
                onClick={(e) => handleBarClick(e, link)}
                className="flex min-h-12 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-bold text-slate-700 transition active:bg-slate-100"
              >
                <span className="relative grid h-7 w-7 place-items-center rounded-full bg-slate-50" aria-hidden>
                  <Icon
                    className={`h-[18px] w-[18px] ${
                      DESKTOP_ICON_COLOR[link.href] ?? "text-slate-600"
                    }`}
                    strokeWidth={2.4}
                  />
                  {badge && (
                    <span className="absolute -right-1.5 -top-1 rounded-full bg-red-600 px-1 text-[8px] font-bold leading-tight text-white">
                      {compactBadge(badge)}
                    </span>
                  )}
                </span>
                <span className="truncate">{link.shortLabel}</span>
              </a>
            );
          })}
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="mobile-section-sheet"
            onClick={() => setSheetOpen((open) => !open)}
            className="flex min-h-12 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[9px] font-bold text-slate-700 transition active:bg-slate-100"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-50 text-slate-700" aria-hidden>
              {sheetOpen ? (
                <X className="h-[18px] w-[18px]" strokeWidth={2.4} />
              ) : (
                <Menu className="h-[18px] w-[18px]" strokeWidth={2.4} />
              )}
            </span>
            {sheetOpen ? "Cerrar" : "Más"}
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú de secciones"
            className="fixed inset-0 z-[1940] touch-manipulation bg-slate-950/50 backdrop-blur-[2px] md:hidden"
            onClick={closeSheet}
          />

          <div
            id="mobile-section-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            className="fixed inset-y-0 left-0 z-[1950] flex w-[min(86vw,22rem)] max-w-sm flex-col bg-white shadow-2xl md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Menú principal
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Accesos rápidos de ayuda
                </p>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 touch-manipulation place-items-center rounded-full bg-slate-100 text-slate-600 transition active:bg-slate-200"
              >
                <X aria-hidden className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
              {sheetLinks.map((link) => {
                const badge = badgeValue(link, missing, found);
                const Icon =
                  DESKTOP_ICON[link.href as keyof typeof DESKTOP_ICON] ?? Link2;
                return (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => handleSheetClick(link)}
                      className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-bold text-slate-800 transition active:bg-slate-100"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50" aria-hidden>
                        <Icon
                          className={`h-[18px] w-[18px] ${
                            DESKTOP_ICON_COLOR[link.href] ?? "text-slate-600"
                          }`}
                          strokeWidth={2.4}
                        />
                      </span>
                      <span className="flex-1">{link.label}</span>
                      {badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              <li className="pt-1">
                <a
                  href={psychologyUrl}
                  target={psychologyIsExternal ? "_blank" : undefined}
                  rel={psychologyIsExternal ? "noopener noreferrer" : undefined}
                  onClick={handlePsychologySheetClick}
                  className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-bold text-violet-900 transition active:bg-violet-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700">
                    <Brain aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.4} />
                  </span>
                  <span className="flex-1">Apoyo psicológico</span>
                </a>
              </li>
              <li className="pt-2">
                <DonateNavButton variant="sheet" onAfterDonate={closeSheet} />
              </li>
              <li className="pt-2">
                <ShareNavButton variant="sheet" onAfterShare={closeSheet} />
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

/** CTA principal visible solo en móvil dentro del hero. */
export function HeroMobileCta() {
  return (
    <a
      href={PRIMARY_MAP_LINK.href}
      onClick={(e) => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          e.preventDefault();
          scrollToSection(PRIMARY_MAP_LINK.href);
        }
      }}
      className="mt-5 inline-flex min-h-12 w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-500 md:hidden"
    >
      <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.3} />
      {PRIMARY_MAP_LINK.label}
    </a>
  );
}

/** Mini hero móvil para sub-páginas: enlace de regreso al mapa principal. */
export function MobileBackToMapCta() {
  return (
    <Link
      href="/#mapa"
      prefetch={false}
      className="mt-4 inline-flex min-h-11 w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 md:hidden"
    >
      <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.2} />
      Volver al mapa
    </Link>
  );
}
