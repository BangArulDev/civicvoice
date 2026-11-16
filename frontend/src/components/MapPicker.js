'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Perbaikan ikon marker bawaan Leaflet agar tampil dengan benar pada bundler Next.js / Turbopack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function MapPicker({
  position, // [lat, lng]
  onLocationChange, // ({ lat, lng, source }) => void
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const onLocationChangeRef = useRef(onLocationChange);

  // Selalu simpan referensi callback terbaru
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const defaultCenter = [-7.0881, 110.9167]; // Pusat Purwodadi, Kab. Grobogan
  const initialCenter =
    position && position[0] && position[1] ? position : defaultCenter;

  // 1. Inisialisasi Peta Leaflet murni (menghindari bug appendChild pada React 19)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Event Klik Peta: pindahkan lokasi secara manual
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (onLocationChangeRef.current) {
        onLocationChangeRef.current({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          source: 'manual',
        });
      }
    });

    mapInstanceRef.current = map;

    // Bersihkan peta saat komponen di-unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  // 2. Kelola Marker dan Sinkronisasi Posisi
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!position || !position[0] || !position[1]) {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.remove();
        markerInstanceRef.current = null;
      }
      return;
    }

    const [lat, lng] = position;

    if (markerInstanceRef.current) {
      const currentPos = markerInstanceRef.current.getLatLng();
      const isDifferent =
        Math.abs(currentPos.lat - lat) > 0.00001 ||
        Math.abs(currentPos.lng - lng) > 0.00001;

      if (isDifferent) {
        markerInstanceRef.current.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom(), {
          animate: true,
        });
      }
    } else {
      // Buat marker baru yang bisa digeser (draggable)
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const newPos = marker.getLatLng();
        if (onLocationChangeRef.current) {
          onLocationChangeRef.current({
            lat: Number(newPos.lat.toFixed(6)),
            lng: Number(newPos.lng.toFixed(6)),
            source: 'manual',
          });
        }
      });

      markerInstanceRef.current = marker;
      map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom(), {
        animate: true,
      });
    }
  }, [position]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-72 sm:h-80 md:h-96 rounded-lg overflow-hidden border border-gray-300 shadow-inner relative z-0"
    />
  );
}
