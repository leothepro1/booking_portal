export function formatSEK(amountInOre: number): string {
  const kronor = Math.round(amountInOre) / 100
  const whole = Math.floor(kronor)
  const formatted = whole.toLocaleString("sv-SE")
  return `${formatted} kr`
}

export function oreToKronor(ore: number): number {
  return ore / 100
}

export function kronorToOre(kronor: number): number {
  return Math.round(kronor * 100)
}
