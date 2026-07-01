import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { useRecipeStore } from '../stores/recipeStore'
import GlacierHeader from '../components/ui/GlacierHeader'
import BottomNav from '../components/ui/BottomNav'
import type { CuisineType } from '../types'

// ── Constants ────────────────────────────────────────────────────────────────

const APP_VERSION = '1.0.0'

const CUISINE_LABELS: Record<CuisineType, string> = {
  'north-indian':  'North Indian',
  'south-indian':  'South Indian',
  'chinese':       'Chinese',
  'continental':   'Continental',
  'multi-cuisine': 'Multi-cuisine',
  'other':         'Other',
}

const CUISINE_OPTIONS: CuisineType[] = [
  'north-indian', 'south-indian', 'chinese', 'continental', 'multi-cuisine', 'other',
]

type EditableField = 'name' | 'city' | 'cuisine_type' | 'fssai_number'

// ── CSV helpers ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom  = '﻿'
  const body = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#888888',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 4,
        paddingLeft: 2,
      }}
    >
      {label}
    </p>
  )
}

interface SettingsRowProps {
  label: string
  value: string
  onTap: () => void
  isLast?: boolean
}

function SettingsRow({ label, value, onTap, isLast }: SettingsRowProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onTap}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 14px',
        backgroundColor: '#FFFFFF',
        border: 'none',
        borderBottom: isLast ? 'none' : '0.5px solid #F5F5F5',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 14, color: '#1A1A1A' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            fontSize: 13,
            color: '#888888',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value || 'Not set'}
        </span>
        <ChevronRight size={14} strokeWidth={1.5} color="#CCCCCC" />
      </div>
    </motion.button>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { restaurant, updateRestaurant } = useRestaurantStore()
  const { ingredients }                  = useIngredientStore()
  const { recipes, getMarginForRecipe }  = useRecipeStore()

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [editValue, setEditValue]       = useState('')
  const [isSaving, setIsSaving]         = useState(false)
  const [signingOut, setSigningOut]     = useState(false)

  // ── Inline edit handlers ─────────────────────────────────────────────────

  function startEdit(field: EditableField) {
    if (!restaurant) return
    setEditingField(field)
    setEditValue(restaurant[field] ?? '')
  }

  function cancelEdit() {
    setEditingField(null)
    setEditValue('')
  }

  async function saveEdit() {
    if (!editingField || !restaurant) return
    setIsSaving(true)
    if (editingField === 'cuisine_type') {
      await updateRestaurant({ cuisine_type: editValue as CuisineType })
    } else {
      await updateRestaurant({ [editingField]: editValue.trim() })
    }
    setIsSaving(false)
    setEditingField(null)
    setEditValue('')
  }

  // ── CSV exports ──────────────────────────────────────────────────────────

  function exportRecipesCSV() {
    const headers = ['Name', 'Category', 'Selling Price', 'Margin %', 'Status']
    const rows    = recipes.map((r) => {
      const m = getMarginForRecipe(r.id)
      return [
        r.name,
        r.category,
        String(r.selling_price),
        m ? m.marginPercent.toFixed(1) : 'N/A',
        m?.status ?? 'N/A',
      ]
    })
    downloadCSV('KitchenIQ_Recipes.csv', headers, rows)
  }

  function exportIngredientsCSV() {
    const headers = ['Name', 'Current Price (per kg)', 'Unit', 'Last Updated']
    const rows    = ingredients.map((i) => [
      i.name,
      String(i.price_per_kg),
      i.unit,
      new Date(i.last_updated).toLocaleDateString('en-IN'),
    ])
    downloadCSV('KitchenIQ_Ingredients.csv', headers, rows)
  }

  // ── Sign out ─────────────────────────────────────────────────────────────

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    useRestaurantStore.getState().clearRestaurant()
    useIngredientStore.getState().clearIngredients()
    useRecipeStore.getState().clearRecipes()
    navigate('/login', { replace: true })
  }

  // ── Edit panels ──────────────────────────────────────────────────────────

  function SaveCancelRow() {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <motion.button
          whileTap={{ scale: 0.96, opacity: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={saveEdit}
          disabled={isSaving}
          style={{
            flex: 1,
            backgroundColor: '#7C3AED',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96, opacity: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={cancelEdit}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            color: '#888888',
            border: '0.5px solid #EDE8F5',
            borderRadius: 8,
            padding: '10px 0',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Cancel
        </motion.button>
      </div>
    )
  }

  function TextEditPanel({ field, placeholder }: { field: EditableField; placeholder: string }) {
    if (editingField !== field) return null
    return (
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: '#FAFAFA',
          borderBottom: '0.5px solid #EDE8F5',
        }}
      >
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit()
            if (e.key === 'Escape') cancelEdit()
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            fontSize: 14,
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF',
            border: '0.5px solid #EDE8F5',
            borderRadius: 8,
            padding: '10px 12px',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <SaveCancelRow />
      </div>
    )
  }

  function CuisineEditPanel() {
    if (editingField !== 'cuisine_type') return null
    return (
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: '#FAFAFA',
          borderBottom: '0.5px solid #EDE8F5',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {CUISINE_OPTIONS.map((ct) => {
            const selected = editValue === ct
            return (
              <motion.button
                key={ct}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setEditValue(ct)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: selected ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  border: selected ? 'none' : '0.5px solid #EDE8F5',
                  backgroundColor: selected ? '#7C3AED' : '#FFFFFF',
                  color: selected ? '#FFFFFF' : '#1A1A1A',
                }}
              >
                {CUISINE_LABELS[ct]}
              </motion.button>
            )
          })}
        </div>
        <SaveCancelRow />
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader title="Settings" />

      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Section 1: Restaurant ── */}
        <div>
          <SectionLabel label="Restaurant" />
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <SettingsRow
              label="Restaurant name"
              value={restaurant?.name ?? ''}
              onTap={() => startEdit('name')}
            />
            <TextEditPanel field="name" placeholder="e.g. Punjabi Dhaba" />

            <SettingsRow
              label="City"
              value={restaurant?.city ?? ''}
              onTap={() => startEdit('city')}
            />
            <TextEditPanel field="city" placeholder="e.g. Delhi" />

            <SettingsRow
              label="Cuisine type"
              value={restaurant?.cuisine_type ? CUISINE_LABELS[restaurant.cuisine_type] : ''}
              onTap={() => startEdit('cuisine_type')}
            />
            <CuisineEditPanel />

            <SettingsRow
              label="FSSAI number"
              value={restaurant?.fssai_number ?? ''}
              onTap={() => startEdit('fssai_number')}
              isLast
            />
            <TextEditPanel field="fssai_number" placeholder="14-digit FSSAI number" />
          </div>
        </div>

        {/* ── Section 2: Plan ── */}
        <div>
          <SectionLabel label="Plan" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid #EDE8F5',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>
                  Your plan
                </p>
                <p style={{ fontSize: 11, color: '#888888', margin: 0, lineHeight: 1.5 }}>
                  Full access during beta. Billing starts Month 3.
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#7C3AED',
                  backgroundColor: 'rgba(124,58,237,0.15)',
                  borderRadius: 9999,
                  padding: '4px 10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                Beta — Free
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#F8F8F8',
                border: '0.5px solid #E8E8E8',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: 0.55,
                pointerEvents: 'none',
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#888888', margin: '0 0 4px' }}>
                  ₹499/month — Starter
                </p>
                <p style={{ fontSize: 11, color: '#AAAAAA', margin: 0 }}>
                  Unlimited dishes, priority support
                </p>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#AAAAAA',
                  backgroundColor: '#E8E8E8',
                  borderRadius: 9999,
                  padding: '4px 8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                Coming soon
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Data ── */}
        <div>
          <SectionLabel label="Data" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <motion.button
              whileTap={{ scale: 0.96, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={exportRecipesCSV}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '0.5px solid #EDE8F5',
                borderRadius: 10,
                padding: '13px 16px',
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Export recipes as CSV</span>
              <ChevronRight size={14} strokeWidth={1.5} color="#CCCCCC" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={exportIngredientsCSV}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                color: '#1A1A1A',
                border: '0.5px solid #EDE8F5',
                borderRadius: 10,
                padding: '13px 16px',
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Export ingredients as CSV</span>
              <ChevronRight size={14} strokeWidth={1.5} color="#CCCCCC" />
            </motion.button>
          </div>
        </div>

        {/* ── Section 4: Account ── */}
        <div>
          <SectionLabel label="Account" />
          <motion.button
            whileTap={{ scale: 0.96, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: '#FF505F',
              border: '0.5px solid rgba(255,80,95,0.3)',
              borderRadius: 10,
              padding: '13px 16px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={15} strokeWidth={1.5} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </motion.button>
        </div>

        {/* ── Section 5: About ── */}
        <div>
          <SectionLabel label="About" />
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 14px',
                borderBottom: '0.5px solid #F5F5F5',
              }}
            >
              <span style={{ fontSize: 14, color: '#1A1A1A' }}>App version</span>
              <span style={{ fontSize: 13, color: '#888888' }}>v{APP_VERSION}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.98, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => {}}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14, color: '#1A1A1A' }}>Privacy policy</span>
              <ChevronRight size={14} strokeWidth={1.5} color="#CCCCCC" />
            </motion.button>
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
