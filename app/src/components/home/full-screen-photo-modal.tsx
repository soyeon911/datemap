import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export function FullScreenPhotoModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={uri !== null}
      onRequestClose={onClose}>
      <Pressable style={styles.fullScreenPhotoOverlay} onPress={onClose}>
        {uri ? (
          <>
            <Image source={{ uri: uri }} style={styles.fullScreenPhoto} resizeMode="contain" />
            <View style={styles.fullScreenPhotoClose}>
              <Text style={styles.fullScreenPhotoCloseText}>닫기</Text>
            </View>
          </>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenPhoto: {
    width: '100%',
    height: '82%',
  },
  fullScreenPhotoClose: {
    position: 'absolute',
    top: 58,
    right: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  fullScreenPhotoCloseText: {
    color: '#F8EFEC',
    fontSize: 14,
    fontWeight: '900',
  },
  fullScreenPhotoOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: 18,
  },
});
