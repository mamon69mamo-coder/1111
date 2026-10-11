import React from 'react';
import { CustomerLocation } from '../types';
import { MapPin, Navigation, ExternalLink, Crosshair } from 'lucide-react';

interface MapViewProps {
  location: CustomerLocation;
  ip?: string;
  mac?: string;
  title?: string;
  height?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  location,
  ip,
  mac,
  title = 'Customer GPS Location (কাস্টমার জিপিএস লোকেশন)',
  height = 'h-64',
}) => {
  const { lat, lng, accuracy = 15, city, country, address } = location;

  // OpenStreetMap embed URL with marker
  const bboxDelta = 0.008;
  const bbox = `${lng - bboxDelta},${lat - bboxDelta},${lng + bboxDelta},${lat + bboxDelta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {lat.toFixed(5)}°, {lng.toFixed(5)}°
          </span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline ml-1"
            title="Open in Google Maps"
          >
            Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Map display */}
      <div className={`relative w-full ${height} bg-slate-950 overflow-hidden`}>
        <iframe
          title="Customer GPS Position"
          src={embedUrl}
          className="w-full h-full border-0 filter invert contrast-125 hue-rotate-180 opacity-90 hover:opacity-100 transition-opacity"
          loading="lazy"
        />

        {/* Floating coordinate HUD banner */}
        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-200">
                {city ? `${city}, ${country || ''}` : 'Detected Location'}
              </span>
              {address && (
                <p className="text-[11px] text-slate-400 truncate max-w-xs">{address}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
              ±{accuracy}m accuracy
            </span>
            {ip && (
              <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                IP: {ip}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
