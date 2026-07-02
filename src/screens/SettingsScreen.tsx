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

const APP_VERSION = '1.0.0'

const CUISINE_LABELS: Record<CuisineType, string> = {
  'north-indian': 'North Indian', 'south-indian': 'South Indian', 'chinese': 'Chinese',
  'continental': 'Continental', 'multi-cuisine': 'Multi-cuisine', 'other': 'Other',
}
const CUISINE_OPTIONS: CuisineType[] = ['north-indian', 'south-indian', 'chinese', 'continental', 'multi-cuisine', 'other']

type EditableField = 'name' | 'city' | 'cuisine_type' | 'fssai_number'

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom  = '﻿'
  const body = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const PANEL: React.CSSProperties = { backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }
const LABEL_STYLE: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: '#6B7588', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, marginTop: 4, paddingLeft: 2 }

function SectionLabel({ label }: { label: string }) {
  return <p style={LABEL_STYLE}>{label}</p>
}

interface SettingsRowProps { label: string; value: string; onTap: () => void; isLast?: boolean }

function SettingsRow({ label, value, onTap, isLast }: SettingsRowProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onTap}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', backgroundColor: 'transparent', border: 'none', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      <span style={{ fontSize: 14, color: '#F4F6FA' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#9AA4B8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'Not set'}
        </span>
        <ChevronRight size={14} strokeWidth={1.5} color="#6B7588" />
      </div>
    </motion.button>
  )
}

