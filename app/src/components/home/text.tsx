import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function Section({ children }: { children: ReactNode }) {
  return <View style={textStyles.section}>{children}</View>;
}

export function TextLabel({ children }: { children: ReactNode }) {
  return <Text style={textStyles.label}>{children}</Text>;
}

export function TextTitle({ children }: { children: ReactNode }) {
  return <Text style={textStyles.title}>{children}</Text>;
}

export function TextSectionTitle({ children }: { children: ReactNode }) {
  return <Text style={textStyles.sectionTitle}>{children}</Text>;
}

export function TextBody({ children }: { children: ReactNode }) {
  return <Text style={textStyles.body}>{children}</Text>;
}

export function TextBadge({ children }: { children: ReactNode }) {
  return <Text style={textStyles.badgeText}>{children}</Text>;
}

export function TextButton({ children }: { children: ReactNode }) {
  return <Text style={textStyles.buttonText}>{children}</Text>;
}

export function TextSecondaryButton({ children }: { children: ReactNode }) {
  return <Text style={textStyles.secondaryButtonText}>{children}</Text>;
}

// Also used directly by the home header, which adds dark mode variants.
export const textStyles = StyleSheet.create({
  section: {
    borderRadius: 10,
    backgroundColor: '#F8EFEC',
    borderWidth: 1,
    borderColor: '#D8C4BE',
    padding: 15,
    gap: 10,
  },
  title: {
    color: '#342725',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  label: {
    color: '#73685C',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#342725',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    color: '#625850',
    fontSize: 14,
    lineHeight: 20,
  },
  badgeText: {
    color: '#7C4F58',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonText: {
    color: '#F8EFEC',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#7A5057',
    fontSize: 13,
    fontWeight: '800',
  },
});
