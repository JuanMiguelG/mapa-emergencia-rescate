"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";
import MissingPersons from "./MissingPersons";
import FoundPersons from "./FoundPersons";

type Tab = "desaparecidas" | "localizados";

function tabFromHash(hash: string): Tab | null {
  if (hash === "desaparecidas" || hash === "reportar-desaparecido") {
    return "desaparecidas";
  }
  if (hash === "localizados") return "localizados";
  return null;
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

export default function PersonsTabs() {
  const [active, setActive] = useState<Tab>("desaparecidas");
  const { missing, found } = usePeopleTotals();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const nextTab = tabFromHash(hash);
    if (nextTab) setActive(nextTab);
  }, []);

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    const nextTab = tabFromHash(hash);
    if (nextTab) setActive(nextTab);
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleHashChange]);

  const tabs: {
    id: Tab;
    label: string;
    shortLabel: string;
    Icon: LucideIcon;
    count: number | null;
    activeColor: string;
    iconColor: string;
    badgeColor: string;
  }[] = [
    {
      id: "desaparecidas",
      label: "Personas desaparecidas",
      shortLabel: "Desaparecidas",
      Icon: UserRoundSearch,
      count: missing,
      activeColor: "bg-white text-purple-800 shadow-sm",
      iconColor: "text-purple-700",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "localizados",
      label: "Personas localizadas a salvo",
      shortLabel: "Localizados",
      Icon: CircleCheck,
      count: found,
      activeColor: "bg-white text-emerald-800 shadow-sm",
      iconColor: "text-emerald-700",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <section id="desaparecidas" className="mx-auto w-full max-w-7xl px-4 pb-14">
      <span id="localizados" className="sr-only" aria-hidden />
      <div className="rounded-2xl bg-white p-3 shadow-md shadow-slate-200/80 sm:p-4">
        <div className="grid gap-2 rounded-xl bg-slate-50 p-1 sm:grid-cols-2">
          {tabs.map((tab) => {
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActive(tab.id);
                  window.history.replaceState(null, "", `#${tab.id}`);
                }}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  active === tab.id
                    ? tab.activeColor
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                <Icon
                  aria-hidden
                  className={`h-4 w-4 shrink-0 ${
                    active === tab.id ? tab.iconColor : "text-slate-400"
                  }`}
                  strokeWidth={2.4}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.count !== null && (
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      active === tab.id
                        ? tab.badgeColor
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          {active === "desaparecidas" ? <MissingPersons /> : <FoundPersons />}
        </div>
      </div>
    </section>
  );
}
