import ScanInterface from '../components/ScanInterface';

export default function ScanDormitory() {
  return (
    <ScanInterface
      scanType="dormitory_in"
      scannerLocation="Dormitory"
      modeOptions={[
        { value: 'dormitory_in', label: 'Check in', icon: '🛏️' },
        { value: 'dormitory_out', label: 'Check out', icon: '🚶' },
      ]}
    />
  );
}
