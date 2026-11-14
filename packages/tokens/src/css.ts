/** Emit design tokens as CSS custom properties for the web app. */
import { colors, radii, spacing, typeScale } from './index';

export function tokensToCssVariables(): string {
  const lines: string[] = [':root {'];
  for (const [name, value] of Object.entries(colors)) {
    lines.push(`  --color-${name}: ${value};`);
  }
  for (const [name, value] of Object.entries(spacing)) {
    lines.push(`  --space-${name}: ${value}px;`);
  }
  for (const [name, value] of Object.entries(radii)) {
    lines.push(`  --radius-${name}: ${value}px;`);
  }
  for (const [name, value] of Object.entries(typeScale)) {
    lines.push(`  --text-${name}: ${value}px;`);
  }
  lines.push('}');
  return lines.join('\n');
}

export default tokensToCssVariables;
