/**
 * Cron Parser Utility
 *
 * Parses cron expressions to human-readable schedules and calculates next run times.
 * Supports common cron patterns used in the 0ne app.
 */

// =============================================================================
// TYPES
// =============================================================================

interface CronParts {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse a cron expression into its component parts
 */
function parseCronParts(cronExpression: string): CronParts | null {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) {
    return null
  }

  return {
    minute: parts[0]!,
    hour: parts[1]!,
    dayOfMonth: parts[2]!,
    month: parts[3]!,
    dayOfWeek: parts[4]!,
  }
}

/**
 * Format hour in 12-hour format with AM/PM
 */
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}

// =============================================================================
// PARSE SCHEDULE
// =============================================================================

/**
 * Parse a cron expression into a human-readable schedule string
 *
 * @param cronExpression - Standard 5-part cron expression (minute hour dayOfMonth month dayOfWeek)
 * @returns Human-readable schedule string
 *
 * Examples:
 * - parseSchedule("0 4 * * *")    returns "Daily at 4:00 AM"
 * - parseSchedule("*\/5 * * * *") returns "Every 5 minutes"
 * - parseSchedule("*\/15 * * * *") returns "Every 15 minutes"
 * - parseSchedule("0 * * * *")    returns "Every hour"
 */
export function parseSchedule(cronExpression: string): string {
  const parts = parseCronParts(cronExpression)
  if (!parts) {
    return cronExpression // Return original if can't parse
  }

  const { minute, hour, dayOfMonth, month, dayOfWeek } = parts

  // Every X minutes: */X * * * *
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const interval = parseInt(minute.slice(2), 10)
    if (interval === 1) {
      return 'Every minute'
    }
    return `Every ${interval} minutes`
  }

  // Every hour at minute 0: 0 * * * *
  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every hour'
  }

  // Every hour at minute X: X * * * *
  if (/^\d+$/.test(minute) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const min = parseInt(minute, 10)
    return `Every hour at :${min.toString().padStart(2, '0')}`
  }

  // Every X hours: 0 */X * * *
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const interval = parseInt(hour.slice(2), 10)
    if (interval === 1) {
      return 'Every hour'
    }
    return `Every ${interval} hours`
  }

  // Daily at specific time: M H * * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    return `Daily at ${formatTime(h, m)}`
  }

  // Specific days of the week: M H * * D
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && /^[\d,]+$/.test(dayOfWeek)) {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days = dayOfWeek.split(',').map((d) => dayNames[parseInt(d, 10)] || d).join(', ')
    return `${days} at ${formatTime(h, m)}`
  }

  // Weekdays only: M H * * 1-5
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    return `Weekdays at ${formatTime(h, m)}`
  }

  // Monthly on specific day: M H D * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(dayOfMonth) && month === '*' && dayOfWeek === '*') {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    const d = parseInt(dayOfMonth, 10)
    const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'
    return `Monthly on the ${d}${suffix} at ${formatTime(h, m)}`
  }

  // Fallback: return the original expression
  return cronExpression
}

// =============================================================================
// GET NEXT RUN
// =============================================================================

/**
 * Calculate the next run time for a cron expression
 *
 * @param cronExpression - Standard 5-part cron expression
 * @returns Date of the next scheduled run
 *
 * Examples:
 * - getNextRun("0 4 * * *")    returns next 4:00 AM
 * - getNextRun("*\/5 * * * *") returns next 5-minute mark
 */
