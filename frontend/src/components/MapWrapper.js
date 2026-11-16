'use client';

import dynamic from 'next/dynamic';

/**
 * Peta Leaflet wajib dimuat dengan ssr: false karena memanipulasi DOM browser secara langsung
 * dan bergantung pada objek global `window` serta `document` yang tidak tersedia pada runtime server Node.js.
 */
const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 sm:h-80 md:h-96 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center text-gray-500">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
      <span className="text-xs font-medium">Memuat peta interaktif Purwodadi...</span>
    </div>
  ),
});

export default function MapWrapper(props) {
  return <MapPicker {...props} />;
}
