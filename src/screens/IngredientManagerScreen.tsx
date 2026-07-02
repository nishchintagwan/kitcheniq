import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { getLatestPriceDelta } from '../lib/queries'
import GlacierHeader from '../components/ui/GlacierHeader'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { Unit } from '../types'

const STALE_DAYS = 7
const UNITS: Unit[] = ['kg', 'gram', 'litre', 'ml', 'piece', 'dozen']

function isStale(dateString: string): boolean {
  return Date.now() - new Date(dateString).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
}

function relativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function firstLetter(name: string): string { return (name.charAt(0) || '?').toUpperCase() }

const LETTER_COLORS = ['#3FC6F0', '#36D399', '#F0A93F', '#F0596B', '#A78BFA', '#FB7185']
function letterColor(name: string): string {
  const code = name.charCodeAt(0) || 65
  return LETTER_COLORS[code % LETTER_COLORS.length]
}

type FilterTab = 'all' | 'stale'

export default function IngredientManagerScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUnit, setNewUnit] = useState<Unit>('kg')
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [newFocused, setNewFocused] = useState<string | null>(null)
  const [deltas, setDeltas] = useState<Record<string, number | null>>({})
  const [deltasLoading, setDeltasLoading] = useState(true)

  async function loadData(restaurantId: string) {
    setIsLoading(true); setHasError(false)
    try { await fetchIngredients(restaurantId) }
    catch { setHasError(true) }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    if (!restaurant?.id) return
    loadData(restaurant.id)
  }, [restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading || ingredients.length === 0) { setDeltasLoading(false); return }
    setDeltasLoading(true)
    Promise.all(ingredients.map(async (ing) => {
      const delta = await getLatestPriceDelta(ing.id)
      return [ing.id, delta] as [string, number | null]
    })).then((results) => {
      const map: Record<string, number | null> = {}
      results.forEach(([id, delta]) => { map[id] = delta })
      setDeltas(map)
    }).finally(() => setDeltasLoading(false))
  }, [isLoading, ingredients.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(
    () => [...ingredients].sort((a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()),
    [ingredients]
  )

  const anyStale = useMemo(() => sorted.some((i) => isStale(i.last_updated)), [sorted])
  const staleCount = useMemo(() => sorted.filter((i) => isStale(i.last_updated)).length, [sorted])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = sorted
    if (activeTab === 'stale') list = list.filter((i) => isStale(i.last_updated))
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q))
    return list
  }, [sorted, search, activeTab])

  async function handleAddNew() {
    const restaurantId = restaurant?.id
    if (!restaurantId || !newName.trim() || !newPrice) return
    const price = parseFloat(newPrice)
    if (isNaN(price) || price < 0) return
    setIsSavingNew(true)
    try {
      await supabase.from('ingredients').insert({
        restaurant_id: restaurantId, name: newName.trim(),
        price_per_kg: price, unit: newUnit, last_updated: new Date().toISOString(),
      })
      await fetchIngredients(restaurantId)
      setNewName(''); setNewPrice(''); setNewUnit('kg'); setShowNewForm(false)
    } catch { /* silent */ } finally { setIsSavingNew(false) }
  }

  const darkInput = (focused: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', backgroundColor: '#1B2436',
    border: `1px solid ${focused ? '#3FC6F0' : 'rgba(255,255,255,0.14)'}`,
    borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#F4F6FA',
    fontFamily: 'inherit', outline: 'none',
  })

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader
        title="Inventory"
        rightElement={
          <motion.button
            whileTap={{ scale: 0.88, opacity: 0.75 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => setShowNewForm((v) => !v)}
            aria-label="Add ingredient"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <Plus size={18} strokeWidth={1.5} color={showNewForm ? '#3FC6F0' : '#9AA4B8'} />
          </motion.button>
        }
      />

      <div style={{ padding: '0 16px 96px' }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} strokeWidth={1.5} color="#6B7588" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ingredients..."
            style={{ ...darkInput(false), padding: '10px 12px 10px 34px' }} />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {(['all', 'stale'] as FilterTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              backgroundColor: activeTab === tab ? '#3FC6F0' : 'transparent',
              color: activeTab === tab ? '#04212E' : '#6B7588',
              border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12,
              fontWeight: activeTab === tab ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {tab === 'stale' ? `Stale${staleCount > 0 ? ` (${staleCount})` : ''}` : 'All'}
            </button>
          ))}
        </div>

        {/* Stale banner */}
        {anyStale && activeTab === 'all' && (
          <div style={{ backgroundColor: 'rgba(240,169,63,0.14)', border: '1px solid rgba(240,169,63,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} strokeWidth={1.5} color="#F0A93F" />
              <span style={{ fontSize: 11, color: '#F0A93F', lineHeight: 1.4 }}>
                {staleCount} ingredient price{staleCount !== 1 ? 's' : ''} may be outdated — last updated over 7 days ago
              </span>
            </div>
          </div>
        )}

        {/* Inline add form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ overflow: 'hidden', marginBottom: 12 }}
            >
              <div style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#6B7588', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>New ingredient</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="text" placeholder="Ingredient name" value={newName} onChange={(e) => setNewName(e.target.value)}
                    onFocus={() => setNewFocused('name')} onBlur={() => setNewFocused(null)}
                    style={darkInput(newFocused === 'name')} />
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6B7588', pointerEvents: 'none' }}>₹</span>
                    <input type="number" inputMode="decimal" placeholder="Price per kg" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                      onFocus={() => setNewFocused('price')} onBlur={() => setNewFocused(null)}
                      style={{ ...darkInput(newFocused === 'price'), paddingLeft: 24 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {UNITS.map((u) => (
                      <button key={u} type="button" onClick={() => setNewUnit(u)} style={{
                        backgroundColor: newUnit === u ? '#3FC6F0' : '#1B2436', color: newUnit === u ? '#04212E' : '#9AA4B8',
                        border: newUnit === u ? 'none' : '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 9999, padding: '5px 10px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', fontWeight: newUnit === u ? 700 : 400,
                      }}>{u}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setShowNewForm(false)} style={{
                      flex: 1, backgroundColor: 'transparent', color: '#F4F6FA', border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                    }}>Cancel</button>
                    <button type="button" onClick={handleAddNew} disabled={isSavingNew || !newName.trim() || !newPrice} style={{
                      flex: 2, backgroundColor: '#3FC6F0', color: '#04212E', border: 'none',
                      borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      cursor: isSavingNew ? 'not-allowed' : 'pointer', opacity: !newName.trim() || !newPrice ? 0.5 : 1,
                      boxShadow: '0 4px 16px rgba(63,198,240,0.25)',
                    }}>{isSavingNew ? 'Adding...' : 'Add ingredient'}</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ingredient list */}
        {hasError ? (
          <div
            style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => restaurant?.id && loadData(restaurant.id)}
          >
            <p style={{ fontSize: 13, color: '#9AA4B8', margin: 0 }}>Something went wrong — tap to retry</p>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height={72} radius={14} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FA', margin: '0 0 6px' }}>
              {ingredients.length === 0 ? 'No ingredients yet' : 'No matches'}
            </p>
            <p style={{ fontSize: 12, color: '#9AA4B8', margin: 0 }}>
              {ingredients.length === 0 ? 'Tap + to add your first ingredient' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((ing) => {
              const stale = isStale(ing.last_updated)
              const delta = deltas[ing.id]
              const color = letterColor(ing.name)
              return (
                <motion.div
                  key={ing.id}
                  whileTap={{ scale: 0.98, opacity: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={() => navigate(`/ingredients/${ing.id}`)}
                  style={{
                    backgroundColor: stale ? 'rgba(240,169,63,0.06)' : '#161D2B',
                    border: `1px solid ${stale ? 'rgba(240,169,63,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14, padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  }}
                >
                  {/* Letter circle */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color }}>{firstLetter(ing.name)}</span>
                  </div>

                  {/* Name + unit */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</p>
                    <p style={{ fontSize: 10, color: '#9AA4B8', margin: '1px 0 0' }}>{ing.unit}</p>
                  </div>

                  {/* Price + delta */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F4F6FA', margin: 0 }}>₹{ing.price_per_kg}/kg</p>
                    <p style={{ fontSize: 11, margin: '1px 0 0', color: '#6B7588' }}>
                      {deltasLoading ? '—' : delta === null ? '—' : (
                        <span style={{ color: delta > 0 ? '#F0A93F' : '#36D399', fontWeight: 700 }}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                      )}
                      {' '}<span style={{ color: '#6B7588', fontSize: 10 }}>{relativeTime(ing.last_updated)}</span>
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
