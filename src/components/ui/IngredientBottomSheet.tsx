import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIngredientStore } from '../../stores/ingredientStore'
import { ingredientCost } from '../../lib/costCalculator'
import type { Unit } from '../../types'

const UNITS: Unit[] = ['gram', 'kg', 'ml', 'litre', 'piece', 'dozen']

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (ingredientId: string, name: string, quantity: number, unit: Unit, pricePerKg: number) => void
  restaurantId: string
}

export default function IngredientBottomSheet({ isOpen, onClose, onAdd, restaurantId }: Props) {
  const navigate = useNavigate()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<Unit>('gram')

  useEffect(() => {
    if (isOpen && restaurantId && ingredients.length === 0) {
      fetchIngredients(restaurantId)
    }
  }, [isOpen, restaurantId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedId(null)
      setQuantity('')
      setUnit('gram')
    }
  }, [isOpen])

  const filtered = search.trim()
    ? ingredients.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients

  const selectedIng = selectedId ? ingredients.find((i) => i.id === selectedId) : null
  const qty = parseFloat(quantity) || 0
  const liveCost = selectedIng && qty > 0 ? ingredientCost(qty, unit, selectedIng.price_per_kg) : 0

  function handleAdd() {
    if (!selectedIng || qty <= 0) return
    onAdd(selectedIng.id, selectedIng.name, qty, unit, selectedIng.price_per_kg)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 40,
            }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              zIndex: 50,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 6 }}>
              <div style={{ width: 32, height: 4, backgroundColor: '#EDE8F5', borderRadius: 999 }} />
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px 12px',
                borderBottom: '0.5px solid #EDE8F5',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                {selectedId ? selectedIng?.name : 'Add ingredient'}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
              >
                <X size={18} strokeWidth={1.5} color="#888888" />
              </button>
            </div>

            {!selectedId ? (
              <>
                {/* Search */}
                <div style={{ position: 'relative', margin: '12px 16px 8px' }}>
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
                      backgroundColor: '#FFFAF5',
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

                {/* Ingredient list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filtered.map((ing, idx) => (
                    <button
                      key={ing.id}
                      onClick={() => setSelectedId(ing.id)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: idx < filtered.length - 1 ? '0.5px solid #EDE8F5' : 'none',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>{ing.name}</span>
                      <span style={{ fontSize: 11, color: '#888888' }}>
                        ₹{ing.price_per_kg}/{ing.unit}
                      </span>
                    </button>
                  ))}

                  {filtered.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888888', fontSize: 13, padding: '32px 0 16px' }}>
                      No ingredients found
                    </p>
                  )}

                  {/* Create new ingredient link */}
                  <div style={{ padding: '12px 16px', borderTop: '0.5px solid #EDE8F5' }}>
                    <button
                      onClick={() => {
                        onClose()
                        navigate('/ingredients')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#7C3AED',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        padding: 0,
                      }}
                    >
                      + Create new ingredient
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Quantity + unit selection */
              <div style={{ padding: '16px 16px 32px', flex: 1, overflowY: 'auto' }}>
                <p style={{ fontSize: 10, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                  Quantity
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#FFFAF5',
                    border: '0.5px solid #EDE8F5',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: '#1A1A1A',
                    fontFamily: 'inherit',
                    outline: 'none',
                    marginBottom: 16,
                  }}
                />

                <p style={{ fontSize: 10, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                  Unit
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      style={{
                        backgroundColor: unit === u ? '#7C3AED' : '#F5F0FA',
                        color: unit === u ? '#FFFFFF' : '#7C3AED',
                        border: 'none',
                        borderRadius: 9999,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontWeight: unit === u ? 600 : 400,
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                {qty > 0 && (
                  <p style={{ fontSize: 12, color: '#7C3AED', marginBottom: 20, fontWeight: 500 }}>
                    Cost: ₹{liveCost.toFixed(2)}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      color: '#1A1A1A',
                      border: '0.5px solid #EDE8F5',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={qty <= 0}
                    style={{
                      flex: 2,
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor: qty > 0 ? 'pointer' : 'not-allowed',
                      opacity: qty > 0 ? 1 : 0.5,
                      boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    }}
                  >
                    Add to recipe
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
