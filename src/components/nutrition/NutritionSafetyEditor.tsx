'use client'

import Link from 'next/link'
import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, HeartPulse, ShieldCheck, UtensilsCrossed } from 'lucide-react'

import {
  getNutritionSafetyRoute,
  normalizeNutritionStringList,
  type NutritionBudgetTier,
  type NutritionCookingAccess,
  type NutritionDietType,
  type NutritionFoodSetup,
  type NutritionSafetySummary,
} from '@/lib/nutrition-safety'
import {
  saveNutritionSafetyProfile,
  type SaveNutritionSafetyPayload,
} from '@/app/actions/nutrition-safety'

interface NutritionSafetyEditorProps {
  role: 'athlete' | 'individual'
  initialSummary: NutritionSafetySummary
}

interface MultiSelectOption {
  value: string
  label: string
  aliases?: string[]
}

const ALLERGY_OPTIONS: MultiSelectOption[] = [
  { value: 'peanut', label: 'Peanut', aliases: ['groundnut'] },
  { value: 'tree nut', label: 'Tree nuts', aliases: ['nuts', 'almond', 'cashew', 'walnut', 'pistachio'] },
  { value: 'dairy', label: 'Milk or dairy', aliases: ['milk', 'lactose', 'curd', 'yogurt', 'paneer', 'cheese'] },
  { value: 'egg', label: 'Egg' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish', aliases: ['prawn', 'shrimp', 'crab', 'lobster'] },
  { value: 'soy', label: 'Soy' },
  { value: 'wheat', label: 'Wheat', aliases: ['atta', 'maida'] },
  { value: 'gluten', label: 'Gluten' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'mustard', label: 'Mustard' },
  { value: 'chickpea', label: 'Chickpea or besan', aliases: ['besan', 'chana'] },
]

const MEDICAL_CONDITION_OPTIONS: MultiSelectOption[] = [
  { value: 'diabetes', label: 'Diabetes or prediabetes' },
  { value: 'thyroid disorder', label: 'Thyroid disorder', aliases: ['hypothyroid', 'hyperthyroid'] },
  { value: 'iron deficiency', label: 'Iron deficiency or anemia', aliases: ['anaemia', 'anemia'] },
  { value: 'pcos', label: 'PCOS or hormonal imbalance', aliases: ['pcod'] },
  { value: 'hypertension', label: 'Hypertension or blood pressure issues', aliases: ['high blood pressure'] },
  { value: 'high cholesterol', label: 'High cholesterol or lipids', aliases: ['lipid disorder'] },
  { value: 'kidney disorder', label: 'Kidney disease or renal issues', aliases: ['renal disease'] },
  { value: 'liver disorder', label: 'Liver disease or hepatic issues', aliases: ['fatty liver'] },
  { value: 'gi condition', label: 'GI or gut condition', aliases: ['ibs', 'ibd', 'gastritis', 'reflux'] },
  { value: 'asthma', label: 'Asthma or respiratory condition', aliases: ['respiratory condition'] },
  { value: 'eating disorder history', label: 'Eating disorder history', aliases: ['disordered eating'] },
  { value: 'injury rehab nutrition needs', label: 'Injury rehab nutrition needs', aliases: ['post surgery', 'fracture recovery'] },
]

const DISLIKE_OPTIONS: MultiSelectOption[] = [
  { value: 'mushrooms', label: 'Mushrooms' },
  { value: 'paneer', label: 'Paneer' },
  { value: 'egg', label: 'Egg' },
  { value: 'fish', label: 'Fish' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'mayonnaise', label: 'Mayonnaise' },
  { value: 'very spicy food', label: 'Very spicy food', aliases: ['spicy', 'too spicy'] },
  { value: 'deep fried food', label: 'Deep-fried foods', aliases: ['fried food'] },
  { value: 'milk', label: 'Milk', aliases: ['dairy milk'] },
  { value: 'curd', label: 'Curd or yogurt', aliases: ['yogurt', 'yoghurt'] },
  { value: 'whey protein', label: 'Whey protein', aliases: ['whey'] },
  { value: 'banana', label: 'Banana' },
]

const CUISINE_OPTIONS: MultiSelectOption[] = [
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'west_indian', label: 'West Indian' },
  { value: 'east_indian', label: 'East Indian' },
  { value: 'north_east_indian', label: 'North-East Indian' },
  { value: 'punjabi', label: 'Punjabi' },
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'maharashtrian', label: 'Maharashtrian' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'rajasthani', label: 'Rajasthani' },
  { value: 'andhra_telugu', label: 'Andhra / Telugu' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'kerala', label: 'Kerala' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'kashmiri', label: 'Kashmiri' },
  { value: 'goan', label: 'Goan' },
  { value: 'odia', label: 'Odia' },
  { value: 'bihari', label: 'Bihari' },
  { value: 'mughlai', label: 'Mughlai' },
  { value: 'awadhi', label: 'Awadhi' },
  { value: 'hyderabadi', label: 'Hyderabadi' },
  { value: 'chettinad', label: 'Chettinad' },
  { value: 'malvani', label: 'Malvani' },
  { value: 'indo_chinese', label: 'Indo-Chinese' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'middle_eastern', label: 'Middle Eastern', aliases: ['middle eastern'] },
  { value: 'greek', label: 'Greek' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'persian', label: 'Persian' },
  { value: 'arabic', label: 'Arabic / Levant' },
  { value: 'italian', label: 'Italian' },
  { value: 'french', label: 'French' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'continental_european', label: 'Continental European', aliases: ['continental'] },
  { value: 'mexican', label: 'Mexican' },
  { value: 'latin_american', label: 'Latin American', aliases: ['latin american'] },
  { value: 'american', label: 'American' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'thai', label: 'Thai' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'malaysian', label: 'Malaysian' },
  { value: 'singaporean', label: 'Singaporean' },
  { value: 'indonesian', label: 'Indonesian' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'sri_lankan', label: 'Sri Lankan', aliases: ['sri lankan'] },
  { value: 'nepali', label: 'Nepali' },
  { value: 'tibetan', label: 'Tibetan' },
  { value: 'african', label: 'African' },
  { value: 'ethiopian', label: 'Ethiopian' },
]

