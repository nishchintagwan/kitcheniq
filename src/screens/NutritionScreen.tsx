import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Leaf, Wheat, Dumbbell, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { getNutritionData } from '../lib/queries'
import DarkHeader from '../components/ui/DarkHeader'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { NutritionData } from '../types'

// ── Dietary tag detection ─────────────────────────────────────────────────

const DAIRY_WORDS  = ['paneer', 'butter', 'ghee', 'cream', 'curd', 'milk', 'cheese', 'khoa', 'mawa', 'dahi']
const MEAT_WORDS   = ['chicken', 'mutton', 'egg', 'fish', 'prawn', 'shrimp', 'lamb', 'beef', 'pork', 'keema', 'seafood']
const JAIN_BANNED  = ['onion', 'garlic', 'potato', 'carrot', 'beetroot']
const GLUTEN_WORDS = ['maida', 'wheat', 'atta', 'barley', 'semolina', 'suji', 'rawa', 'sevia', 'bread', 'flour']

interface DietaryTag {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
}

function detectDietaryTags(ingredientNames: string[], proteinG: number): DietaryTag[] {
  const lower = ingredientNames.map((n) => n.toLowerCase())
  const has = (words: string[]) => words.some((w) => lower.some((n) => n.includes(w)))

  const hasDairy  = has(DAIRY_WORDS)
  const hasMeat   = has(MEAT_WORDS)
  const hasNonJain   = has(JAIN_BANNED)
  const hasGluten = has(GLUTEN_WORDS)

  const tags: DietaryTag[] = []

  if (!hasMeat && hasDairy) {
    tags.push({ label: 'Vegetarian', icon: <Leaf size={12} strokeWidth={1.5} />, color: '#15803D', bg: 'rgba(21,128,61,0.1)' })
  }
  if (!hasMeat && !hasDairy) {
    tags.push({ label: 'Vegan', icon: <Leaf size={12} strokeWidth={1.5} />, color: '#15803D', bg: 'rgba(21,128,61,0.1)' })
  }
  if (!hasNonJain && !hasMeat) {
    tags.push({ label: 'Jain', icon: <Star size={12} strokeWidth={1.5} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' })
  }
  if (!hasGluten) {
    tags.push({ label: 'Gluten-free', icon: <Wheat size={12} strokeWidth={1.5} />, color: '#92400E', bg: 'rgba(146,64,14,0.1)' })
  }
  if (proteinG > 25) {
    tags.push({ label: 'High protein', icon: <Dumbbell size={12} strokeWidth={1.5} />, color: '#1D4ED8', bg: 'rgba(29,78,216,0.1)' })
  }

  return tags
}

// ── FSSAI label rows ──────────────────────────────────────────────────────

interface NutrientRow {
  label: string
  value: string
  indent?: boolean
  bold?: boolean
}

function buildNutrientRows(n: NutritionData): NutrientRow[] {
  const fmt1 = (v: number) => v.toFixed(1)
  return [
    { label: 'Energy',                     value: `${fmt1(n.energy_kcal)} kcal`,  bold: true },
    { label: 'Protein',                    value: `${fmt1(n.protein_g)} g` },
    { label: 'Total Carbohydrate',         value: `${fmt1(n.carbs_g)} g` },
    { label: 'of which sugars',            value: `${fmt1(n.sugars_g)} g`,         indent: true },
    { label: 'Total Fat',                  value: `${fmt1(n.fat_g)} g` },
    { label: 'of which saturated fat',     value: `${fmt1(n.saturated_fat_g)} g`,  indent: true },
    { label: 'Dietary Fibre',              value: `${fmt1(n.fibre_g)} g` },
    { label: 'Sodium',                     value: `${fmt1(n.sodium_mg)} mg` },
  ]
}

// ── PDF download ──────────────────────────────────────────────────────────

function downloadPDF(dishName: string, n: NutritionData) {
  const safeName  = dishName.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '')
  const filename  = `${safeName}_NutritionLabel_KitchenIQ.pdf`

  const rows = buildNutrientRows(n)
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr style="border-bottom:0.5px solid #eee;">
          <td style="padding:7px 8px;${r.indent ? 'padding-left:22px;color:#555;font-size:12px;' : ''}${r.bold ? 'font-weight:700;' : ''}">${r.label}</td>
          <td style="padding:7px 8px;text-align:right;${r.bold ? 'font-weight:700;' : ''}">${r.value}</td>
        </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${filename}</title></head>
<body style="font-family:Arial,sans-serif;max-width:420px;margin:32px auto;padding:0 16px;">
  <div style="border:1.5px solid #1A1A1A;border-radius:4px;overflow:hidden;">
    <div style="background:#1A1A1A;color:#fff;padding:12px 16px;text-align:center;">
      <div style="font-size:16px;font-weight:700;letter-spacing:0.05em;">NUTRITION INFORMATION</div>
      <div style="font-size:11px;margin-top:2px;">(Per serving of 1 Portion)</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${rowsHtml}
    </table>
    <div style="padding:8px 16px;font-size:10px;color:#555;border-top:0.5px solid #eee;">
      *% Daily values are based on a 2000 kcal diet
      ${n.is_ai_estimate ? '<br>† Estimated by AI — verify with a nutritionist' : ''}
    </div>
  </div>
  <p style="text-align:center;font-size:10px;color:#aaa;margin-top:12px;">Generated by KitchenIQ</p>
</body>
</html>`

  const blob = new Blob([html], { type: 'application/octet-stream' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const { id } = useParams<{ id: string }>()
  const { recipes, recipeIngredients, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients }                                         = useIngredientStore()

  const [nutrition, setNutrition]     = useState<NutritionData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const recipe = recipes.find((r) => r.id === id)

  // Load existing nutrition data + recipe ingredients on mount
  useEffect(() => {
    if (!id) return
    async function load() {
      const [existing] = await Promise.all([
        getNutritionData(id!),
        !recipeIngredients[id!] ? fetchRecipeIngredients(id!) : Promise.resolve(),
      ])
      setNutrition(existing)
      setDataLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ingredient names for dietary tag detection
  const ingredientNames = useMemo(() => {
    if (!id) return []
    const items = recipeIngredients[id] ?? []
    return items
      .map((ri) => ingredients.find((i) => i.id === ri.ingredient_id)?.name ?? '')
      .filter(Boolean)
  }, [id, recipeIngredients, ingredients])

  const dietaryTags = useMemo(
    () => detectDietaryTags(ingredientNames, nutrition?.protein_g ?? 0),
    [ingredientNames, nutrition?.protein_g]
  )

  async function handleCalculate() {
    if (!id || !recipe) return
    setCalculating(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-nutrition', {
        body: { recipeId: id },
      })
      if (fnError || data?.error) {
        setError('Something went wrong — tap to retry')
      } else if (data) {
        setNutrition(data as NutritionData)
      }
    } catch {
      setError('Something went wrong — tap to retry')
    } finally {
      setCalculating(false)
    }
  }

  function handleWhatsApp() {
    if (!recipe || !nutrition) return
    const rows = buildNutrientRows(nutrition)
    const text = encodeURIComponent(
      `🥗 *${recipe.name}* — Nutrition per serving\n\n` +
        rows.map((r) => `${r.indent ? '  ' : ''}${r.label}: ${r.value}`).join('\n') +
        '\n\n_Generated by KitchenIQ_'
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <DarkHeader
        title="Nutrition label"
        subtitle={recipe?.name}
        showBack
        breadcrumb="Dish"
      />

      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={200} radius={14} />
            <Skeleton height={48}  radius={10} />
          </div>

        ) : !nutrition ? (

          /* ── Generate state ── */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 14,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
            }}
          >
            <Sparkles size={32} strokeWidth={1.5} color="#7C3AED" />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>
              Generate nutrition label
            </p>
            <p style={{ fontSize: 13, color: '#888888', margin: 0, lineHeight: 1.5 }}>
              AI will calculate energy, protein, carbs, fat and more based on your ingredients.
            </p>
            {error && (
              <p style={{ fontSize: 12, color: '#FF505F', margin: 0 }}>{error}</p>
            )}
            <motion.button
              whileTap={{ scale: 0.96, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handleCalculate}
              disabled={calculating}
              style={{
                backgroundColor: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: calculating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                opacity: calculating ? 0.7 : 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {calculating ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Calculating…
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={1.5} />
                  Calculate nutrition
                </>
              )}
            </motion.button>
          </div>

        ) : (
          <>
            {/* Skeleton while calculating a fresh result over existing data */}
            {calculating && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={280} radius={14} />
                <Skeleton height={48}  radius={10} />
              </div>
            )}

            {!calculating && (
              <>
                {/* ── Section 1: FSSAI label ── */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #1A1A1A',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  {/* Label header */}
                  <div
                    style={{
                      backgroundColor: '#1A1A1A',
                      padding: '12px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        margin: 0,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Nutrition Information
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '3px 0 0' }}>
                      (Per serving of 1 Portion)
                    </p>
                  </div>

                  {/* Nutrient rows */}
                  {buildNutrientRows(nutrition).map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: row.indent ? '6px 16px 6px 28px' : '8px 16px',
                        borderBottom: '0.5px solid #F0F0F0',
                        backgroundColor: row.indent ? '#FAFAFA' : '#FFFFFF',
                      }}
                    >
                      <span
                        style={{
                          fontSize: row.indent ? 12 : 13,
                          fontWeight: row.bold ? 700 : row.indent ? 400 : 500,
                          color: row.indent ? '#888888' : '#1A1A1A',
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontSize: row.indent ? 12 : 13,
                          fontWeight: row.bold ? 700 : 500,
                          color: row.indent ? '#888888' : '#1A1A1A',
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Footer */}
                  <div
                    style={{
                      padding: '8px 16px',
                      borderTop: '0.5px solid #E0E0E0',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <p style={{ fontSize: 10, color: '#888888', margin: 0, lineHeight: 1.5 }}>
                      *% Daily values are based on a 2000 kcal diet
                    </p>
                    {nutrition.is_ai_estimate && (
                      <p style={{ fontSize: 10, color: '#888888', margin: '2px 0 0', lineHeight: 1.5 }}>
                        † Estimated by AI — verify with a nutritionist
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Section 2: Dietary tags ── */}
                {dietaryTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dietaryTags.map((tag) => (
                      <div
                        key={tag.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: tag.bg,
                          borderRadius: 9999,
                          padding: '5px 11px',
                        }}
                      >
                        <span style={{ color: tag.color, display: 'flex', alignItems: 'center' }}>
                          {tag.icon}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tag.color }}>
                          {tag.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Section 3: Export ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.96, opacity: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    onClick={() => downloadPDF(recipe?.name ?? 'Dish', nutrition)}
                    style={{
                      width: '100%',
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '13px 0',
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    }}
                  >
                    Download PDF
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96, opacity: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    onClick={() => {}}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: '#1A1A1A',
                      border: '0.5px solid #EDE8F5',
                      borderRadius: 10,
                      padding: '13px 0',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Save as image
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.96, opacity: 0.85 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    onClick={handleWhatsApp}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: '#1A1A1A',
                      border: '0.5px solid #EDE8F5',
                      borderRadius: 10,
                      padding: '13px 0',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Share on WhatsApp
                  </motion.button>
                </div>

              </>
            )}
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
