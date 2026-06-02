import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface PromoItem {
  id: string;
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
}

const PROMOS_DATA: PromoItem[] = [
  {
    id: '1',
    image: 'https://picsum.photos/seed/promo1/600/300',
    tag: 'PROMO',
    tagColor: '#b81120',
    title: 'Summer Escapes: 20% Off',
    description: 'Book your next intercity bus ride and save big on coastal routes.',
  },
  {
    id: '2',
    image: 'https://picsum.photos/seed/promo2/600/300',
    tag: 'NEW FEATURE',
    tagColor: '#006a67',
    title: 'Live Tracking Updated',
    description: 'Our bus-on-a-string tracker just got smoother and more accurate.',
  },
];

interface NewsPromosProps {
  onPromoPress?: (item: PromoItem) => void;
}

export function NewsPromos({ onPromoPress }: NewsPromosProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>News & Promos</Text>

      <FlatList
        data={PROMOS_DATA}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPromoPress?.(item)}
            activeOpacity={0.9}
            style={styles.card}
          >
            {/* Top Image Banner */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={[styles.tagContainer, { backgroundColor: item.tagColor }]}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            </View>

            {/* Bottom Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing.lg,
    paddingBottom: spacing.massive, // ensure content is scrollable above the bottom nav bar
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: '#181c20',
    marginBottom: spacing.lg,
  },
  scrollContainer: {
    paddingRight: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: 280,
    marginRight: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
    marginBottom: spacing.md, // allowance for shadow clipping
  },
  imageContainer: {
    height: 128,
    width: '100%',
    position: 'relative',
    backgroundColor: '#ebeef3',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagContainer: {
    position: 'absolute',
    left: 8,
    top: 8,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...shadows.sm,
  },
  tagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.textInverse,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: '#181c20',
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: '#3c4948',
    lineHeight: 16,
  },
});
