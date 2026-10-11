import { describe, expect, it } from 'vitest'
import { contentArticles, countTopics } from './topics'

describe('T-010 topics', () => {
  it('keeps content articles only', () => {
    expect(
      contentArticles([
        'Wikipedia:Hauptseite',
        'Spezial:Suche',
        'الصفحة_الرئيسة',
        'ملف:Elissa.jpg',
        'Klaus_Bresser',
        'Xxxx_(توضيح)',
        'HTTP-Cookie',
      ]),
    ).toEqual(['Klaus Bresser', 'HTTP-Cookie'])
  })

  it('counts topics with at least three articles, never "sonstiges", at most three', () => {
    const labels = [
      'sport',
      'sport',
      'politik',
      'sport',
      'politik',
      'politik',
      'musik',
      'sonstiges',
      'sonstiges',
      'sonstiges',
      'erfunden',
      'erfunden',
      'erfunden',
    ]
    expect(countTopics(labels)).toEqual(['sport', 'politik'])
    expect(countTopics(['musik', 'musik'])).toEqual([])
  })
})
