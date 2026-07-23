import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import GlacierHeader from '../components/ui/GlacierHeader'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'

interface LibraryIngredient {
  id: string
  name: string
  price_per_kg: number
  unit: string
  category: string
}

const CATEGORY_ORDER = [
  'Vegetables', 'Dairy', 'Meat & Eggs', 'Oils',
  'Grains & Pulses', 'Spices', 'Dry Fruits & Nuts', 'Pantry',
]

function unitLabel(unit: string): string {
  if (unit === 'litre') return 'per litre'
  if (unit === 'piece') return 'per piece'
  return 'per kg'
}

export default function IngredientPickerScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()

  const [library, setLibrary] = useState<LibraryIngredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('ingredient_library')
          .select('id, name, price_per_kg, unit, category')
        if (data) {
          setLibrary(data as LibraryIngredient[])
          const initial: Record<string, number> = {}
          for (const ing of data) {
            initial[(ing as LibraryIngredient).id] = (ing as LibraryIngredient).price_per_kg
          }
          setPrices(initial)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updatePrice(id: string, value: string) {
    const num = Number(value)
    setPrices(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }))
  }

  async function handleSave() {
    const restaurantId = restaurant?.id
    if (!restaurantId) { navigate('/dashboard'); return }
    setIsSaving(true)
    try {
      const rows = library
        .filter(ing => selected.has(ing.id))
        .map(ing => ({
          restaurant_id: restaurantId,
          name: ing.name,
          price_per_kg: prices[ing.id] ?? ing.price_per_kg,
          unit: ing.unit,
          last_updated: new Date().toISOString(),
        }))
      if (rows.length > 0) {
        await supabase.from('ingredients').upsert(rows, { onConflict: 'restaurant_id,name' })
      }
      navigate('/dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  const query = search.toLowerCase().trim()
  const filtered = query
    ? library.filter(ing => ing.name.toLowerCase().includes(query))
    : library

  const grouped = CATEGORY_ORDER
    .map(cat => ({ category: cat, items: filtered.filter(ing => ing.category === cat) }))
    .filter(g => g.items.length > 0)

  const knownCategories = new Set(CATEGORY_ORDER)
  const extraCategories = [...new Set(filtered.map(i => i.category))].filter(c => !knownCategories.has(c))
  for (const cat of extraCategories) {
    grouped.push({ category: cat, items: filtered.filter(ing => ing.category === cat) })
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader
        title="Set ingredient prices"
        subtitle="Update from what you pay at the mandi"
        rightElement={
          selected.size > 0 ? (
            <span
              style={{
                backgroundColor: '#3FC6F0',
                color: '#04212E',
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 9999,
                padding: '2px 10px',
              }}
            >
              {selected.size} selected
            </span>
          ) : undefined
        }
      />

      <div style={{ padding: '8px 16px 100px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search
            size={14}
            strokeWidth={1.5}
            color="#6B7588"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#1B2436',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10,
              padding: '10px 12px 10px 34px',
              fontSize: 13,
              color: '#F4F6FA',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={52} radius={10} />)}
          </div>
        ) : (
          <>
            {grouped.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6B7588', fontSize: 13, marginTop: 40 }}>
                No ingredients found
              </p>
            ) : (
              grouped.map(group => (
                <div key={group.category} style={{ marginBottom: 20 }}>
                  <p
                    style={{
                      fontSize: 9, fontWeight: 800, color: '#6B7588',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      margin: '0 0 8px',
                    }}
                  >
                    {group.category}
                  </p>

                  <div
                    style={{
                      backgroundColor: '#161D2B',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {group.items.map((ing, idx) => {
                      const isSelected = selected.has(ing.id)
                      const isLast = idx === group.items.length - 1
                      return (
                        <div
                          key={ing.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                            backgroundColor: isSelected ? 'rgba(63,198,240,0.08)' : 'transparent',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(ing.id)}
                            aria-label={isSelected ? `Deselect ${ing.name}` : `Select ${ing.name}`}
                            style={{
                              width: 20, height: 20, borderRadius: 6,
                              border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.14)',
                              backgroundColor: isSelected ? '#3FC6F0' : '#1B2436',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', flexShrink: 0, padding: 0,
                            }}
                          >
                            {isSelected && <Check size={11} strokeWidth={1.5} color="#04212E" />}
                          </button>

                          <span
                            onClick={() => toggleSelect(ing.id)}
                            style={{
                              flex: 1, fontSize: 13, color: '#F4F6FA',
                              cursor: 'pointer', fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {ing.name}
                          </span>

                          {/* Price input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ color: '#9AA4B8', fontSize: 12 }}>₹</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={prices[ing.id] ?? ing.price_per_kg}
                              onChange={e => updatePrice(ing.id, e.target.value)}
                              style={{
                                width: 56, border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                backgroundColor: 'transparent',
                                fontSize: 13, fontWeight: 600, color: '#F4F6FA',
                                outline: 'none', fontFamily: 'inherit', textAlign: 'right',
                              }}
                            />
                            <span style={{ color: '#6B7588', fontSize: 10, whiteSpace: 'nowrap', marginLeft: 2 }}>
                              {unitLabel(ing.unit)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <Button fullWidth disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save and go to dashboard →'}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
                Skip for now →
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