export function getNextRun(cronExpression: string): Date {
  const parts = parseCronParts(cronExpression)
  if (!parts) {
    // If we can't parse, return a far future date
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  }

  const now = new Date()
  const { minute, hour, dayOfMonth, dayOfWeek } = parts

  // Every X minutes: */X * * * *
  if (minute.startsWith('*/') && hour === '*') {
    const interval = parseInt(minute.slice(2), 10)
    const currentMinute = now.getMinutes()
    const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval

    const next = new Date(now)
    next.setSeconds(0, 0)

    if (nextMinute >= 60) {
      next.setMinutes(0)
      next.setHours(next.getHours() + 1)
    } else {
      next.setMinutes(nextMinute)
    }

    return next
  }

  // Every hour at minute 0: 0 * * * * or X * * * *
  if (/^\d+$/.test(minute) && hour === '*') {
    const targetMinute = parseInt(minute, 10)
    const next = new Date(now)
    next.setSeconds(0, 0)
    next.setMinutes(targetMinute)

    if (now.getMinutes() >= targetMinute) {
      next.setHours(next.getHours() + 1)
    }

    return next
  }

  // Every X hours: 0 */X * * *
  if (minute === '0' && hour.startsWith('*/')) {
    const interval = parseInt(hour.slice(2), 10)
    const currentHour = now.getHours()
    const nextHour = Math.ceil((currentHour + 1) / interval) * interval

    const next = new Date(now)
    next.setMinutes(0, 0, 0)

    if (nextHour >= 24) {
      next.setHours(0)
      next.setDate(next.getDate() + 1)
    } else {
      next.setHours(nextHour)
    }

    return next
  }

  // Daily at specific time: M H * * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && dayOfWeek === '*') {
    const targetHour = parseInt(hour, 10)
    const targetMinute = parseInt(minute, 10)

    const next = new Date(now)
    next.setHours(targetHour, targetMinute, 0, 0)

    // If the time has passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    return next
  }

  // Specific days of week: M H * * D
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === '*' && /^[\d,\-]+$/.test(dayOfWeek)) {
    const targetHour = parseInt(hour, 10)
    const targetMinute = parseInt(minute, 10)

    // Parse day of week (handle ranges like 1-5 and lists like 1,3,5)
    const allowedDays = new Set<number>()
    for (const part of dayOfWeek.split(',')) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((p) => parseInt(p, 10))
        if (start !== undefined && end !== undefined) {
          for (let d = start; d <= end; d++) {
            allowedDays.add(d)
          }
        }
      } else {
        allowedDays.add(parseInt(part, 10))
      }
    }

    const next = new Date(now)
    next.setHours(targetHour, targetMinute, 0, 0)

    // Check if today works
    if (next > now && allowedDays.has(next.getDay())) {
      return next
    }

    // Find the next valid day
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(now)
      candidate.setDate(now.getDate() + i)
      candidate.setHours(targetHour, targetMinute, 0, 0)
      if (allowedDays.has(candidate.getDay())) {
        return candidate
      }
    }
  }

  // Monthly: M H D * *
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && /^\d+$/.test(dayOfMonth)) {
    const targetDay = parseInt(dayOfMonth, 10)
    const targetHour = parseInt(hour, 10)
    const targetMinute = parseInt(minute, 10)

    const next = new Date(now)
    next.setDate(targetDay)
    next.setHours(targetHour, targetMinute, 0, 0)

    // If this month's date has passed, go to next month
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDay)
    }

    return next
  }

  // Fallback: return 1 hour from now
  const fallback = new Date(now)
  fallback.setHours(fallback.getHours() + 1, 0, 0, 0)
  return fallback
}

// =============================================================================
// FORMAT RELATIVE TIME
// =============================================================================

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "in 5 minutes")
 *
 * @param date - The date to format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = targetDate.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffMs / 60000)
  const diffHours = Math.round(diffMs / 3600000)
  const diffDays = Math.round(diffMs / 86400000)

  // Future times
  if (diffMs > 0) {
    if (diffMinutes < 1) return 'in less than a minute'
    if (diffMinutes === 1) return 'in 1 minute'
    if (diffMinutes < 60) return `in ${diffMinutes} minutes`
    if (diffHours === 1) return 'in 1 hour'
    if (diffHours < 24) return `in ${diffHours} hours`
    if (diffDays === 1) return 'tomorrow'
    return `in ${diffDays} days`
  }

  // Past times
  const absDiffSeconds = Math.abs(diffSeconds)
  const absDiffMinutes = Math.abs(diffMinutes)
  const absDiffHours = Math.abs(diffHours)
  const absDiffDays = Math.abs(diffDays)

  if (absDiffSeconds < 60) return 'just now'
  if (absDiffMinutes === 1) return '1 minute ago'
  if (absDiffMinutes < 60) return `${absDiffMinutes} minutes ago`
  if (absDiffHours === 1) return '1 hour ago'
  if (absDiffHours < 24) return `${absDiffHours} hours ago`
  if (absDiffDays === 1) return 'yesterday'
  if (absDiffDays < 7) return `${absDiffDays} days ago`

  // For older dates, show the actual date
  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
