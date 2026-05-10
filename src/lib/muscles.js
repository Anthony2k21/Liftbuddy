export function getMuscles(name) {
  if (!name) return []
  const tags = []
  if (/bench|chest fly|pec deck|push.?up/i.test(name)) tags.push('CHEST')
  if (/shoulder|lateral raise|front raise|overhead press|military press|arnold/i.test(name)) tags.push('SHOULDERS')
  if (/tricep|pushdown|dip|skull crusher/i.test(name)) tags.push('TRICEPS')
  if (/bicep|curl|chin.?up/i.test(name)) tags.push('BICEPS')
  if (/back|barbell row|seated row|lat pull|pull.?up|deadlift|rack pull/i.test(name)) tags.push('BACK')
  if (/squat|leg press|lunge|hack squat|leg extension/i.test(name)) tags.push('QUADS')
  if (/hamstring|rdl|romanian|leg curl|good morning/i.test(name)) tags.push('HAMSTRINGS')
  if (/glute|hip thrust|bridge/i.test(name)) tags.push('GLUTES')
  if (/calf raise|standing calf/i.test(name)) tags.push('CALVES')
  if (/ab|crunch|plank|sit.?up|core|cable crunch/i.test(name)) tags.push('CORE')
  if (/shrug|trap/i.test(name)) tags.push('TRAPS')
  return tags.slice(0, 3)
}
