import ScanInterface from '../components/ScanInterface';

export default function ScanLunch() {
  return (
    <ScanInterface
      scanType="meal_break"
      scannerLocation="Dining Hall"
      modeOptions={[
        { value: 'meal_break', label: 'Break', icon: '☕' },
        { value: 'meal_lunch', label: 'Lunch', icon: '🍽️' },
        { value: 'meal_supper', label: 'Supper (Boarding)', icon: '🌙' },
      ]}
    />
  );
}
