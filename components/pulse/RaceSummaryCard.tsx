import { useTranslations } from 'next-intl';
import type { RaceSummary } from '@/lib/pulse/raceSummary';

/**
 * Round page: what happened in the race in a few computed lines (Faz 21.0):
 * the winner's grid slot, the pole sitter's result, fastest lap, biggest gain
 * and the drivers who did not finish. Every line comes from the classification.
 */
export function RaceSummaryCard({ summary }: { summary: RaceSummary }) {
  const t = useTranslations('ui.pulse.summary');
  const { winner, poleSitter, fastestLap, biggestGain, dnf } = summary;
  const lines: string[] = [];

  if (winner.grid === 1) lines.push(t('winnerFromPole', { name: winner.driverName }));
  else if (winner.grid !== null) lines.push(t('winnerFrom', { name: winner.driverName, grid: winner.grid }));
  if (poleSitter) {
    lines.push(
      poleSitter.finished && poleSitter.position !== null
        ? t('poleFinished', { name: poleSitter.driverName, position: poleSitter.position })
        : t('poleDnf', { name: poleSitter.driverName }),
    );
  }
  if (fastestLap) lines.push(t('fastestLap', { name: fastestLap.driverName }));
  if (biggestGain) {
    lines.push(
      t('gain', { name: biggestGain.driverName, grid: biggestGain.grid, position: biggestGain.position, gain: biggestGain.gain }),
    );
  }
  if (dnf.length > 0) lines.push(t('dnf', { count: dnf.length, names: dnf.map((d) => d.driverName).join(', ') }));
  if (lines.length === 0) return null;

  return (
    <div>
      <span className="label-caps mb-3 block text-text-mid">{t('title')}</span>
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line} className="flex gap-2.5 text-sm leading-snug text-text">
            <span aria-hidden className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
