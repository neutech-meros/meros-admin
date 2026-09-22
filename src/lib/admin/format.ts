export function formatBRL(value: number): string {
  const hasCents = !Number.isInteger(value);
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
  // Node's ICU inserts a non-breaking space (U+00A0) between the currency symbol
  // and the amount for pt-BR locale. Normalize it to a regular space so callers
  // get predictable, greppable output.
  return formatted.replace(/ /g, ' ');
}

export function formatNumberBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
