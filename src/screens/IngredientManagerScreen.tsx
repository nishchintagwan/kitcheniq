import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertTriangle, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useIngredientStore } from '../stores/ingredientStore'
import GlacierHeader from '../components/ui/GlacierHeader'
import Card from '../components/ui/Card'
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
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function IngredientManagerScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [search, setSearch] = useState('')
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUnit, setNewUnit] = useState<Unit>('kg')
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [newFocused, setNewFocused] = useState<string | null>(null)

  async function loadData(restaurantId: string) {
    setIsLoading(true)
    setHasError(false)
    try {
      await fetchIngredients(restaurantId)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!restaurant?.id) return
    loadData(restaurant.id)
  }, [restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sort stalest first (oldest last_updated first)
  const sorted = useMemo(
    () => [...ingredients].sort(
      (a, b) => new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
    ),
    [ingredients]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sorted.filter((i) => i.name.toLowerCase().includes(q)) : sorted
  }, [sorted, search])

  const anyStale = useMemo(() => sorted.some((i) => isStale(i.last_updated)), [sorted])

  const mostRecentMs = useMemo(
    () => ingredients.reduce((max, i) => Math.max(max, new Date(i.last_updated).getTime()), 0),
    [ingredients]
  )
  const headerSubtitle = mostRecentMs > 0
    ? `Last updated: ${relativeTime(new Date(mostRecentMs).toISOString())}`
    : undefined

  async function handleAddNew() {
    const restaurantId = restaurant?.id
    if (!restaurantId || !newName.trim() || !newPrice) return
    const price = parseFloat(newPrice)
    if (isNaN(price) || price < 0) return
    setIsSavingNew(true)
    try {
      await supabase.from('ingredients').insert({
        restaurant_id: restaurantId,
        name: newName.trim(),
        price_per_kg: price,
        unit: newUnit,
        last_updated: new Date().toISOString(),
      })
      await fetchIngredients(restaurantId)
      setNewName('')
      setNewPrice('')
      setNewUnit('kg')
      setShowNewForm(false)
    } catch {
      // silent
    } finally {
      setIsSavingNew(false)
    }
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#FFFAF5',
    border: `0.5px solid ${focused ? '#7C3AED' : '#EDE8F5'}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: '#1A1A1A',
    fontFamily: 'inherit',
    outline: 'none',
  })

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader
        title="Ingredients"
        subtitle={headerSubtitle}
        rightElement={
          <motion.button
            whileTap={{ scale: 0.88, opacity: 0.75 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => setShowNewForm((v) => !v)}
            aria-label="Add ingredient"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={18} strokeWidth={1.5} color="#FFFFFF" />
          </motion.button>
        }
      />

      <div style={{ padding: '16px 16px 96px' }}>

        {/* ── Inline new ingredient form ── */}
        {showNewForm && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 12px',
              }}
            >
              New ingredient
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                placeholder="Ingredient name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onFocus={() => setNewFocused('name')}
                onBlur={() => setNewFocused(null)}
                style={inputStyle(newFocused === 'name')}
              />

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13,
                    color: '#888888',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Price per kg"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  onFocus={() => setNewFocused('price')}
                  onBlur={() => setNewFocused(null)}
                  style={{ ...inputStyle(newFocused === 'price'), paddingLeft: 24 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {UNITS.map((u) => (
                  <motion.button
                    key={u}
                    type="button"
                    whileTap={{ scale: 0.94, opacity: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    onClick={() => setNewUnit(u)}
                    style={{
                      backgroundColor: newUnit === u ? '#7C3AED' : '#F5F0FA',
                      color: newUnit === u ? '#FFFFFF' : '#7C3AED',
                      border: 'none',
                      borderRadius: 9999,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontWeight: newUnit === u ? 600 : 400,
                    }}
                  >
                    {u}
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96, opacity: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={() => setShowNewForm(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    color: '#1A1A1A',
                    border: '0.5px solid #EDE8F5',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96, opacity: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={handleAddNew}
                  disabled={isSavingNew || !newName.trim() || !newPrice}
                  style={{
                    flex: 2,
                    backgroundColor: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: isSavingNew ? 'not-allowed' : 'pointer',
                    opacity: !newName.trim() || !newPrice ? 0.5 : 1,
                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                  }}
                >
                  {isSavingNew ? 'Adding...' : 'Add ingredient'}
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stale alert banner ── */}
        {anyStale && !alertDismissed && (
          <div
            style={{
              backgroundColor: '#FFF8EC',
              border: '0.5px solid rgba(251,185,36,0.3)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={14} strokeWidth={1.5} color="#FBB924" />
            <span style={{ flex: 1, fontSize: 12, color: '#1A1A1A', lineHeight: 1.4 }}>
              Some prices haven't been updated in 7+ days
            </span>
            <motion.button
              whileTap={{ scale: 0.88, opacity: 0.75 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => setAlertDismissed(true)}
              aria-label="Dismiss alert"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}
            >
              <X size={14} strokeWidth={1.5} color="#888888" />
            </motion.button>
          </div>
        )}

        {/* ── Search ── */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
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
            onChange={(e) => setSearch(e.target.value)}
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

        {/* ── Ingredient list ── */}
        {hasError ? (
          <Card onClick={() => restaurant?.id && loadData(restaurant.id)}>
            <p style={{ fontSize: 13, color: '#888888', textAlign: 'center', margin: 0 }}>
              Something went wrong — tap to retry
            </p>
          </Card>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height={72} radius={14} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>
              {ingredients.length === 0 ? 'No ingredients yet' : 'No matches'}
            </p>
            <p style={{ fontSize: 12, color: '#888888', margin: 0 }}>
              {ingredients.length === 0
                ? 'Tap + to add your first ingredient'
                : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((ing) => {
              const stale = isStale(ing.last_updated)
              return (
                <Card key={ing.id} onClick={() => navigate(`/ingredients/${ing.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Stale dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: stale ? '#FBB924' : '#00DC82',
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1A1A1A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ing.name}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#1A1A1A',
                            flexShrink: 0,
                          }}
                        >
                          ₹{ing.price_per_kg}/{ing.unit}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                        <span
                          style={{
                            fontSize: 11,
                            color: stale ? '#FBB924' : '#888888',
                          }}
                        >
                          {stale ? '⚠ ' : ''}Updated {relativeTime(ing.last_updated)}
                        </span>
                        {stale && (
                          <span
                            style={{
                              fontSize: 9,
                              color: '#FBB924',
                              backgroundColor: 'rgba(251,185,36,0.12)',
                              borderRadius: 9999,
                              padding: '2px 6px',
                              fontWeight: 600,
                            }}
                          >
                            STALE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* ── Update all prices FAB (placeholder) ── */}
        {!isLoading && ingredients.length > 0 && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              disabled
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid #EDE8F5',
                borderRadius: 9999,
                padding: '10px 20px',
                fontSize: 12,
                color: '#888888',
                fontFamily: 'inherit',
                cursor: 'not-allowed',
                opacity: 0.5,
              }}
            >
              Update all prices — coming soon
            </button>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
