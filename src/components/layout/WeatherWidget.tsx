import { useState, useEffect } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, Wind, MapPin, Thermometer,
} from 'lucide-react';

interface CurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

function weatherInfo(code: number): { label: string; Icon: React.ElementType } {
  if (code === 0)              return { label: 'Clear Sky',    Icon: Sun            };
  if (code <= 3)               return { label: 'Partly Cloudy', Icon: Cloud          };
  if (code <= 48)              return { label: 'Foggy',         Icon: Wind           };
  if (code <= 57)              return { label: 'Drizzle',       Icon: CloudDrizzle   };
  if (code <= 67)              return { label: 'Rain',          Icon: CloudRain      };
  if (code <= 77)              return { label: 'Snow',          Icon: CloudSnow      };
  if (code <= 82)              return { label: 'Showers',       Icon: CloudRain      };
  if (code <= 86)              return { label: 'Snow Showers',  Icon: CloudSnow      };
  return                              { label: 'Thunderstorm',  Icon: CloudLightning };
}

async function fetchWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
  );
  const data = await res.json();
  return data.current_weather as CurrentWeather;
}

async function fetchCity(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'en' } },
  );
  const data = await res.json();
  const a = data.address ?? {};
  const city = a.city || a.town || a.village || a.county || '';
  const cc   = a.country_code?.toUpperCase() ?? '';
  return city ? `${city}${cc ? ', ' + cc : ''}` : '';
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [city, setCity]       = useState('');
  const [ready, setReady]     = useState(false);
  const now = useNow();

  const load = (lat: number, lon: number) => {
    fetchWeather(lat, lon).then(w => { setWeather(w); setReady(true); }).catch(() => setReady(true));
    fetchCity(lat, lon).then(c => setCity(c)).catch(() => {});
  };

  useEffect(() => {
    // Refresh every 30 min
    const refresh = () => {
      if (!navigator.geolocation) { load(14.5995, 120.9842); return; }
      navigator.geolocation.getCurrentPosition(
        p => load(p.coords.latitude, p.coords.longitude),
        () => load(14.5995, 120.9842),
        { timeout: 5000 },
      );
    };
    refresh();
    const id = setInterval(refresh, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const dayStr  = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-4">
      {/* Date / Time */}
      <div className="flex items-center gap-2 text-blue-200/80 text-xs">
        <span className="font-medium text-white/90">{timeStr}</span>
        <span className="text-blue-200/50">·</span>
        <span>{dayStr}</span>
      </div>

      <div className="h-4 w-px bg-white/15" />

      {/* Weather */}
      {!ready ? (
        /* skeleton */
        <div className="flex items-center gap-2 animate-pulse">
          <div className="h-3.5 w-3.5 rounded-full bg-white/20" />
          <div className="h-2.5 w-10 rounded bg-white/20" />
          <div className="h-2 w-14 rounded bg-white/15" />
        </div>
      ) : weather ? (
        <div className="flex items-center gap-3">
          {/* Condition icon + temp */}
          <div className="flex items-center gap-1.5">
            {(() => { const { Icon } = weatherInfo(weather.weathercode); return <Icon className="h-4 w-4 text-sky-300" />; })()}
            <span className="text-sm font-semibold text-white">
              {Math.round(weather.temperature)}°C
            </span>
            <span className="text-[11px] text-blue-200/70">
              {weatherInfo(weather.weathercode).label}
            </span>
          </div>

          {/* Wind */}
          <div className="flex items-center gap-1 text-blue-200/55 text-[11px]">
            <Wind className="h-3 w-3" />
            <span>{Math.round(weather.windspeed)} km/h</span>
          </div>

          {/* City */}
          {city && (
            <div className="flex items-center gap-1 text-blue-200/55 text-[11px]">
              <MapPin className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{city}</span>
            </div>
          )}
        </div>
      ) : (
        /* could not load */
        <div className="flex items-center gap-1 text-blue-200/40 text-[11px]">
          <Thermometer className="h-3.5 w-3.5" />
          <span>Weather unavailable</span>
        </div>
      )}
    </div>
  );
}
