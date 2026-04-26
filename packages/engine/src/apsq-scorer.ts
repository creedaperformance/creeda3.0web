export function scoreApsq10(responses: number[]) {
  if (responses.length !== 10) {
    throw new Error('APSQ-10 requires exactly 10 responses.')
  }

  const totalScore = responses.reduce((sum, value) => {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error('APSQ-10 responses must be integers from 1 to 5.')
    }
    return sum + value
  }, 0)
  const flagLevel = totalScore >= 35 ? 'red' : totalScore >= 25 ? 'amber' : 'green'

  return { totalScore, flagLevel }
}
