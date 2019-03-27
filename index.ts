import * as React from 'react'
import { activate, addMiddleware } from 'react-lifecycle-hooks'

let lockedTarget: React.Component | null = null
let stateShift = 0
let effectShift = 0
let rendering = false

type Unsubscription = () => void
type Effect = () => void | Unsubscription
type EffectMeta = {
  effect: Effect
  flags: any[] | null
  applied: boolean
  unsubscription?: Unsubscription
}

const memoryMap = new Map<
  React.Component,
  {
    states: any[] // store state data
    effects: EffectMeta[]
  }
>()

function register(target: React.Component) {
  memoryMap.set(target, {
    states: [],
    effects: [],
  })
}

function lock(target: React.Component) {
  stateShift = 0
  effectShift = 0
  lockedTarget = target
}

function unlock() {
  lockedTarget = null
}

function runWithLock<R>(target: React.Component, run: (release: () => void) => R, sync = true): R {
  lock(target)
  const returnValue = run(unlock)
  if (sync) {
    unlock()
  }
  return returnValue
}

function runWithRendering<R>(run: (release: () => void) => R, sync = true): R {
  rendering = true
  const returnValue = run(() => (rendering = false))
  if (sync) {
    rendering = false
  }
  return returnValue
}

function releaseMemory(target: React.Component) {
  memoryMap.delete(target)
}

function safeGuard() {
  if (!lockedTarget || !memoryMap.has(lockedTarget)) {
    throw new Error('unexpected call outside component')
  }
}

function get() {
  safeGuard()
  return memoryMap.get(lockedTarget!)!
}

export function useState<V>(defaultValue: V): [V, (v: V) => void] {
  if (!rendering)
    throw new Error(
      'React Hooks must be called in a React function component or a custom React Hook function.'
    )
  const { states } = get()
  if (states.length === stateShift) {
    states.push(defaultValue)
  }
  const read = states[stateShift]
  const target = lockedTarget!
  const s = stateShift
  const write = (value: V) => {
    if (equal(value, read)) return
    states.splice(s, 1, value)
    if (!rendering) target.forceUpdate()
  }
  stateShift++
  return [read, write]
}

function flushUnsubscriptions() {
  const { effects } = get()
  effects.forEach(({ unsubscription }) => unsubscription && unsubscription())
}

function flushEffectBuffer() {
  const { effects } = get()
  effects.forEach(effect => {
    if (!effect.applied) {
      effect.applied = true
      if (effect.unsubscription) effect.unsubscription()
      effect.unsubscription = effect.effect() || undefined
    }
  })
}

const equal = Object.is

function arrayShallowEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false
  let i = a.length
  while (i) {
    i--
    if (!equal(a[i], b[i])) return false
  }
  return true
}

/**
 * This might not work as well as the useEffect of official React:
 * Unlike componentDidMount and componentDidUpdate, the function passed to
 * useEffect fires after layout and paint, during a deferred event.
 *
 * Not sure if setTimeout could help.
 */
export function useEffect(effect: EffectMeta['effect'], flags: EffectMeta['flags'] = null) {
  const { effects } = get()
  if (effectShift === effects.length) {
    effects.push({
      applied: false,
      effect,
      flags,
    })
  } else {
    const effectMeta = effects[effectShift]
    if (
      effectMeta.flags === null ||
      flags === null ||
      !arrayShallowEqual(effectMeta.flags, flags)
    ) {
      // need to apply effect
      effectMeta.applied = false
      effectMeta.effect = effect
      effectMeta.flags = flags
    }
  }
  effectShift++
}

export function useHooks<P>(functionComponent: React.SFC<P>) {
  return class WithHooks extends React.Component<P> {
    constructor(props: P) {
      super(props)
      register(this)
    }
    componentDidMount() {
      runWithLock(this, () => flushEffectBuffer())
    }
    componentDidUpdate() {
      runWithLock(this, () => flushEffectBuffer())
    }
    componentWillUnmount() {
      runWithLock(this, () => {
        flushUnsubscriptions()
        releaseMemory(this)
      })
    }
    render(): React.ReactNode {
      return runWithLock(this, () => runWithRendering(() => functionComponent(this.props)))
    }
  }
}

export function useContext<T>(context: React.Context<T>) {
  // hack
  return (<any>context)._currentValue || (<any>context)._currentValue2
}

export function holyShit() {
  activate({
    transformToClass: true,
  })
  addMiddleware(
    ({
      componentInstance,
      componentClass,
      lifecycleName,
      lifecycleArguments: [props],
      returnAs,
    }) => {
      const instance = <React.Component>componentInstance
      switch (lifecycleName) {
        case 'componentWillMount': {
          if (React.isValidElement(componentInstance)) return
          register(instance)
          break
        }
        case 'componentDidMount':
        case 'componentDidUpdate':
          runWithLock(instance, () => flushEffectBuffer())
          break
        case 'componentWillUnmount': {
          runWithLock(instance, () => {
            flushUnsubscriptions()
            releaseMemory(instance)
          })
          break
        }
        case 'render': {
          runWithLock(
            instance,
            releaseLock =>
              runWithRendering(
                releaseRendering =>
                  returnAs(returnValue => {
                    releaseLock()
                    releaseRendering()
                    return returnValue
                  }),
                false
              ),
            false
          )
        }
      }
    }
  )
}
