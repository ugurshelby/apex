import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { latinUpper } from '@/lib/i18n/caps';
import { raceName } from '@/lib/i18n/format';
import type { TitleDecision } from '@/lib/data/pulse';
import type { Age } from '@/lib/pulse/championship';

/** Bars start at this age so the few years between the youngest champions stay visible. */
const BAR_BASE_DAYS = 18 * 365;

function ageDays(a: Age): number {
  return a.years * 365 + a.days;
}

/**
 * Champion mode band (Faz 21.0): once the drivers' title is mathematically
 * settled, the home page and the season page lead with the champion until the
 * season ends. Team colour, the age on the deciding day and how it ranks
 * against every champion since 1950; the numbers are computed, never written.
 */
export function ChampionBand({ decision, teamColor }: { decision: TitleDecision; teamColor: string }) {
  const t = useTranslations('ui.pulse');
  const locale = useLocale();
  const { age, youngest } = decision;
  const first = decision.driverName.slice(0, Math.max(0, decision.driverName.length - decision.familyName.length)).trim();
  const ageText = age ? t('age', { years: age.years, days: age.days }) : null;
  const rankText = youngest
    ? youngest.rank === 1
      ? t('youngestEver')
      : youngest.rank <= 5
        ? t('youngestRank', { rank: youngest.rank })
        : null
    : null;
  const top = youngest?.top ?? [];
  const maxDays = Math.max(...top.map((c) => ageDays(c.age)), BAR_BASE_DAYS + 1);
  const prev = youngest?.rank === 1 ? youngest.previousYoungest : null;

  return (
    <section
      aria-label={t('championKicker', { season: decision.season })}
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-white/[0.08] bg-surface shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 120% at 15% 50%, color-mix(in srgb, ${teamColor} 30%, transparent), transparent 70%)` }}
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: teamColor }} />

      <div className="relative grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-10 md:p-8">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: teamColor }} />
            {t('championKicker', { season: decision.season })}
          </span>

          <Link
            href={`/drivers/${decision.driverId}`}
            className="flex w-fit max-w-full items-end gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {decision.permanentNumber ? (
              <span className="hero-number text-6xl italic leading-[0.8] md:text-7xl" style={{ color: teamColor }} aria-hidden>
                {decision.permanentNumber}
              </span>
            ) : null}
            <span className="min-w-0 pb-0.5">
              {first ? <span lang="en" className="label-caps block text-text-mid">{first}</span> : null}
              <span
                lang="en"
                className="block font-condensed text-[clamp(2rem,9vw,3.75rem)] font-bold uppercase italic leading-none tracking-tight text-white [overflow-wrap:anywhere] group-hover:text-text-hi"
                style={{ fontFamily: 'var(--font-condensed)' }}
              >
                {latinUpper(decision.familyName)}
              </span>
            </span>
          </Link>

          {ageText ? (
            <p className="font-condensed text-xl font-bold uppercase italic leading-tight text-text-hi md:text-2xl" style={{ fontFamily: 'var(--font-condensed)' }}>
              <span style={{ color: teamColor }}>{ageText}</span>
              {rankText ? <span className="text-text-hi"> · {rankText}</span> : null}
            </p>
          ) : null}

          <div className="flex flex-col gap-1 text-sm leading-snug text-text-mid">
            <span lang="en" className="font-mono text-xs uppercase tracking-wider text-text">{decision.constructorName}</span>
            <span>{t('decidedAt', { race: raceName(decision.raceName, locale) })}</span>
            <span className="data-tabular">
              {t('maths', {
                points: decision.points,
                rival: decision.rivalName,
                rivalPoints: decision.rivalPoints,
                races: decision.racesLeft,
                left: decision.pointsLeft,
              })}
            </span>
            {prev ? (
              <span>{t('previousRecord', { name: prev.name, years: prev.age.years, days: prev.age.days, season: prev.season })}</span>
            ) : null}
          </div>
        </div>

        {top.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-3">
            <span className="label-caps text-text-mid">{t('youngestTitle')}</span>
            <ol className="flex flex-col gap-2">
              {top.map((c, i) => {
                const width = Math.max(8, ((ageDays(c.age) - BAR_BASE_DAYS) / (maxDays - BAR_BASE_DAYS)) * 100);
                return (
                  <li key={`${c.season}-${c.name}`} className="flex flex-col gap-1">
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={`min-w-0 truncate ${c.current ? 'font-semibold text-text-hi' : 'text-text-mid'}`}>
                        <span className="data-tabular text-text-low">{i + 1}.</span> <span lang="en">{c.name}</span>{' '}
                        <span className="data-tabular text-text-low">{c.season}</span>
                      </span>
                      <span className={`data-tabular shrink-0 ${c.current ? 'text-text-hi' : 'text-text-mid'}`}>
                        {t('age', { years: c.age.years, days: c.age.days })}
                      </span>
                    </span>
                    <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${width}%`, backgroundColor: c.current ? teamColor : 'rgba(255,255,255,0.28)' }}
                      />
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