const DARK_INPUT: React.CSSProperties = {
  width: '100%', fontSize: 14, color: '#F4F6FA', backgroundColor: '#1B2436',
  border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { restaurant, updateRestaurant } = useRestaurantStore()
  const { ingredients }                  = useIngredientStore()
  const { recipes, getMarginForRecipe }  = useRecipeStore()

  const [editingField, setEditingField] = useState<EditableField | null>(null)
  const [editValue, setEditValue]       = useState('')
  const [isSaving, setIsSaving]         = useState(false)
  const [signingOut, setSigningOut]     = useState(false)

  function startEdit(field: EditableField) {
    if (!restaurant) return
    setEditingField(field); setEditValue(restaurant[field] ?? '')
  }
  function cancelEdit() { setEditingField(null); setEditValue('') }

  async function saveEdit() {
    if (!editingField || !restaurant) return
    setIsSaving(true)
    if (editingField === 'cuisine_type') await updateRestaurant({ cuisine_type: editValue as CuisineType })
    else await updateRestaurant({ [editingField]: editValue.trim() })
    setIsSaving(false); setEditingField(null); setEditValue('')
  }

  function exportRecipesCSV() {
    const rows = recipes.map((r) => {
      const m = getMarginForRecipe(r.id)
      return [r.name, r.category, String(r.selling_price), m ? m.marginPercent.toFixed(1) : 'N/A', m?.status ?? 'N/A']
    })
    downloadCSV('KitchenIQ_Recipes.csv', ['Name', 'Category', 'Selling Price', 'Margin %', 'Status'], rows)
  }

  function exportIngredientsCSV() {
    const rows = ingredients.map((i) => [i.name, String(i.price_per_kg), i.unit, new Date(i.last_updated).toLocaleDateString('en-IN')])
    downloadCSV('KitchenIQ_Ingredients.csv', ['Name', 'Current Price (per kg)', 'Unit', 'Last Updated'], rows)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    useRestaurantStore.getState().clearRestaurant()
    useIngredientStore.getState().clearIngredients()
    useRecipeStore.getState().clearRecipes()
    navigate('/login', { replace: true })
  }

  const EDIT_PANEL: React.CSSProperties = { padding: '12px 14px', backgroundColor: '#1B2436', borderBottom: '1px solid rgba(255,255,255,0.06)' }

  function SaveCancelRow() {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <motion.button whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={saveEdit} disabled={isSaving} style={{ flex: 1, backgroundColor: '#3FC6F0', color: '#04212E', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(63,198,240,0.25)', opacity: isSaving ? 0.7 : 1 }}>
          {isSaving ? 'Saving…' : 'Save'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={cancelEdit} style={{ flex: 1, backgroundColor: 'transparent', color: '#9AA4B8', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 0', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          Cancel
        </motion.button>
      </div>
    )
  }

  function TextEditPanel({ field, placeholder }: { field: EditableField; placeholder: string }) {
    if (editingField !== field) return null
    return (
      <div style={EDIT_PANEL}>
        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }} placeholder={placeholder} style={DARK_INPUT} />
        <SaveCancelRow />
      </div>
    )
  }

  function CuisineEditPanel() {
    if (editingField !== 'cuisine_type') return null
    return (
      <div style={EDIT_PANEL}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {CUISINE_OPTIONS.map((ct) => {
            const selected = editValue === ct
            return (
              <motion.button key={ct} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={() => setEditValue(ct)}
                style={{ padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: selected ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer', border: selected ? 'none' : '1px solid rgba(255,255,255,0.14)', backgroundColor: selected ? '#3FC6F0' : '#1B2436', color: selected ? '#04212E' : '#9AA4B8' }}>
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
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Settings" />

      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Restaurant */}
        <div>
          <SectionLabel label="Restaurant" />
          <div style={PANEL}>
            <SettingsRow label="Restaurant name" value={restaurant?.name ?? ''} onTap={() => startEdit('name')} />
            <TextEditPanel field="name" placeholder="e.g. Punjabi Dhaba" />
            <SettingsRow label="City" value={restaurant?.city ?? ''} onTap={() => startEdit('city')} />
            <TextEditPanel field="city" placeholder="e.g. Delhi" />
            <SettingsRow label="Cuisine type" value={restaurant?.cuisine_type ? CUISINE_LABELS[restaurant.cuisine_type] : ''} onTap={() => startEdit('cuisine_type')} />
            <CuisineEditPanel />
            <SettingsRow label="FSSAI number" value={restaurant?.fssai_number ?? ''} onTap={() => startEdit('fssai_number')} isLast />
            <TextEditPanel field="fssai_number" placeholder="14-digit FSSAI number" />
          </div>
        </div>

        {/* Plan */}
        <div>
          <SectionLabel label="Plan" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FA', margin: '0 0 4px' }}>Your plan</p>
                <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0, lineHeight: 1.5 }}>Full access during beta. Billing starts Month 3.</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3FC6F0', backgroundColor: 'rgba(63,198,240,0.15)', borderRadius: 9999, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>Beta — Free</span>
            </div>
            <div style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.45, pointerEvents: 'none' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#9AA4B8', margin: '0 0 4px' }}>₹499/month — Starter</p>
                <p style={{ fontSize: 11, color: '#6B7588', margin: 0 }}>Unlimited dishes, priority support</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7588', backgroundColor: '#1B2436', borderRadius: 9999, padding: '4px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 12 }}>Coming soon</span>
            </div>
          </div>
        </div>

        {/* Data */}
        <div>
          <SectionLabel label="Data" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'Export recipes as CSV', fn: exportRecipesCSV }, { label: 'Export ingredients as CSV', fn: exportIngredientsCSV }].map(({ label, fn }) => (
              <motion.button key={label} whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={fn}
                style={{ width: '100%', backgroundColor: '#161D2B', color: '#F4F6FA', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{label}</span>
                <ChevronRight size={14} strokeWidth={1.5} color="#6B7588" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <SectionLabel label="Account" />
          <motion.button whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={handleSignOut} disabled={signingOut}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#F0596B', border: '1px solid rgba(240,89,107,0.3)', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: signingOut ? 'not-allowed' : 'pointer', opacity: signingOut ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={15} strokeWidth={1.5} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </motion.button>
        </div>

        {/* About */}
        <div>
          <SectionLabel label="About" />
          <div style={PANEL}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 14, color: '#F4F6FA' }}>App version</span>
              <span style={{ fontSize: 13, color: '#9AA4B8' }}>v{APP_VERSION}</span>
            </div>
            <motion.button whileTap={{ scale: 0.98, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} onClick={() => {}}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 14, color: '#F4F6FA' }}>Privacy policy</span>
              <ChevronRight size={14} strokeWidth={1.5} color="#6B7588" />
            </motion.button>
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
