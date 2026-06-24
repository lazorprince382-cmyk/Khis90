import ScanInterface from '../components/ScanInterface';

export default function ScanLibrary() {
  return (
    <ScanInterface
      scanType="library_in"
      scannerLocation="Library"
      modeOptions={[
        { value: 'library_in', label: 'Enter Library', icon: '📚' },
        { value: 'library_out', label: 'Exit Library', icon: '📖' },
      ]}
    />
  );
}
