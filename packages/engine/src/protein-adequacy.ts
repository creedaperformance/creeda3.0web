export function computeProteinAdequacyRatio(args: {
  bodyMassKg: number
  estimatedProteinGrams: number
  targetGramsPerKg: number
}) {
  const target = args.bodyMassKg * args.targetGramsPerKg
  if (target <= 0) return 0
  return Number(Math.min(2, args.estimatedProteinGrams / target).toFixed(2))
}
