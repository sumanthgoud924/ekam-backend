import { useState, useMemo } from 'react'
import { ArrowLeftRight, RotateCcw, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

type CategoryKey = 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'speed' | 'time' | 'digital'

interface UnitInfo {
  key: string
  label: string
  toBase: (val: number) => number
  fromBase: (val: number) => number
}

const categories: Record<CategoryKey, { label: string; units: UnitInfo[] }> = {
  length: {
    label: 'Length',
    units: [
      { key: 'mm', label: 'Millimeter (mm)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'cm', label: 'Centimeter (cm)', toBase: v => v / 100, fromBase: v => v * 100 },
      { key: 'm', label: 'Meter (m)', toBase: v => v, fromBase: v => v },
      { key: 'km', label: 'Kilometer (km)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'in', label: 'Inch (in)', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      { key: 'ft', label: 'Foot (ft)', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      { key: 'yd', label: 'Yard (yd)', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      { key: 'mi', label: 'Mile (mi)', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    ],
  },
  weight: {
    label: 'Weight',
    units: [
      { key: 'mg', label: 'Milligram (mg)', toBase: v => v / 1_000_000, fromBase: v => v * 1_000_000 },
      { key: 'g', label: 'Gram (g)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'kg', label: 'Kilogram (kg)', toBase: v => v, fromBase: v => v },
      { key: 'ton', label: 'Tonne (t)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'lb', label: 'Pound (lb)', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
      { key: 'oz', label: 'Ounce (oz)', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
    ],
  },
  temperature: {
    label: 'Temperature',
    units: [
      { key: 'c', label: 'Celsius (°C)', toBase: v => v, fromBase: v => v },
      { key: 'f', label: 'Fahrenheit (°F)', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
      { key: 'k', label: 'Kelvin (K)', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    ],
  },
  area: {
    label: 'Area',
    units: [
      { key: 'mm2', label: 'mm²', toBase: v => v / 1_000_000, fromBase: v => v * 1_000_000 },
      { key: 'cm2', label: 'cm²', toBase: v => v / 10_000, fromBase: v => v * 10_000 },
      { key: 'm2', label: 'm²', toBase: v => v, fromBase: v => v },
      { key: 'km2', label: 'km²', toBase: v => v * 1_000_000, fromBase: v => v / 1_000_000 },
      { key: 'ha', label: 'Hectare (ha)', toBase: v => v * 10_000, fromBase: v => v / 10_000 },
      { key: 'ac', label: 'Acre (ac)', toBase: v => v * 4046.86, fromBase: v => v / 4046.86 },
      { key: 'ft2', label: 'ft²', toBase: v => v * 0.092903, fromBase: v => v / 0.092903 },
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      { key: 'ml', label: 'Milliliter (ml)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 'l', label: 'Liter (L)', toBase: v => v, fromBase: v => v },
      { key: 'm3', label: 'Cubic meter (m³)', toBase: v => v * 1000, fromBase: v => v / 1000 },
      { key: 'gal', label: 'Gallon (gal)', toBase: v => v * 3.78541, fromBase: v => v / 3.78541 },
      { key: 'qt', label: 'Quart (qt)', toBase: v => v * 0.946353, fromBase: v => v / 0.946353 },
      { key: 'cup', label: 'Cup', toBase: v => v * 0.236588, fromBase: v => v / 0.236588 },
      { key: 'floz', label: 'Fluid oz (fl oz)', toBase: v => v * 0.0295735, fromBase: v => v / 0.0295735 },
    ],
  },
  speed: {
    label: 'Speed',
    units: [
      { key: 'ms', label: 'm/s', toBase: v => v, fromBase: v => v },
      { key: 'kmh', label: 'km/h', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
      { key: 'mph', label: 'mph', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
      { key: 'kn', label: 'Knot (kn)', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
    ],
  },
  time: {
    label: 'Time',
    units: [
      { key: 'ms', label: 'Millisecond (ms)', toBase: v => v / 1000, fromBase: v => v * 1000 },
      { key: 's', label: 'Second (s)', toBase: v => v, fromBase: v => v },
      { key: 'min', label: 'Minute (min)', toBase: v => v * 60, fromBase: v => v / 60 },
      { key: 'h', label: 'Hour (h)', toBase: v => v * 3600, fromBase: v => v / 3600 },
      { key: 'd', label: 'Day (d)', toBase: v => v * 86400, fromBase: v => v / 86400 },
      { key: 'wk', label: 'Week (wk)', toBase: v => v * 604800, fromBase: v => v / 604800 },
      { key: 'mo', label: 'Month (mo)', toBase: v => v * 2592000, fromBase: v => v / 2592000 },
      { key: 'yr', label: 'Year (yr)', toBase: v => v * 31536000, fromBase: v => v / 31536000 },
    ],
  },
  digital: {
    label: 'Digital Storage',
    units: [
      { key: 'b', label: 'Byte (B)', toBase: v => v, fromBase: v => v },
      { key: 'kb', label: 'Kilobyte (KB)', toBase: v => v * 1024, fromBase: v => v / 1024 },
      { key: 'mb', label: 'Megabyte (MB)', toBase: v => v * 1024 * 1024, fromBase: v => v / (1024 * 1024) },
      { key: 'gb', label: 'Gigabyte (GB)', toBase: v => v * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024) },
      { key: 'tb', label: 'Terabyte (TB)', toBase: v => v * 1024 * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024 * 1024) },
    ],
  },
}

const categoryKeys = Object.keys(categories) as CategoryKey[]

export default function UnitConverter() {
  const [category, setCategory] = useState<CategoryKey>('length')
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('km')
  const [inputValue, setInputValue] = useState('1')
  const [copied, setCopied] = useState(false)

  const currentCategory = categories[category]

  const result = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value)) return ''
    const from = currentCategory.units.find(u => u.key === fromUnit)
    const to = currentCategory.units.find(u => u.key === toUnit)
    if (!from || !to) return ''
    const baseValue = from.toBase(value)
    const converted = to.fromBase(baseValue)
    return converted.toPrecision(10).replace(/\.?0+$/, '')
  }, [inputValue, fromUnit, toUnit, currentCategory])

  const swap = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
  }

  const copyResult = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied')
  }

  const commonConversions = useMemo(() => {
    const value = parseFloat(inputValue)
    if (isNaN(value) || !value) return []
    const from = currentCategory.units.find(u => u.key === fromUnit)
    if (!from) return []
    const baseValue = from.toBase(value)
    return currentCategory.units
      .filter(u => u.key !== fromUnit)
      .slice(0, 5)
      .map(u => ({ label: u.label, value: u.fromBase(baseValue).toPrecision(6).replace(/\.?0+$/, '') }))
  }, [inputValue, fromUnit, currentCategory])

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeftRight size={24} className="text-primary-500" /> Unit Converter
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Convert between length, weight, temperature, area, volume, speed, time, and digital storage units.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categoryKeys.map(k => (
          <button
            key={k}
            onClick={() => {
              setCategory(k)
              const units = categories[k].units
              setFromUnit(units[0].key)
              setToUnit(units[1]?.key || units[0].key)
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              category === k
                ? 'bg-primary-500 text-white shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={{ color: category === k ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {currentCategory.label === categories[k].label ? `📐 ${categories[k].label}` : categories[k].label}
          </button>
        ))}
      </div>

      {/* Converter */}
      <div className="card space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="label">Value</label>
            <input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Enter value"
              className="input"
              step="any"
            />
          </div>
          <div className="flex justify-center pb-1">
            <button onClick={swap} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Swap units">
              <ArrowLeftRight size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <div>
            <label className="label">From</label>
            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="input">
              {currentCategory.units.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
          <div></div>
          <div>
            <label className="label">To</label>
            <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="input">
              {currentCategory.units.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {inputValue} {currentCategory.units.find(u => u.key === fromUnit)?.label} =
            </p>
            <p className="text-2xl font-bold mt-1 gradient-text">{result}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentCategory.units.find(u => u.key === toUnit)?.label}
            </p>
            <button onClick={copyResult} className="btn-ghost text-xs mt-2 !py-1">
              {copied ? <Check size={12} /> : <Copy size={12} />} Copy result
            </button>
          </div>
        )}

        {/* Quick reference */}
        {commonConversions.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Quick conversions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {commonConversions.map(c => (
                <div key={c.label} className="rounded-lg p-2 text-center border" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="text-center">
        <button onClick={() => { setInputValue('1'); setFromUnit(currentCategory.units[0].key); setToUnit(currentCategory.units[1]?.key || currentCategory.units[0].key) }} className="btn-ghost text-sm">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  )
}
