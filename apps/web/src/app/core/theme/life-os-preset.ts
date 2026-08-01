import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const primary = {
  color: 'var(--primary)',
  contrastColor: 'var(--primary-foreground)',
  // Was identical to color, giving primary buttons zero visible hover/press
  // feedback - darken slightly on hover, more on press, for real affordance.
  hoverColor: 'color-mix(in oklch, var(--primary) 88%, black)',
  activeColor: 'color-mix(in oklch, var(--primary) 78%, black)',
};

const highlight = {
  background: 'var(--accent)',
  focusBackground: 'var(--accent)',
  color: 'var(--accent-foreground)',
  focusColor: 'var(--accent-foreground)',
};

const formField = {
  background: 'var(--card)',
  disabledBackground: 'var(--muted)',
  filledBackground: 'var(--card)',
  filledHoverBackground: 'var(--card)',
  filledFocusBackground: 'var(--card)',
  borderColor: 'var(--border)',
  hoverBorderColor: 'var(--ring)',
  focusBorderColor: 'var(--ring)',
  invalidBorderColor: 'var(--destructive)',
  color: 'var(--foreground)',
  disabledColor: 'var(--muted-foreground)',
  placeholderColor: 'var(--muted-foreground)',
  invalidPlaceholderColor: 'var(--destructive)',
  floatLabelColor: 'var(--muted-foreground)',
  floatLabelFocusColor: 'var(--primary)',
  floatLabelActiveColor: 'var(--muted-foreground)',
  iconColor: 'var(--muted-foreground)',
};

const text = {
  color: 'var(--foreground)',
  hoverColor: 'var(--foreground)',
  mutedColor: 'var(--muted-foreground)',
  hoverMutedColor: 'var(--muted-foreground)',
};

const content = {
  background: 'var(--card)',
  hoverBackground: 'var(--muted)',
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
  hoverColor: 'var(--foreground)',
};

const overlay = {
  select: { background: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' },
  popover: { background: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' },
  modal: { background: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' },
};

const colorSchemeShared = { primary, highlight, formField, text, content, overlay };

// Button's severity variants (root/outlined/text) don't inherit the semantic
// colorScheme above - Aura hardcodes them to its own literal light-mode palette
// (surface.100-300 for secondary, red.500 for danger, primary.50-200 for outlined
// hovers). Left alone, every secondary/danger/outlined button in the app would
// render in PrimeNG's default gray/red instead of this app's actual theme tokens,
// especially broken in dark mode where those literal light shades barely show up.
const buttonSecondary = {
  background: 'var(--secondary)',
  hoverBackground: 'var(--muted)',
  activeBackground: 'var(--muted)',
  borderColor: 'var(--border)',
  hoverBorderColor: 'var(--border)',
  activeBorderColor: 'var(--border)',
  color: 'var(--secondary-foreground)',
  hoverColor: 'var(--foreground)',
  activeColor: 'var(--foreground)',
  focusRing: { color: 'var(--ring)', shadow: 'none' },
};

const buttonDanger = {
  background: 'var(--destructive)',
  hoverBackground: 'color-mix(in oklch, var(--destructive) 90%, black)',
  activeBackground: 'color-mix(in oklch, var(--destructive) 80%, black)',
  borderColor: 'var(--destructive)',
  hoverBorderColor: 'color-mix(in oklch, var(--destructive) 90%, black)',
  activeBorderColor: 'color-mix(in oklch, var(--destructive) 80%, black)',
  color: 'oklch(1 0 0)',
  hoverColor: 'oklch(1 0 0)',
  activeColor: 'oklch(1 0 0)',
  focusRing: { color: 'var(--destructive)', shadow: 'none' },
};

const buttonOutlinedSecondary = {
  hoverBackground: 'var(--muted)',
  activeBackground: 'var(--muted)',
  borderColor: 'var(--border)',
  color: 'var(--foreground)',
};

const buttonOutlinedDanger = {
  hoverBackground: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
  activeBackground: 'color-mix(in oklch, var(--destructive) 20%, transparent)',
  borderColor: 'var(--destructive)',
  color: 'var(--destructive)',
};

const buttonTextSecondary = {
  hoverBackground: 'var(--muted)',
  activeBackground: 'var(--muted)',
  color: 'var(--foreground)',
};

const buttonTextDanger = {
  hoverBackground: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
  activeBackground: 'color-mix(in oklch, var(--destructive) 20%, transparent)',
  color: 'var(--destructive)',
};

const buttonColorScheme = {
  root: { secondary: buttonSecondary, danger: buttonDanger },
  outlined: { secondary: buttonOutlinedSecondary, danger: buttonOutlinedDanger },
  text: { secondary: buttonTextSecondary, danger: buttonTextDanger },
};

// Same issue as Button: the unchecked track reads Aura's literal surface.600/700
// gray instead of this app's tokens. The checked state already resolves correctly
// through primary.color above, so only the off-state needs remapping.
const toggleSwitchColorScheme = {
  root: {
    background: 'var(--muted)',
    hoverBackground: 'var(--border)',
    checkedBackground: 'var(--primary)',
    checkedHoverBackground: 'color-mix(in oklch, var(--primary) 88%, black)',
  },
};

export const LifeOsPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: colorSchemeShared,
      dark: colorSchemeShared,
    },
  },
  components: {
    button: {
      colorScheme: {
        light: buttonColorScheme,
        dark: buttonColorScheme,
      },
    },
    toggleswitch: {
      colorScheme: {
        light: toggleSwitchColorScheme,
        dark: toggleSwitchColorScheme,
      },
    },
  },
});
