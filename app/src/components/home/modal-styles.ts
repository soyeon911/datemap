import { StyleSheet } from 'react-native';

// Sheet chrome shared by the home screen's modals.
export const modalStyles = StyleSheet.create({
  modalCloseButton: {
    borderRadius: 999,
    backgroundColor: '#E5D4CF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseButtonText: {
    color: '#4F463E',
    fontSize: 13,
    fontWeight: '800',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(52,39,37,0.36)',
  },
  settingsSheet: {
    gap: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#F8EFEC',
    padding: 18,
  },
});
