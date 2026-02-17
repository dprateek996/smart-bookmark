import { HttpError } from '@/lib/errors/http-error'

type CircuitState = {
  consecutiveFailures: number
  openedUntil: number | null
}

type DependencyGuardOptions = {
  retries: number
  retryDelayMs: number
  failureThreshold: number
  cooldownMs: number
}

const defaultOptions: DependencyGuardOptions = {
  retries: 2,
  retryDelayMs: 200,
  failureThreshold: 3,
  cooldownMs: 15_000
}

const circuitByDependency = new Map<string, CircuitState>()

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getState(name: string): CircuitState {
  const state = circuitByDependency.get(name)

  if (state) {
    return state
  }

  const initialState: CircuitState = {
    consecutiveFailures: 0,
    openedUntil: null
  }

  circuitByDependency.set(name, initialState)
  return initialState
}

export function getDependencyCircuitState(name: string) {
  const state = getState(name)
  const now = Date.now()

  const isOpen = state.openedUntil !== null && state.openedUntil > now

  return {
    isOpen,
    consecutiveFailures: state.consecutiveFailures,
    openedUntil: state.openedUntil,
    retryAfterMs: isOpen && state.openedUntil ? state.openedUntil - now : 0
  }
}

function assertCircuitAllowsTraffic(name: string) {
  const state = getState(name)
  const now = Date.now()

  if (state.openedUntil !== null && state.openedUntil > now) {
    throw new HttpError(
      503,
      'DEPENDENCY_CIRCUIT_OPEN',
      `${name} is temporarily unavailable`,
      {
        retryAfterMs: state.openedUntil - now
      }
    )
  }

  if (state.openedUntil !== null && state.openedUntil <= now) {
    state.openedUntil = null
  }
}

function markSuccess(name: string) {
  const state = getState(name)
  state.consecutiveFailures = 0
  state.openedUntil = null
}

function markFailure(name: string, options: DependencyGuardOptions) {
  const state = getState(name)
  state.consecutiveFailures += 1

  if (state.consecutiveFailures >= options.failureThreshold) {
    state.openedUntil = Date.now() + options.cooldownMs
  }
}

export async function runWithDependencyGuard<T>(
  name: string,
  operation: () => Promise<T>,
  options: Partial<DependencyGuardOptions> = {}
): Promise<T> {
  const mergedOptions: DependencyGuardOptions = {
    ...defaultOptions,
    ...options
  }

  assertCircuitAllowsTraffic(name)

  let attempt = 0
  let lastError: unknown = null

  while (attempt <= mergedOptions.retries) {
    try {
      const value = await operation()
      markSuccess(name)
      return value
    } catch (error) {
      lastError = error
      markFailure(name, mergedOptions)
      attempt += 1

      if (attempt > mergedOptions.retries) {
        throw lastError
      }

      const currentState = getDependencyCircuitState(name)

      if (currentState.isOpen) {
        throw new HttpError(
          503,
          'DEPENDENCY_CIRCUIT_OPEN',
          `${name} is temporarily unavailable`,
          {
            retryAfterMs: currentState.retryAfterMs
          }
        )
      }

      const backoffMs = mergedOptions.retryDelayMs * attempt
      await delay(backoffMs)
    }
  }

  throw lastError
}
