import { Image, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Clock } from 'lucide-react-native';
import { brand } from '@darjeeling/shared';
import { appName } from '@/lib/env';
import { styles, type, colors } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Banner, Loading } from '@/components/ui';
import { useTodaySchedule } from '@/hooks/queries';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={[styles.card, { alignItems: 'center', gap: 14, paddingVertical: 28 }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 96, height: 96, borderRadius: 20 }}
          accessibilityLabel={`${appName} logo`}
        />
        <Text style={type.display}>{appName}</Text>
        <Text style={[type.label, { textAlign: 'center' }]}>{brand.tagline}</Text>
        <Text style={[type.h2, { textAlign: 'center' }]}>{brand.heroHeadline}</Text>
        <Button title="Order now" variant="action" onPress={() => router.push('/menu')} />
      </View>

      <TodayLocation />
    </ScrollView>
  );
}

function TodayLocation() {
  const { data, isLoading, isError } = useTodaySchedule();
  if (isLoading) return <Loading label="Checking today's location…" />;
  if (isError || !data || data.is_closed) {
    return (
      <View style={styles.card}>
        <Text style={type.h2}>Today</Text>
        <Banner kind="warn">Closed today — check back soon for our next location.</Banner>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={type.h2}>Today at the truck</Text>
      <View style={styles.row}>
        <MapPin color={colors.indigo} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={type.bodyBold}>{data.place}</Text>
          <Text style={type.caption}>{data.address}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Clock color={colors.indigo} size={20} />
        <Text style={type.body}>
          Open {data.open_time.slice(0, 5)}–{data.close_time.slice(0, 5)}
        </Text>
      </View>
      <Button title="Start your order" variant="action" onPress={() => router.push('/menu')} />
    </View>
  );
}
