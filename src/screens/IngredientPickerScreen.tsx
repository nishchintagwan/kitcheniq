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
  'Vegetables',
  'Dairy',
  'Meat & Eggs',
  'Oils',
  'Grains & Pulses',
  'Spices',
  'Dry Fruits & Nuts',
  'Pantry',
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
    if (!restaurantId) {
      navigate('/dashboard')
      return
    }
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
        await supabase.from('ingredients').insert(rows)
      }
      navigate('/dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  // Filter and group
  const query = search.toLowerCase().trim()
  const filtered = query
    ? library.filter(ing => ing.name.toLowerCase().includes(query))
    : library

  const grouped = CATEGORY_ORDER
    .map(cat => ({ category: cat, items: filtered.filter(ing => ing.category === cat) }))
    .filter(g => g.items.length > 0)

  // Also include any categories not in CATEGORY_ORDER (future-proof)
  const knownCategories = new Set(CATEGORY_ORDER)
  const extraCategories = [...new Set(filtered.map(i => i.category))].filter(c => !knownCategories.has(c))
  for (const cat of extraCategories) {
    grouped.push({ category: cat, items: filtered.filter(ing => ing.category === cat) })
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader
        title="Set your ingredient prices"
        subtitle="Update from what you pay at the mandi"
      />

      <div style={{ padding: '16px 16px 100px' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search
            size={14}
            strokeWidth={1.5}
            color="#888888"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 10,
              padding: '10px 12px 10px 34px',
              fontSize: 13,
              color: '#1A1A1A',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={52} radius={10} />
            ))}
          </div>
        ) : (
          <>
            {selected.size > 0 && (
              <p style={{ fontSize: 11, color: '#7C3AED', marginBottom: 12, marginTop: 0 }}>
                {selected.size} ingredient{selected.size !== 1 ? 's' : ''} selected
              </p>
            )}

            {grouped.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888888', fontSize: 13, marginTop: 40 }}>
                No ingredients found
              </p>
            ) : (
              grouped.map(group => (
                <div key={group.category} style={{ marginBottom: 20 }}>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#888888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: '0 0 8px',
                    }}
                  >
                    {group.category}
                  </p>

                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid #EDE8F5',
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
                            borderBottom: isLast ? 'none' : '0.5px solid #EDE8F5',
                            backgroundColor: isSelected ? 'rgba(124,58,237,0.03)' : 'transparent',
                          }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleSelect(ing.id)}
                            aria-label={isSelected ? `Deselect ${ing.name}` : `Select ${ing.name}`}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: isSelected ? 'none' : '1.5px solid #EDE8F5',
                              backgroundColor: isSelected ? '#7C3AED' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              padding: 0,
                            }}
                          >
                            {isSelected && <Check size={11} strokeWidth={1.5} color="#FFFFFF" />}
                          </button>

                          {/* Name — tapping the name also toggles */}
                          <span
                            onClick={() => toggleSelect(ing.id)}
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: '#1A1A1A',
                              cursor: 'pointer',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            {ing.name}
                          </span>

                          {/* Price input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ color: '#888888', fontSize: 12 }}>₹</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={prices[ing.id] ?? ing.price_per_kg}
                              onChange={e => updatePrice(ing.id, e.target.value)}
                              style={{
                                width: 56,
                                border: 'none',
                                borderBottom: '0.5px solid #EDE8F5',
                                backgroundColor: 'transparent',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#1A1A1A',
                                outline: 'none',
                                fontFamily: 'inherit',
                                textAlign: 'right',
                              }}
                            />
                            <span
                              style={{
                                color: '#888888',
                                fontSize: 10,
                                whiteSpace: 'nowrap',
                                marginLeft: 2,
                              }}
                            >
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
