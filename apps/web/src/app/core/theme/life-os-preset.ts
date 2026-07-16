import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const primary = {
  color: 'var(--primary)',
  contrastColor: 'var(--primary-foreground)',
  hoverColor: 'var(--primary)',
  activeColor: 'var(--primary)',
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

export const LifeOsPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: colorSchemeShared,
      dark: colorSchemeShared,
    },
  },
});
