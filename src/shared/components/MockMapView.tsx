import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import Svg, { Path, Circle, G, Line, Rect, Pattern, Defs, Text as SvgText } from 'react-native-svg';
import { Bus, Truck, MapPin, Plus, Minus, Target } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export interface MapPoint {
  id: string;
  name: string;
  detail: string;
  x: number; // Coordinate X in coordinate system of 300x300
  y: number; // Coordinate Y in coordinate system of 300x300
  type: 'origin' | 'transit' | 'destination';
  status: 'completed' | 'active' | 'pending';
}

interface MockMapViewProps {
  points: MapPoint[];
  vehicleType: 'bus' | 'truck';
}

export function MockMapView({ points, vehicleType }: MockMapViewProps): React.JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(
    points.find((p) => p.status === 'active') || null
  );

  // Pan responder to handle dragging/panning of the map
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = { x: pan.x, y: pan.y };
      },
      onPanResponderMove: (evt, gestureState) => {
        setPan({
          x: dragStart.current.x + gestureState.dx,
          y: dragStart.current.y + gestureState.dy,
        });
      },
    })
  ).current;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRecenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    const active = points.find((p) => p.status === 'active');
    if (active) setSelectedPoint(active);
  };

  // Find active vehicle position to center/render pulsing marker
  const activePoint = points.find((p) => p.status === 'active') || points[0];

  // Draw winding bezier curves or polyline connecting the points
  const drawRoutePath = () => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      // Generate some curve control points to make it look like a real winding road
      const cpX1 = p0.x + (p1.x - p0.x) * 0.25;
      const cpY1 = p0.y - 30; // curves up
      const cpX2 = p0.x + (p1.x - p0.x) * 0.75;
      const cpY2 = p1.y + 30; // curves down
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  return (
    <View style={styles.container}>
      {/* Map Content View */}
      <View style={styles.mapViewport} {...panResponder.panHandlers}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 320 320"
        >
          <Defs>
            {/* Grid Pattern */}
            <Pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <Path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="0.8"
              />
            </Pattern>
          </Defs>

          {/* Wrapper G that translates based on Pan and Zoom */}
          <G transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Map Grid Background */}
            <Rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#grid)" />

            {/* Landmass/Scenic Green Paths decoration */}
            <Path
              d="M -50 200 Q 80 120 180 280 T 380 200"
              fill="none"
              stroke="rgba(42, 193, 188, 0.08)"
              strokeWidth="48"
              strokeLinecap="round"
            />
            <Path
              d="M 50 -50 Q 200 120 100 280 T 250 380"
              fill="none"
              stroke="rgba(42, 193, 188, 0.05)"
              strokeWidth="32"
              strokeLinecap="round"
            />

            {/* Winding Highway Route Track (Gray background track) */}
            <Path
              d={drawRoutePath()}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Active Completed segment of Highway Route (Green track) */}
            <Path
              d={drawRoutePath()}
              fill="none"
              stroke={colors.primary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6, 6"
            />

            {/* Point Markers */}
            {points.map((p) => {
              const isSelected = selectedPoint?.id === p.id;
              const isCompleted = p.status === 'completed';
              const isActive = p.status === 'active';

              let markerColor: string = colors.textSecondary;
              if (isCompleted) markerColor = colors.primary;
              if (isActive) markerColor = colors.accentDark;

              return (
                <G key={p.id}>
                  {/* Visual marker shadow */}
                  <Circle cx={p.x} cy={p.y} r={12} fill="rgba(33, 37, 41, 0.06)" />
                  {/* Outer ring */}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 10 : 8}
                    fill="#FFFFFF"
                    stroke={markerColor}
                    strokeWidth={isSelected ? 3 : 2}
                    onPress={() => setSelectedPoint(p)}
                  />
                  {/* Inner dot */}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 5 : 4}
                    fill={markerColor}
                    onPress={() => setSelectedPoint(p)}
                  />
                  {/* Persistent stop/marker name text */}
                  <SvgText
                    x={p.x}
                    y={p.y - 14}
                    fill={colors.textPrimary}
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily={fontFamilies.bold}
                  >
                    {p.name}
                  </SvgText>
                </G>
              );
            })}

            {/* Pulsing Active Vehicle Marker */}
            {activePoint && (
              <G>
                {/* Outer pulsing ring */}
                <Circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={20}
                  fill="rgba(42, 193, 188, 0.25)"
                />
                <Circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={14}
                  fill={colors.primary}
                />
                {/* Vehicle Icon representation */}
                <G transform={`translate(${activePoint.x - 7}, ${activePoint.y - 7})`}>
                  {vehicleType === 'bus' ? (
                    <Bus size={14} color="#FFF" weight="fill" />
                  ) : (
                    <Truck size={14} color="#FFF" weight="fill" />
                  )}
                </G>
              </G>
            )}
          </G>
        </Svg>

        {/* Selected Landmark Popover / Tooltip */}
        {selectedPoint && (
          <View style={styles.calloutCard}>
            <View style={styles.calloutHeader}>
              <MapPin size={16} color={colors.primary} weight="fill" />
              <Text style={styles.calloutTitle}>{selectedPoint.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  selectedPoint.status === 'completed' && styles.statusCompleted,
                  selectedPoint.status === 'active' && styles.statusActive,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {selectedPoint.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.calloutDetail}>{selectedPoint.detail}</Text>
          </View>
        )}
      </View>

      {/* Floating Controls (Map overlay) */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn} activeOpacity={0.7}>
          <Plus size={20} color={colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut} activeOpacity={0.7}>
          <Minus size={20} color={colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleRecenter} activeOpacity={0.7}>
          <Target size={20} color={colors.primary} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  mapViewport: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xl,
    gap: spacing.sm,
    zIndex: 20,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  calloutCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.lg,
    zIndex: 15,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  calloutTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusCompleted: {
    backgroundColor: colors.primaryFaded,
  },
  statusActive: {
    backgroundColor: colors.warningLight,
  },
  statusBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    color: colors.textSecondary,
  },
  calloutDetail: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
