import { describe, expect, it } from 'vitest'
import { parseKanjiVG } from './kanjivg'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_03044" style="fill:none;stroke:#000000;stroke-width:3;">
<g id="kvg:03044" kvg:element="い">
	<path id="kvg:03044-s2" kvg:type="㇀" d="M70,30c5,10,10,20,12,35"/>
	<path id="kvg:03044-s1" kvg:type="㇑" d="M30,25c0,20,2,40,10,50"/>
	<path id="kvg:09999-s1" d="M0,0L1,1"/>
</g>
</g>
<g id="kvg:StrokeNumbers_03044" style="font-size:8;fill:#808080">
	<text transform="matrix(1 0 0 1 22.50 26.13)">1</text>
	<text transform="matrix(1 0 0 1 66.25 28.50)">2</text>
</g>
</svg>`

describe('parseKanjiVG', () => {
  it('returns stroke paths in stroke order, only for the given code point', () => {
    expect(parseKanjiVG(SVG, '03044').strokes).toEqual(['M30,25c0,20,2,40,10,50', 'M70,30c5,10,10,20,12,35'])
  })
  it('returns stroke number positions', () => {
    expect(parseKanjiVG(SVG, '03044').numbers).toEqual([[22.5, 26.13], [66.25, 28.5]])
  })
})
