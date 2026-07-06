---
name: Premium Academic Minimalist
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#3d37a9'
  on-tertiary: '#ffffff'
  tertiary-container: '#5551c2'
  on-tertiary-container: '#dbd7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c3c0ff'
  on-tertiary-fixed: '#0f0069'
  on-tertiary-fixed-variant: '#3b35a7'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
---

## Brand & Style
The design system is engineered for high-stakes professional achievement, specifically tailored for educators preparing for the EKYS exam. The brand personality is **Academic, Authoritative, and Serene**. It draws inspiration from Apple’s Human Interface Guidelines for its functional clarity, Notion’s editorial layout for content density management, and Linear’s precision for task-oriented workflows.

The visual style is **Premium Minimalist**. It utilizes a "Paper-on-Paper" layering strategy to create a breathable, luxury environment that reduces cognitive load during long study sessions. The aesthetic avoids unnecessary decoration, relying instead on exquisite typography, generous whitespace, and subtle micro-interactions to convey quality and reliability.

## Colors
The palette is anchored by a warm, off-white background (`#FAFAF8`) to reduce eye strain, mimicking premium archival paper. 

- **Primary Indigo:** Used for the main "action" thread, representing progress and focus.
- **Premium Gold:** Reserved exclusively for subscription-based features, achievement milestones, and the "Premium" tier status to denote high value.
- **Text Tiers:** Uses a deep charcoal (`#111827`) for high-contrast readability in study materials, with a soft slate (`#6B7280`) for metadata and secondary labels.
- **Functional Colors:** Success, Warning, and Danger colors follow standard semantic patterns but are slightly desaturated to maintain the professional, editorial tone.

## Typography
This design system employs **Inter** for its systematic clarity and excellent legibility at small sizes, crucial for complex exam questions and legislation (Mevzuat) texts.

The hierarchy is strictly editorial. Large display titles are used for screen entries, while body text uses a generous `1.6x` line height to ensure maximum readability during extended reading of "Değerler Eğitimi" or "Eğitim Yönetimi" content. Labels use slightly increased letter spacing and medium weights to remain distinct from body content.

## Layout & Spacing
The spacing rhythm follows an **8pt Grid System**, ensuring all components align with mathematical precision. 

- **Containers:** Utilize a 20px side margin on mobile to create a "contained" feel that mirrors a printed book.
- **Vertical Rhythm:** Content blocks (like Lesson categories) are separated by `24px` (lg), while elements within a card use `16px` (md).
- **Stacking:** Lists and rows use a strict `8px` or `12px` gap to maintain high information density without feeling cluttered.
- **Safe Areas:** Adheres to iOS safe area insets for bottom navigation and header bars.

## Elevation & Depth
The design system uses a **Low-Contrast Layering** approach instead of heavy shadows. Depth is communicated through color shifts and hairline strokes:

1.  **Level 0 (Base):** Primary Background (`#FAFAF8`).
2.  **Level 1 (Cards/Sheets):** White (`#FFFFFF`) with a 1px hairline border (`#E5E7EB`). No shadow, or an extremely subtle 2px blur with 2% opacity.
3.  **Level 2 (Modals/Popovers):** White with a soft, diffused ambient shadow (12px blur, 5% opacity) to indicate temporary interaction.
4.  **Separators:** Dividers use `#F3F4F6` and are 1px thick. They should never span the full width if they are inside a card; they should have inset margins to maintain the "editorial" feel.

## Shapes
The shape language is **Soft-Geometric**. A standard radius of `8px` (roundedness 2) is used for most interactive elements like buttons and input fields. Larger containers like Hero Cards or Bottom Sheets use `16px` or `24px` to feel more approachable and modern. 

Progress bars and tags use fully rounded caps (pill-shaped) to distinguish them as informational status elements rather than interactive containers.

## Components

### Buttons
- **Primary:** Solid Indigo (`#4F46E5`) with white text. High-hit area (min 44px height).
- **Secondary:** Light Indigo tint or Grey-100 with Primary text.
- **Premium:** Gradient or solid Gold (`#D4AF37`) with white text, used only for "Unlock All" or "Pro" actions.
- **Ghost:** No background, Primary text color, used for "Vazgeç" (Cancel) or secondary actions in headers.

### Form Elements
- **Input Fields:** 1px border (`#E5E7EB`) with a light grey label floating above. Focus state uses a 2px Primary border.
- **OTP:** 4-6 individual boxes with high-contrast text and centered alignment.
- **Segmented Control:** Apple-style pill background with a sliding white selector for toggling between "Konu Anlatımı" and "Soru Bankası."

### Cards
- **Lesson Card:** Features a category icon (e.g., "Atatürk İlkeleri"), a progress percentage, and a chevron.
- **Question Card:** Clean white surface, high-contrast text for the question body, and lettered (A, B, C, D, E) circles for options. Selected options highlight the circle in Primary Indigo.
- **Achievement Card:** Gold-tinted border with a centered icon for "Başarılar."

### Navigation & Feedback
- **Bottom Navigation:** Outline icons with a 2pt stroke. Active state is solid Primary Indigo.
- **Progress Bars:** Thin 4px height bars. Success green for completed sections, Primary Indigo for active study.
- **Bottom Sheet:** Used for "Soru Çözüm Detayı" (Question Explanation), featuring a top centered drag handle.
- **Skeleton:** Soft grey pulses (`#F3F4F6`) for loading states of lesson lists.