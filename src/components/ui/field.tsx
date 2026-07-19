import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useI18n } from '../../lib/i18n';
import { colors, font, radius } from '../../lib/theme';
import { BText } from './text';

// dir="auto" makes the browser lay the typed text out by its own script —
// Arabic flows right-to-left, Latin left-to-right — regardless of UI language.
const nativeBidi = { dir: 'auto' } as any;

interface FieldProps extends TextInputProps {
  label?: string;
}

export function Field({ label, style, ...rest }: FieldProps) {
  const { isRTL } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      {label ? <BText variant="smallMedium">{label}</BText> : null}
      <TextInput
        placeholderTextColor={colors.gray}
        {...nativeBidi}
        {...rest}
        style={[
          {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: rest.multiline ? 12 : 0,
            fontFamily: font.regular,
            fontSize: 15,
            color: colors.ink,
            backgroundColor: colors.white,
            textAlignVertical: rest.multiline ? 'top' : 'center',
            ...(isRTL ? { textAlign: 'right' as const } : null),
            ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
          },
          style,
        ]}
      />
    </View>
  );
}
