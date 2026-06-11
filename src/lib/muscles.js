// The 6 canonical muscle groups used across the app (3D model, calendar, colors).
export const MUSCLE_GROUPS = [
  { key: 'chest',     label: 'CHEST',     color: '#4f6cff' },
  { key: 'back',      label: 'BACK',      color: '#a56bff' },
  { key: 'shoulders', label: 'SHOULDERS', color: '#00e5ff' },
  { key: 'arms',      label: 'ARMS',      color: '#f5a623' },
  { key: 'abs',       label: 'ABS',       color: '#ff3d71' },
  { key: 'legs',      label: 'LEGS',      color: '#39ff14' },
]

// Maps a single exercise name to one of the 6 canonical muscle groups.
// Order matters: legs-specific lifts are checked before "back" so a Romanian
// deadlift counts as legs, while a plain deadlift counts as back.
export function getMuscleGroup(name) {
  if (!name) return null
  const n = name.toLowerCase()
  if (/squat|leg press|lunge|hack squat|leg extension|hamstring|rdl|romanian|leg curl|glute|hip thrust|calf/.test(n)) return 'legs'
  if (/tricep|pushdown|skull crusher|bicep|curl|hammer|preacher/.test(n)) return 'arms'
  if (/lateral raise|front raise|overhead press|military press|arnold|shoulder press|upright row|reverse fly/.test(n)) return 'shoulders'
  if (/crunch|plank|sit.?up|core|ab wheel|leg raise|russian twist/.test(n)) return 'abs'
  if (/deadlift|row|lat pull|pull.?up|chin.?up|face pull|pull.?apart|shrug|trap|back/.test(n)) return 'back'
  if (/bench|chest fly|pec deck|push.?up|incline|decline|fly|dip/.test(n)) return 'chest'
  return null
}

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
