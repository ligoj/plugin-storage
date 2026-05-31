/*
 * Contract tests for the storage service-level parent plugin: manifest
 * shape, i18n merge, and parent->tool delegation via subPluginIdFor.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { pluginRegistry, useI18nStore } from '@ligoj/host'
import def, { service } from '../index.js'

beforeEach(() => { setActivePinia(createPinia()) })

describe('plugin-storage manifest', () => {
  it('exposes a valid service-level manifest', () => {
    expect(def.id).toBe('storage')
    expect(def.routes).toBeUndefined()
    expect(typeof def.install).toBe('function')
    expect(typeof def.feature).toBe('function')
    expect(def.service).toBeTypeOf('object')
    expect(def.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('merges i18n on install', () => {
    const i18n = useI18nStore()
    def.install()
    expect(i18n.t('service:storage')).toBe('Storage')
  })

  it('throws for an unknown feature', () => {
    expect(() => def.feature('nope')).toThrow(/no feature "nope"/)
  })

  it('subPluginIdFor maps node ids to tool plugin ids', () => {
    expect(service.subPluginIdFor({ node: { id: 'service:storage:foo:1' } })).toBe('storage-foo')
    expect(service.subPluginIdFor({ node: { id: 'service:storage' } })).toBeNull()
    expect(service.subPluginIdFor({})).toBeNull()
  })

  it('renderFeatures returns [] when no tool plugin is registered', () => {
    expect(def.feature('renderFeatures', { node: { id: 'service:storage:foo:1' }, parameters: {} })).toEqual([])
  })
})

describe('plugin-storage -> tool delegation', () => {
  // A valid manifest (registry.register requires id + install) whose
  // feature() returns a fake VNode for renderDetailsKey only.
  const fakeTool = {
    id: 'storage-foo',
    install() {},
    feature(action) {
      if (action === 'renderDetailsKey') return { __v_isVNode: true }
      throw new Error(`no feature "${action}"`)
    },
  }
  beforeEach(() => { pluginRegistry.register('storage-foo', fakeTool) })
  afterEach(() => { pluginRegistry.remove('storage-foo') })

  it('delegates renderDetailsKey to the registered tool', () => {
    const out = def.feature('renderDetailsKey', { node: { id: 'service:storage:foo:1' } })
    expect(Array.isArray(out)).toBe(true)
    expect(out[0].__v_isVNode).toBe(true)
  })

  it('swallows a missing tool action and returns null', () => {
    expect(def.feature('renderDetailsFeatures', { node: { id: 'service:storage:foo:1' } })).toBeNull()
  })
})
