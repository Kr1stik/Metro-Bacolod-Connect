import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onPin: (coords: [number, number]) => void;
}

/**
 * Shared Leaflet Map Click Handler
 * Captures click events on the map and returns the coordinates.
 */
export default function MapClickHandler({ onPin }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onPin([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
