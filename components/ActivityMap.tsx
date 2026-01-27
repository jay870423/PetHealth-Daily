
import React, { useEffect, useRef, useState } from 'react';

interface ActivityMapProps {
  coordinates: [number, number][];
}

declare global {
  interface Window {
    BMapGL: any;
  }
}

const ActivityMap: React.FC<ActivityMapProps> = ({ coordinates }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let checkInterval: any;
    let timeoutCounter = 0;
    const MAX_RETRIES = 60; // 500ms * 60 = 30秒超时

    const initMap = () => {
      if (!mapContainerRef.current) return;
      if (!window.BMapGL) return;

      try {
        if (mapRef.current) return; 

        const map = new window.BMapGL.Map(mapContainerRef.current, {
          enableIconClick: false,
          displayOptions: { poi: true, building: true }
        });

        const defaultPoint = new window.BMapGL.Point(121.4737, 31.2304);
        map.centerAndZoom(defaultPoint, 15);
        map.enableScrollWheelZoom(true);
        
        setTimeout(() => {
          if (map && typeof map.resize === 'function') {
            map.resize();
          }
        }, 500);

        mapRef.current = map;
        setIsReady(true);
      } catch (err) {
        console.error("Map Init Error:", err);
        setError("地图渲染异常，请检查百度地图 AK 是否配置了当前域名的白名单。");
      }
    };

    checkInterval = setInterval(() => {
      timeoutCounter++;
      if (window.BMapGL) {
        clearInterval(checkInterval);
        initMap();
      } else if (timeoutCounter > MAX_RETRIES) {
        clearInterval(checkInterval);
        setError("地图引擎加载超时，请刷新重试。");
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapRef.current) {
        try {
          if (typeof mapRef.current.destroy === 'function') {
            mapRef.current.destroy();
          }
        } catch (e) {}
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !coordinates || coordinates.length === 0) return;

    try {
      const validPoints = coordinates
        .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0)
        .map(coord => new window.BMapGL.Point(coord[1], coord[0]));

      if (validPoints.length === 0) return;

      map.clearOverlays();

      const polyline = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#3b82f6",
        strokeWeight: 6,
        strokeOpacity: 0.8,
        strokeLineJoin: 'round'
      });
      map.addOverlay(polyline);

      const lastPoint = validPoints[validPoints.length - 1];
      const marker = new window.BMapGL.Marker(lastPoint);
      map.addOverlay(marker);

      map.setViewport(validPoints, { margins: [60, 60, 60, 60] });
    } catch (err) {
      console.warn("Overlay error:", err);
    }
  }, [coordinates, isReady]);

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden">
      {!isReady && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[10px] text-gray-400 font-bold tracking-widest uppercase">正在解析地理坐标...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50 text-red-500 p-6 text-center">
          <p className="text-xs font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-[10px] bg-red-100 px-3 py-1 rounded-full font-black uppercase">重试</button>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default ActivityMap;
