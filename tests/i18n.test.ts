import { describe, expect, it } from 'vitest'

import { forgeMessages, LOCALES } from '../src/i18n.js'

describe('forgeMessages', () => {
  it('provides a complete catalog for every supported locale', () => {
    for (const locale of LOCALES) {
      const messages = forgeMessages(locale)
      expect(messages.instanceDescription).not.toBe('')
      expect(messages.pullRequestIndex).not.toBe('')
      expect(messages.readIssue('ankey', 'demo', 1)).toContain('ankey/demo#1')
      expect(messages.readPullRequest('ankey', 'demo', 2)).toContain('ankey/demo!2')
      expect(messages.readDiff('ankey', 'demo', 2)).toContain('ankey/demo!2')
    }
  })
})
