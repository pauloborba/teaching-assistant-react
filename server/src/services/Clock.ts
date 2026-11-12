import { isIsoDate } from '../models/Dates';

/**
 * The current date (service). The domain asks the clock instead of reading
 * the system date, so that tests can decide which day "today" is.
 */
export interface Clock {
  /** Today's date, as an ISO date (yyyy-mm-dd). */
  today(): string;
}

/** The clock of the machine, in its local time zone. */
export class SystemClock implements Clock {
  today(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/**
 * A clock whose date can be fixed, used by the acceptance tests. While no
 * date is fixed, it tells the date of the clock it wraps.
 */
export class SettableClock implements Clock {
  private fixedToday: string | null = null;

  constructor(private readonly base: Clock = new SystemClock()) {}

  /** Fixes today's date; null goes back to the wrapped clock. */
  set(today: string | null): void {
    if (today !== null && !isIsoDate(today)) {
      throw new Error(`Not an ISO date: ${today}`);
    }
    this.fixedToday = today;
  }

  today(): string {
    return this.fixedToday ?? this.base.today();
  }
}
