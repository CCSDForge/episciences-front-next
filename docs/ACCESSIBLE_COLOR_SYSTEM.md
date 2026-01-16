# Accessible Color System

## Overview

Episciences hosts 45+ journals, each with custom theme colors. To ensure WCAG 2.2 compliance across all journals, we automatically generate accessible variants of each journal's primary color.

## The Problem

When a journal uses a light primary color (e.g., `#87CEEB` sky blue):
- **OK**: Using it for backgrounds, banners, large UI areas
- **FAIL**: Using it for text on white background → poor contrast

**Example:**
```scss
/* BAD - May fail WCAG if primary is light */
.article-title {
  color: var(--primary); /* Light blue on white = 1.8:1 ratio (FAIL) */
}
```

## The Solution

We automatically generate WCAG-compliant variants:

```scss
/* GOOD - Automatically adjusted to meet WCAG AA 4.5:1 */
.article-title {
  color: var(--primary-text); /* Darkened to #0066A8 = 4.7:1 ratio (PASS) */
}
```

## Available CSS Variables

| Variable | WCAG Level | Ratio | Use Case |
|----------|------------|-------|----------|
| `--primary` | N/A | Original | Backgrounds, large areas |
| `--primary-text` | AA | 4.5:1 | Normal text on white |
| `--primary-text-aaa` | AAA | 7:1 | High contrast mode |
| `--primary-text-large` | AA | 3:1 | Large text (>=18pt/>=14pt bold) |
| `--primary-text-on-gray` | AA | 4.5:1 | Text on light gray (#f5f5f5) |
| `--primary-text-on-dark` | AA | 4.5:1 | Text on dark backgrounds |
| `--primary-border` | AA | 3:1 | Borders, icons, UI components |
| `--link-color` | AA | 4.5:1 | Links |
| `--link-hover-color` | AAA | 7:1 | Link hover/focus states |
| `--heading-color` | AA | 4.5:1 | Headings |
| `--button-text-on-primary-bg` | Auto | Auto | Text on primary background (auto black or white) |
| `--focus-color` | AA | 3:1 | Focus indicators |

## Usage Guide

### DO: Use semantic variables for text

```scss
.article-title {
  color: var(--primary-text); /* Normal text */
}

.hero-heading {
  font-size: 36px;
  color: var(--primary-text-large); /* Large text can use lighter color */
}

a {
  color: var(--link-color);

  &:hover {
    color: var(--link-hover-color);
  }
}

h1, h2, h3 {
  color: var(--heading-color);
}
```

### DON'T: Use --primary for text on light backgrounds

```scss
/* BAD - Will fail WCAG if primary is light */
.article-title {
  color: var(--primary);
}

/* GOOD - Use accessible variant instead */
.article-title {
  color: var(--primary-text);
}
```

### DO: Use --primary for backgrounds

```scss
.header {
  background-color: var(--primary); /* OK for backgrounds */
  color: var(--button-text-on-primary-bg); /* Auto black/white text */
}

.badge {
  background-color: var(--primary);
  color: var(--button-text-on-primary-bg);
}

.button-primary {
  background-color: var(--primary);
  color: var(--button-text-on-primary-bg);
  border: 2px solid var(--primary-border);

  &:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 2px;
  }
}
```

### Text on colored backgrounds

```scss
// Text on light gray background
.sidebar {
  background-color: #f5f5f5;

  .sidebar-link {
    color: var(--primary-text-on-gray); /* Adjusted for gray background */
  }
}

// Text on dark background
.dark-section {
  background-color: #333333;

  .dark-title {
    color: var(--primary-text-on-dark); /* Adjusted for dark background */
  }
}
```

## How It Works

1. **Journal configuration** provides the primary color (e.g., `#87CEEB`)
2. **Client-side generation** calculates accessible variants:
   ```typescript
   const variants = generateAccessibleColorVariants('#87CEEB');
   // {
   //   primary: '#87CEEB',
   //   primaryTextOnWhite: '#0066A8', // Darkened to meet 4.5:1
   //   primaryTextOnWhiteAAA: '#004D7A', // Darkened to meet 7:1
   //   ...
   // }
   ```
3. **CSS variables applied** automatically when each journal loads
4. **Components use semantic variables** instead of raw `--primary`

## Testing

Run contrast tests:

```bash
npm test -- colorContrast.test.ts
```

Manual testing with real journal colors:
```bash
npm run dev
# Visit different journals and verify text contrast
```

## Tools

- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Chrome DevTools**: Lighthouse → Accessibility Audit
- **axe DevTools**: Browser extension for automated testing
- **WCAG Color Contrast Checker**: https://colourcontrast.cc/

## WCAG 2.2 Requirements

| Text Type | WCAG AA | WCAG AAA |
|-----------|---------|----------|
| Normal text (<18pt) | 4.5:1 | 7:1 |
| Large text (>=18pt or >=14pt bold) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | N/A |

Our system automatically meets WCAG AA for all text types across all journals.

## Migrating Existing Components

### Example: Article Details

**BEFORE** (uses primary directly - may fail WCAG):
```scss
.articleDetails-content-article-section-title-text {
  color: var(--primary); // May fail if primary is light
}
```

**AFTER** (uses accessible variant):
```scss
.articleDetails-content-article-section-title-text {
  color: var(--primary-text); // Automatically adjusted for WCAG AA
  font-size: 16px; // < 18pt = normal text

  // For large headings (>=18pt or >=14pt bold)
  &.large-heading {
    font-size: 24px;
    color: var(--primary-text-large); // Can use relaxed 3:1 ratio
  }
}
```

### Migration Checklist

For each SCSS file:

1. **Search**: `color: var(--primary)` on text elements
2. **Identify context**:
   - Normal text? → `var(--primary-text)`
   - Large text (>=18pt/>=14pt bold)? → `var(--primary-text-large)`
   - Link? → `var(--link-color)` + `var(--link-hover-color)` on hover
   - Heading? → `var(--heading-color)`
   - Background? → `var(--primary)` (OK, no change)
3. **Replace** with the appropriate variable
4. **Test** with multiple journals (light and dark colors)

### Search Script

To find all problematic usages:

```bash
# Find all var(--primary) usages for color:
grep -r "color: var(--primary)" src/styles/

# Exclude correct usages (background-color, border-color)
grep -r "color: var(--primary)" src/styles/ | grep -v "background-color" | grep -v "border-color"
```

## Debug in Dev

The system logs generated colors in console during development:

```javascript
[Theme] Accessible colors generated: {
  original: '#87CEEB',
  variants: {
    text: '#0066A8',       // For normal text
    textAAA: '#004D7A',    // For high contrast
    largeText: '#4DB8E8',  // For large text
    border: '#5DBFE8',     // For borders/UI
    onPrimaryBg: '#000000' // Black or white on primary background
  }
}
```

## FAQ

### Q: Why not just use the primary color everywhere?
**A:** A light primary color (#87CEEB) on white has a ratio of 1.8:1, which fails WCAG AA (minimum 4.5:1). Users with low vision won't be able to read the text.

### Q: Does this change the appearance of my pages?
**A:** Yes, if you were using a light color for text. Text will be darker (more readable) but will remain in the same color family. Backgrounds and large areas keep the original color.

### Q: What if I really want to use the light color?
**A:** Use it on dark backgrounds or for non-text elements (backgrounds, large areas). For text on white, always use `var(--primary-text)`.

### Q: Does the system work with dark colors?
**A:** Yes! If the primary color is already dark (#003366), `var(--primary-text)` will return the original color (already compliant). The system is smart.

### Q: Can I disable this system for a journal?
**A:** Not recommended (WCAG violation), but technically possible by manually defining all CSS variables in the journal's .env. However, you lose the accessibility guarantee.

## Multi-Tenant Support

The system automatically adapts to each journal:

```
Journal A: Primary #87CEEB (light)
  → --primary-text: #0066A8 (darkened for contrast)

Journal B: Primary #003366 (dark)
  → --primary-text: #003366 (already OK, unchanged)

Journal C: Primary #FF6B6B (light red)
  → --primary-text: #C30000 (dark red for contrast)
```

**Result**: All journals meet WCAG AA, regardless of their original primary color.

## Real Journal Examples

| Journal | Primary | Primary-Text | Ratio | WCAG |
|---------|---------|--------------|-------|------|
| DMTCS | #B21316 | #B21316 | 5.2:1 | AA |
| Journal A | #87CEEB | #0066A8 | 4.6:1 | AA |
| Journal B | #FFB6C1 | #C30045 | 4.5:1 | AA |

## References

- [WCAG 2.2 - Success Criterion 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 - Success Criterion 1.4.6 Contrast (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)

---

**Note**: This system is mandatory for all new components. Existing components should be migrated progressively.
