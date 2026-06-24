import ScanInterface from '../components/ScanInterface';

export default function ScanGate() {
  return (
    <ScanInterface
      scanType="gate_in"
      scannerLocation="Main Gate"
      modeOptions={[
        { value: 'gate_in', label: 'Entry', icon: '🚪' },
        { value: 'gate_out', label: 'Exit', icon: '🏠' },
      ]}
    />
  );
}
