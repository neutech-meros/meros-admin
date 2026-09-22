import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('Meros design tokens in globals.css', () => {
  it('defines the light-mode token values', () => {
    expect(css).toMatch(/--primary-700:\s*#7F00FF/);
    expect(css).toMatch(/--grey-900:\s*#1A1A1A/);
    expect(css).toMatch(/--success:\s*var\(--green-500\)/);
    expect(css).toMatch(/--header-h:\s*64px/);
  });

  it('defines the dark-mode overrides under .dark', () => {
    const darkBlock = css.slice(css.indexOf('.dark'));
    expect(darkBlock).toMatch(/--bg-canvas:\s*var\(--grey-950\)/);
    expect(darkBlock).toMatch(/--brand-500:\s*var\(--primary-400\)/);
  });
});
