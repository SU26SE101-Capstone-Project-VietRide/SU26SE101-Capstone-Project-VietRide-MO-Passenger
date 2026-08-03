import type { MapStyleElement } from 'react-native-maps';

const freezeMapStyle = (style: MapStyleElement[]): MapStyleElement[] => (
  Object.freeze(style) as unknown as MapStyleElement[]
);

export const LIQUID_LIGHT_MAP_STYLE = freezeMapStyle([
  { elementType: 'geometry', stylers: [{ color: '#EAF4F3' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4B6260' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7FBFA' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#294E4B' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#E5F0EF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#D8EFEC' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#CAE5E2' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#B9DEDA' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#567C78' }] },
]);

export const LIQUID_DARK_MAP_STYLE = freezeMapStyle([
  { elementType: 'geometry', stylers: [{ color: '#071918' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#AEC8C4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#071918' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#D3E8E4' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#102422' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#17302E' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#214844' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2A5954' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A302E' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7FB0AA' }] },
]);