export function NutritionSafetyEditor({
  role,
  initialSummary,
}: NutritionSafetyEditorProps) {
  const router = useRouter()
  const initialAllergySelection = React.useMemo(
    () => splitOptionSelections(initialSummary.allergies, ALLERGY_OPTIONS),
    [initialSummary.allergies]
  )
  const initialMedicalSelection = React.useMemo(
    () => splitOptionSelections(initialSummary.medicalConditions, MEDICAL_CONDITION_OPTIONS),
    [initialSummary.medicalConditions]
  )
  const initialDislikeSelection = React.useMemo(
    () => splitOptionSelections(initialSummary.dislikes, DISLIKE_OPTIONS),
    [initialSummary.dislikes]
  )
  const initialCuisineSelection = React.useMemo(
    () => splitOptionSelections(initialSummary.preferredCuisines, CUISINE_OPTIONS),
    [initialSummary.preferredCuisines]
  )
  const [dietType, setDietType] = React.useState<NutritionDietType>(initialSummary.dietType)
  const [allergyStatus, setAllergyStatus] = React.useState<'' | 'none' | 'has_allergies'>(
    initialSummary.allergyStatus === 'unknown' ? '' : initialSummary.allergyStatus
  )
  const [selectedAllergies, setSelectedAllergies] = React.useState<string[]>(
    initialAllergySelection.selected
  )
  const [customAllergies, setCustomAllergies] = React.useState(initialAllergySelection.custom.join(', '))
  const [selectedDislikes, setSelectedDislikes] = React.useState<string[]>(
    initialDislikeSelection.selected
  )
  const [customDislikes, setCustomDislikes] = React.useState(initialDislikeSelection.custom.join(', '))
  const [selectedPreferredCuisines, setSelectedPreferredCuisines] = React.useState<string[]>(
    initialCuisineSelection.selected
  )
  const [customPreferredCuisines, setCustomPreferredCuisines] = React.useState(
    initialCuisineSelection.custom.join(', ')
  )
  const [medicalStatus, setMedicalStatus] = React.useState<'' | 'none' | 'has_conditions'>(
    initialSummary.medicalStatus === 'unknown' ? '' : initialSummary.medicalStatus
  )
  const [selectedMedicalConditions, setSelectedMedicalConditions] = React.useState<string[]>(
    initialMedicalSelection.selected
  )
  const [customMedicalConditions, setCustomMedicalConditions] = React.useState(
    initialMedicalSelection.custom.join(', ')
  )
  const [medications, setMedications] = React.useState(initialSummary.medications.join(', '))
  const [budgetTier, setBudgetTier] = React.useState<NutritionBudgetTier | ''>(initialSummary.budgetTier || '')
  const [foodSetup, setFoodSetup] = React.useState<NutritionFoodSetup | ''>(initialSummary.foodSetup || '')
  const [cookingAccess, setCookingAccess] = React.useState<NutritionCookingAccess | ''>(initialSummary.cookingAccess || '')
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const saveLabel =
    role === 'athlete' ? 'Save nutrition safety for athlete guidance' : 'Save nutrition safety for daily guidance'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const allergies = composeSelections(selectedAllergies, customAllergies)
    const medicalConditions = composeSelections(selectedMedicalConditions, customMedicalConditions)
    const dislikes = composeSelections(selectedDislikes, customDislikes)
    const preferredCuisines = composeSelections(selectedPreferredCuisines, customPreferredCuisines)
    const medicationList = normalizeNutritionStringList(medications)

    if (!allergyStatus) {
      setError('Please answer whether you have food allergies before saving nutrition safety.')
      return
    }

    if (!medicalStatus) {
      setError('Please answer whether you have medical conditions or health issues that should affect nutrition advice.')
      return
    }

    if (allergyStatus === 'has_allergies' && allergies.length === 0) {
      setError('Please select or list the food allergies that Creeda should avoid.')
      return
    }

    if (
      medicalStatus === 'has_conditions' &&
      medicalConditions.length === 0 &&
      medicationList.length === 0
    ) {
      setError('Please select or list at least one medical condition or medication for safe nutrition guidance.')
      return
    }

    setIsSaving(true)

    const payload: SaveNutritionSafetyPayload = {
      role,
      dietType,
      allergyStatus,
      allergies,
      dislikes,
      medicalStatus,
      medicalConditions,
      medications: medicationList,
      budgetTier,
      foodSetup,
      cookingAccess,
      preferredCuisines,
    }

    const result = await saveNutritionSafetyProfile(payload)
    setIsSaving(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    setSuccess('Nutrition safety updated. Returning you to the dashboard.')
    router.push(result?.redirectTo || `/${role}/dashboard`)
    router.refresh()
  }

  return (
    <div className="space-y-8 pb-20">
      <section className="rounded-[2.2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(245,124,0,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_44%),rgba(255,255,255,0.02)] p-8 sm:p-10">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Nutrition Safety</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-white">
            Ask first, then advise.
          </h1>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
            Creeda now asks about allergies and medical health before showing personalized meals, fueling, or supplement guidance. This keeps the nutrition layer aligned with the blueprint’s trust-first decision model.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <StatusChip icon={ShieldCheck} label={initialSummary.statusLabel} />
            <StatusChip icon={UtensilsCrossed} label={initialSummary.gateTitle} />
            {initialSummary.needsClinicalReview ? (
              <StatusChip icon={HeartPulse} label="Clinical caution active" tone="amber" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Current gate state</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">{initialSummary.gateTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{initialSummary.summary}</p>
          <div className="mt-5 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Next step</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{initialSummary.nextAction}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="Diet pattern" value={dietTypeLabel(initialSummary.dietType)} />
            <MiniMetric
              label="Allergies"
              value={initialSummary.allergyStatus === 'has_allergies' ? `${initialSummary.allergies.length} listed` : initialSummary.allergyStatus === 'none' ? 'None' : 'Not answered'}
            />
            <MiniMetric
              label="Medical health"
              value={initialSummary.medicalStatus === 'has_conditions' ? `${Math.max(initialSummary.medicalConditions.length, 1)} flagged` : initialSummary.medicalStatus === 'none' ? 'None' : 'Not answered'}
            />
            <MiniMetric
              label="Detailed advice"
              value={initialSummary.blocksDetailedAdvice ? 'Paused' : 'Available'}
            />
            <MiniMetric label="Budget lens" value={budgetTierLabel(initialSummary.budgetTier)} />
            <MiniMetric label="Food setup" value={foodSetupLabel(initialSummary.foodSetup)} />
            <MiniMetric label="Cooking access" value={cookingAccessLabel(initialSummary.cookingAccess)} />
            <MiniMetric label="Cuisine style" value={cuisinePreferenceLabel(initialSummary.preferredCuisines)} />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7 space-y-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Update answers</p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
              Give Creeda the safety context first
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Keep it simple. Answer what applies today. You can change this anytime if allergies, medications, or diet style change.
            </p>
          </div>

          <FieldGroup label="Current diet pattern" hint="This helps filter the meal library before any personalized advice is shown.">
            <select
              value={dietType}
              onChange={(event) => setDietType(event.target.value as NutritionDietType)}
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all focus:border-primary/40"
            >
              <option value="omnivore">Both veg and non-veg</option>
              <option value="veg">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="jain">Jain</option>
            </select>
          </FieldGroup>

          <FieldGroup label="Do you have food allergies?" hint="Creeda should only show detailed meal ideas after this is explicit.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleCard
                active={allergyStatus === 'none'}
                title="No allergies"
                body="Nutrition advice can unlock once the rest of the safety questions are answered."
                onClick={() => {
                  setAllergyStatus('none')
                  setSelectedAllergies([])
                  setCustomAllergies('')
                }}
              />
              <ToggleCard
                active={allergyStatus === 'has_allergies'}
                title="Yes, I have allergies"
                body="Creeda will filter meals against the allergies you list."
                onClick={() => setAllergyStatus('has_allergies')}
              />
            </div>
            {allergyStatus === 'has_allergies' ? (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Select all that apply</p>
                <OptionChipGrid
                  options={ALLERGY_OPTIONS}
                  selected={selectedAllergies}
                  onToggle={(value) => setSelectedAllergies((current) => toggleChipSelection(current, value))}
                />
                <textarea
                  value={customAllergies}
                  onChange={(event) => setCustomAllergies(event.target.value)}
                  rows={2}
                  placeholder="Other allergies (comma separated), example: kiwi, sunflower seeds"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary/40"
                />
              </div>
            ) : null}
          </FieldGroup>

          <FieldGroup label="Any medical conditions or ongoing health issues that should affect nutrition advice?" hint="Include illnesses, metabolic issues, GI concerns, recovery-related conditions, or anything that changes safe fueling choices.">
            <div className="grid gap-3 sm:grid-cols-2">
              <ToggleCard
                active={medicalStatus === 'none'}
                title="No medical issues to note"
                body="Creeda can unlock detailed nutrition once the safety screen is complete."
                onClick={() => {
                  setMedicalStatus('none')
                  setSelectedMedicalConditions([])
                  setCustomMedicalConditions('')
                  setMedications('')
                }}
              />
              <ToggleCard
                active={medicalStatus === 'has_conditions'}
                title="Yes, there is medical context"
                body="Creeda will pause detailed nutrition advice and show a caution state."
                onClick={() => setMedicalStatus('has_conditions')}
              />
            </div>
            {medicalStatus === 'has_conditions' ? (
              <div className="mt-3 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Select all that apply</p>
                <OptionChipGrid
                  options={MEDICAL_CONDITION_OPTIONS}
                  selected={selectedMedicalConditions}
                  onToggle={(value) => setSelectedMedicalConditions((current) => toggleChipSelection(current, value))}
                />
                <textarea
                  value={customMedicalConditions}
                  onChange={(event) => setCustomMedicalConditions(event.target.value)}
                  rows={2}
                  placeholder="Other health issues (comma separated), example: celiac disease"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary/40"
                />
                <textarea
                  value={medications}
                  onChange={(event) => setMedications(event.target.value)}
                  rows={2}
                  placeholder="Optional: list regular medication if it could affect fueling, hydration, or supplement safety"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary/40"
                />
              </div>
            ) : null}
          </FieldGroup>

          <FieldGroup label="Foods you dislike or want avoided" hint="Optional. This improves practicality after the safety gate is cleared.">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Select all that apply</p>
              <OptionChipGrid
                options={DISLIKE_OPTIONS}
                selected={selectedDislikes}
                onToggle={(value) => setSelectedDislikes((current) => toggleChipSelection(current, value))}
              />
              <textarea
                value={customDislikes}
                onChange={(event) => setCustomDislikes(event.target.value)}
                rows={2}
                placeholder="Other foods to avoid (comma separated), example: olives, beetroot"
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary/40"
              />
            </div>
          </FieldGroup>

          <FieldGroup
            label="Make the meal plan practical for your real life"
            hint="Optional. This is where Creeda adapts meals for Indian food reality like budget, kitchen access, hostel or canteen life, travel, and regional staples."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Budget tier</span>
                <select
                  value={budgetTier}
                  onChange={(event) => setBudgetTier(event.target.value as NutritionBudgetTier | '')}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all focus:border-primary/40"
                >
                  <option value="">Prefer not to say</option>
                  <option value="budget">Budget-aware</option>
                  <option value="standard">Standard</option>
                  <option value="performance">Performance-first</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Food setup</span>
                <select
                  value={foodSetup}
                  onChange={(event) => setFoodSetup(event.target.value as NutritionFoodSetup | '')}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all focus:border-primary/40"
                >
                  <option value="">Prefer not to say</option>
                  <option value="home_kitchen">Home kitchen</option>
                  <option value="hostel_canteen">Hostel or canteen</option>
                  <option value="mixed">Mixed setup</option>
                  <option value="travel_heavy">Travel-heavy</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cooking access</span>
                <select
                  value={cookingAccess}
                  onChange={(event) => setCookingAccess(event.target.value as NutritionCookingAccess | '')}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all focus:border-primary/40"
                >
                  <option value="">Prefer not to say</option>
                  <option value="full_kitchen">Full kitchen</option>
                  <option value="basic_reheat">Basic reheat only</option>
                  <option value="minimal">Minimal or no cooking</option>
                </select>
              </label>

            </div>
            <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preferred cuisines (select multiple)</p>
              <OptionChipGrid
                options={CUISINE_OPTIONS}
                selected={selectedPreferredCuisines}
                onToggle={(value) => setSelectedPreferredCuisines((current) => toggleChipSelection(current, value))}
              />
              <textarea
                value={customPreferredCuisines}
                onChange={(event) => setCustomPreferredCuisines(event.target.value)}
                rows={2}
                placeholder="Other cuisines (comma separated), example: malvani, chettinad"
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-primary/40"
              />
            </div>
          </FieldGroup>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Nutrition Safety'}
            </button>
            <Link
              href={`/${role}/dashboard`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-200 transition-all hover:bg-white/[0.06]"
            >
              Back To Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            {saveLabel}. Creeda will only unlock detailed meals, fueling, and supplement guidance once the allergy and medical-health screen is complete.
          </p>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-white">Why this changed</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              The blueprint called for trust and explainability to be visible everywhere. Nutrition is one of the places where trust can break fastest, so Creeda now asks for explicit allergy and medical context before it treats food guidance like a normal dashboard recommendation.
            </p>
            <Link
              href={getNutritionSafetyRoute(role)}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"
            >
              You’re in the right place
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>
      </div>
      {children}
    </section>
  )
}

function ToggleCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${
        active
          ? 'border-primary/30 bg-primary/10'
          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]'
      }`}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
    </button>
  )
}

function OptionChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: MultiSelectOption[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function StatusChip({
  icon: Icon,
  label,
  tone = 'blue',
}: {
  icon: typeof ShieldCheck
  label: string
  tone?: 'blue' | 'amber'
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] ${
        tone === 'amber'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
          : 'border-blue-500/20 bg-blue-500/10 text-blue-200'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-black tracking-tight text-white">{value}</p>
    </div>
  )
}

function dietTypeLabel(value: NutritionDietType) {
  if (value === 'veg') return 'Vegetarian'
  if (value === 'vegan') return 'Vegan'
  if (value === 'jain') return 'Jain'
  return 'Both veg and non-veg'
}

function budgetTierLabel(value: NutritionBudgetTier | null) {
  if (value === 'budget') return 'Budget-aware'
  if (value === 'standard') return 'Standard'
  if (value === 'performance') return 'Performance-first'
  return 'Not set'
}

function foodSetupLabel(value: NutritionFoodSetup | null) {
  if (value === 'home_kitchen') return 'Home kitchen'
  if (value === 'hostel_canteen') return 'Hostel or canteen'
  if (value === 'mixed') return 'Mixed setup'
  if (value === 'travel_heavy') return 'Travel-heavy'
  return 'Not set'
}

function cookingAccessLabel(value: NutritionCookingAccess | null) {
  if (value === 'full_kitchen') return 'Full kitchen'
  if (value === 'basic_reheat') return 'Basic reheat'
  if (value === 'minimal') return 'Minimal'
  return 'Not set'
}

function cuisinePreferenceLabel(values: string[]) {
  if (!values || values.length === 0) return 'Not set'
  if (values.length === 1) return formatCuisineLabel(values[0])
  return `${values.length} selected`
}

function formatCuisineLabel(value: string) {
  const option = CUISINE_OPTIONS.find((item) => item.value === value)
  if (option) return option.label

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeToken(value: string) {
  return String(value || '').trim().toLowerCase()
}

function splitOptionSelections(values: string[], options: MultiSelectOption[]) {
  const aliasMap = new Map<string, string>()

  for (const option of options) {
    aliasMap.set(normalizeToken(option.value), option.value)
    aliasMap.set(normalizeToken(option.label), option.value)
    for (const alias of option.aliases || []) {
      aliasMap.set(normalizeToken(alias), option.value)
    }
  }

  const selected: string[] = []
  const custom: string[] = []
  const selectedSet = new Set<string>()
  const customSet = new Set<string>()

  for (const rawValue of values) {
    const normalized = normalizeToken(rawValue)
    if (!normalized) continue

    const mapped = aliasMap.get(normalized)
    if (mapped) {
      if (!selectedSet.has(mapped)) {
        selectedSet.add(mapped)
        selected.push(mapped)
      }
      continue
    }

    if (!customSet.has(normalized)) {
      customSet.add(normalized)
      custom.push(normalized)
    }
  }

  return { selected, custom }
}

function composeSelections(selectedValues: string[], customText: string) {
  const customValues = normalizeNutritionStringList(customText).map((value) => normalizeToken(value))
  const combined = [...selectedValues.map((value) => normalizeToken(value)), ...customValues]
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of combined) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }

  return result
}

function toggleChipSelection(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
}
