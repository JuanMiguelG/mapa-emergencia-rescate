import dynamic from "next/dynamic";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheck,
  Home as HomeIcon,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Search,
  Tags,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import EmergencyApp from "./components/EmergencyApp";
import {
  HeroDesktopNav,
  HeroMobileCta,
  MobileTopHeader,
  MobileStickyNav,
} from "./components/SectionNav";
import ReportStepsCarousel from "./components/ReportStepsCarousel";
import SiteFooter from "./components/SiteFooter";
import { REPORT_TYPES, type ReportType } from "@/lib/types";
import { CONTACT_EMAIL, contactMailto } from "@/lib/site";

const MissingPersonsCarousel = dynamic(
  () => import("./components/MissingPersonsCarousel"),
  {
    loading: () => (
      <section className="border-b border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        Cargando personas desaparecidas…
      </section>
    ),
  },
);

const DonationsTicker = dynamic(() => import("./components/DonationsTicker"), {
  loading: () => null,
});

const PersonsTabs = dynamic(() => import("./components/PersonsTabs"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 pb-14 text-sm text-slate-500">
      Cargando personas…
    </section>
  ),
});

const REPORT_TYPE_UI: Record<
  ReportType,
  {
    Icon: LucideIcon;
    iconClassName: string;
    iconWrapClassName: string;
    cardClassName: string;
  }
> = {
  critical: {
    Icon: CircleAlert,
    iconClassName: "text-red-700",
    iconWrapClassName: "bg-red-50 ring-red-100",
    cardClassName: "hover:bg-red-50/70",
  },
  supplies: {
    Icon: Package,
    iconClassName: "text-amber-700",
    iconWrapClassName: "bg-amber-50 ring-amber-100",
    cardClassName: "hover:bg-amber-50/70",
  },
  shelter: {
    Icon: HomeIcon,
    iconClassName: "text-emerald-700",
    iconWrapClassName: "bg-emerald-50 ring-emerald-100",
    cardClassName: "hover:bg-emerald-50/70",
  },
  nopower: {
    Icon: Zap,
    iconClassName: "text-sky-700",
    iconWrapClassName: "bg-sky-50 ring-sky-100",
    cardClassName: "hover:bg-sky-50/70",
  },
  missing: {
    Icon: Search,
    iconClassName: "text-purple-700",
    iconWrapClassName: "bg-purple-50 ring-purple-100",
    cardClassName: "hover:bg-purple-50/70",
  },
  building: {
    Icon: Building2,
    iconClassName: "text-orange-800",
    iconWrapClassName: "bg-orange-50 ring-orange-100",
    cardClassName: "hover:bg-orange-50/70",
  },
};

export default function Home() {
  return (
    <>
      <main id="main" className="flex-1">
        <MobileTopHeader />
        <header className="relative mt-4 overflow-hidden border-b border-slate-800 md:mt-0 md:pt-16">
          <div
            className="absolute inset-0 bg-[url('/images/hero-terremoto-venezuela.png')] bg-cover bg-center bg-no-repeat"
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/65 sm:bg-black/60" aria-hidden />
          <HeroDesktopNav />
          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 pb-10 pt-14 text-center sm:min-h-[22rem] sm:py-14 md:min-h-[23rem] md:py-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-600/90 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
              <Megaphone aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Plataforma de ayuda humanitaria
            </span>
            <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:mt-4 sm:text-4xl md:text-5xl">
              Mapa de Emergencia y Rescate: Terremoto en Venezuela
            </h1>
            <h2 className="mx-auto mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-lg">
              Reporte ciudadano en tiempo real para coordinar rescates,
              identificar daños estructurales y organizar la entrega de ayuda
              humanitaria.
            </h2>
            <a
              href={contactMailto()}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Mail aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              {CONTACT_EMAIL}
            </a>
            <HeroMobileCta />
          </div>
          <DonationsTicker variant="hero" />
        </header>

        <MobileStickyNav />

        <MissingPersonsCarousel />

        <section id="tutorial" className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-100">
              <CircleAlert aria-hidden className="h-3.5 w-3.5" strokeWidth={2.3} />
              Reporte ciudadano
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              ¿Cómo reportar una emergencia o solicitar ayuda?
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Sigue estos 4 pasos. Solo te tomará unos segundos y tu reporte
              ayudará a los equipos de rescate en tiempo real.
            </p>
          </div>
          <a
            href="#mapa"
            className="hidden min-h-11 shrink-0 items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:inline-flex"
          >
            Ir al mapa
            <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2.4} />
          </a>
        </div>

        <div className="mt-6">
          <ReportStepsCarousel />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-md shadow-slate-200/80">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="inline-flex items-center gap-2 text-base font-bold text-slate-950">
                <Tags aria-hidden className="h-4 w-4 text-amber-600" strokeWidth={2.4} />
                Tipos de marcador disponibles
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Elige el que mejor describa la situación. Cada color e icono se
                verá en el mapa.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              <MapPin aria-hidden className="h-3.5 w-3.5 text-red-600" strokeWidth={2.4} />
              6 categorías
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => {
              const meta = REPORT_TYPES[type];
              const item = REPORT_TYPE_UI[type];
              return (
                <div
                  key={type}
                  className={`flex min-h-16 items-center gap-3 rounded-xl bg-slate-50/70 p-3 transition ${item.cardClassName}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${item.iconWrapClassName}`}
                    aria-hidden
                  >
                    <item.Icon className={`h-5 w-5 ${item.iconClassName}`} strokeWidth={2.4} />
                  </span>
                  <span className="text-sm font-bold leading-tight text-slate-800">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm shadow-emerald-100/80">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-950">
              <CircleCheck aria-hidden className="h-4 w-4 text-emerald-700" strokeWidth={2.4} />
              Antes de publicar
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-emerald-900">
              <li>Asegúrate de que la ubicación esté correcta.</li>
              <li>Indica claramente qué tipo de ayuda se necesita.</li>
              <li>Si tienes una foto del lugar, súbela.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 shadow-sm shadow-amber-100/80">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
              <TriangleAlert aria-hidden className="h-4 w-4 text-amber-700" strokeWidth={2.4} />
              Evita confundir el mapa
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
              <li>No envíes reportes falsos ni duplicados.</li>
              <li>Si ya hay un punto similar cerca, no lo repitas.</li>
              <li>Avisa cuando una emergencia ya fue atendida.</li>
            </ul>
          </div>
        </div>
        </section>

        <EmergencyApp />

        <PersonsTabs />
      </main>

      <SiteFooter />
    </>
  );
}
