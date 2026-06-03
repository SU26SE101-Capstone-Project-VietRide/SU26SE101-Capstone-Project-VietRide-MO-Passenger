import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image } from 'react-native';
import { X, Lightning } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export interface CameraViewfinderProps {
  visible: boolean;
  onClose: () => void;
  flashActive: boolean;
  onToggleFlash: () => void;
  onSnap: () => void;
  lastPhotoUri?: string;
}

export const CameraViewfinder = ({
  visible,
  onClose,
  flashActive,
  onToggleFlash,
  onSnap,
  lastPhotoUri,
}: CameraViewfinderProps): React.JSX.Element => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <SafeAreaView style={styles.cameraContainer}>
      {/* Top Bar Controls */}
      <View style={styles.cameraTopBar}>
        <TouchableOpacity style={styles.cameraCloseBtn} activeOpacity={0.7} onPress={onClose}>
          <X size={20} color={colors.textInverse} />
        </TouchableOpacity>

        <Text style={styles.cameraModeText}>PHOTO MODE</Text>

        <TouchableOpacity
          style={[styles.cameraFlashBtn, flashActive && styles.cameraFlashBtnActive]}
          activeOpacity={0.7}
          onPress={onToggleFlash}
        >
          <Lightning
            size={20}
            color={flashActive ? colors.warning : colors.textInverse}
            weight={flashActive ? 'fill' : 'regular'}
          />
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.cameraViewfinder}>
        {/* Viewfinder 3x3 Grid Overlay */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridRow}>
            <View style={styles.gridCell} />
            <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
            <View style={styles.gridCell} />
          </View>
          <View style={[styles.gridRow, styles.gridRowMiddleRow]}>
            <View style={styles.gridCell} />
            <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
            <View style={styles.gridCell} />
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridCell} />
            <View style={[styles.gridCell, styles.gridCellMiddleCol]} />
            <View style={styles.gridCell} />
          </View>
        </View>

        {/* Simulated Live Viewfinder Content */}
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop' }}
          style={styles.cameraMockBg}
        />

        {/* Viewfinder Center Focus Cursor */}
        <View style={styles.cameraFocusCursor}>
          <View style={styles.cameraFocusRing} />
          <Text style={styles.cameraFocusText}>AF-L</Text>
        </View>

        {/* Snap Shutter Flash Overlay */}
        {flashActive && <View style={styles.cameraFlashOverlay} pointerEvents="none" />}
      </View>

      {/* Camera Bottom Action Bar */}
      <View style={styles.cameraBottomBar}>
        <View style={styles.cameraAlbumPreview}>
          {lastPhotoUri ? (
            <Image source={{ uri: lastPhotoUri }} style={styles.cameraAlbumThumb} />
          ) : (
            <View style={styles.cameraAlbumEmpty} />
          )}
        </View>

        <TouchableOpacity style={styles.cameraShutterOuter} activeOpacity={0.8} onPress={onSnap}>
          <View style={styles.cameraShutterInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cameraFlipBtn}
          activeOpacity={0.7}
          onPress={() => {/* flip handled at parent */}}
        >
          <Text style={styles.cameraFlipText}>FLIP</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  </Modal>
);

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#111111',
  },
  cameraCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  cameraModeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: colors.textInverse,
    letterSpacing: 1.5,
  },
  cameraFlashBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  cameraFlashBtnActive: {
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
  },
  cameraViewfinder: {
    flex: 1,
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    padding: '12%',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridRowMiddleRow: {
    marginVertical: '12%',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  gridCellMiddleCol: {
    marginHorizontal: '12%',
  },
  cameraMockBg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cameraFocusCursor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 72,
    height: 72,
    marginTop: -36,
    marginLeft: -36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFocusRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  cameraFocusText: {
    position: 'absolute',
    bottom: -18,
    fontFamily: fontFamilies.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  cameraFlashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  cameraBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: '#111111',
  },
  cameraAlbumPreview: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  cameraAlbumThumb: {
    width: '100%',
    height: '100%',
  },
  cameraAlbumEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cameraShutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  cameraShutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  cameraFlipBtn: {
    width: 52,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlipText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
});
