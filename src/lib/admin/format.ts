export function formatBRL(value: number): string {
  const hasCents = !Number.isInteger(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
  // Replace non-breaking space with regular space for consistency
  return formatted.replace(/ /g, ' ');
}

export function formatNumberBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
