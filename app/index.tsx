import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>HELLO 💩</Text>
      <Text style={{ color: 'white', fontSize: 16, marginTop: 12 }}>App loads OK!</Text>
    </View>
  );
}
