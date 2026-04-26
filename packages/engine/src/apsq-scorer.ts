export function scoreApsq10(responses: number[]) {
  if (responses.length !== 10) {
    throw new Error('APSQ-10 requires exactly 10 responses.')
  }

  const totalScore = responses.reduce((sum, value) => {
    if (!Number.isInteger(value) || value < 0 || value > 4) {
      throw new Error('APSQ-10 responses must be integers from 0 to 4.')
    }
    return sum + value
  }, 0)
  const flagLevel = totalScore >= 20 ? 'red' : totalScore >= 15 ? 'amber' : 'green'

  return { totalScore, flagLevel }
}
