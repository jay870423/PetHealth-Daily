
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
    const MAX_RETRIES = 50; // 200ms * 50 = 10秒超时

    const initMap = () => {
      if (!mapContainerRef.current) return;
      if (!window.BMapGL) {
        console.warn("BMapGL 引擎尚未就绪");
        return;
      }

      try {
        if (mapRef.current) return; // 避免重复初始化

        const map = new window.BMapGL.Map(mapContainerRef.current, {
          enableIconClick: false,
          displayOptions: { poi: true, building: true }
        });

        // 默认中心点：上海
        const defaultPoint = new window.BMapGL.Point(121.4737, 31.2304);
        map.centerAndZoom(defaultPoint, 15);
        map.enableScrollWheelZoom(true);
        
        // 延迟触发布局更新，确保容器尺寸正确
        setTimeout(() => {
          if (map && typeof map.resize === 'function') {
            map.resize();
          }
        }, 500);

        mapRef.current = map;
        setIsReady(true);
      } catch (err) {
        console.error("地图初始化失败:", err);
        setError("地图渲染异常。请确认百度地图 AK 已在后台开启 Referer 白名单限制。");
      }
    };

    checkInterval = setInterval(() => {
      timeoutCounter++;
      if (window.BMapGL) {
        clearInterval(checkInterval);
        initMap();
      } else if (timeoutCounter > MAX_RETRIES) {
        clearInterval(checkInterval);
        setError("百度地图服务加载超时。请检查网络或 AK 配置。");
        console.error("Baidu Map script load timeout.");
      }
    }, 200);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapRef.current) {
        try {
          if (typeof mapRef.current.destroy === 'function') {
            mapRef.current.destroy();
          }
        } catch (e) {
          console.warn("地图卸载警告:", e);
        }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !coordinates || coordinates.length === 0) return;

    try {
      // 严格过滤无效坐标
      const validPoints = coordinates
        .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0)
        .map(coord => new window.BMapGL.Point(coord[1], coord[0]));

      if (validPoints.length === 0) return;

      map.clearOverlays();

      // 绘制轨迹
      const polyline = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#3b82f6",
        strokeWeight: 6,
        strokeOpacity: 0.8,
        strokeLineJoin: 'round'
      });
      map.addOverlay(polyline);

      // 绘制终点标记
      const lastPoint = validPoints[validPoints.length - 1];
      const marker = new window.BMapGL.Marker(lastPoint);
      map.addOverlay(marker);

      // 调整视野
      map.setViewport(validPoints, { margins: [60, 60, 60, 60] });
    } catch (err) {
      console.warn("更新地图覆盖物失败:", err);
    }
  }, [coordinates, isReady]);

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden">
      {!isReady && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[10px] text-gray-500 font-bold tracking-widest uppercase animate-pulse">正在连接宠物卫星...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50 text-red-500 p-6 text-center">
          <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs font-bold leading-relaxed">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-[10px] bg-red-100 px-3 py-1 rounded-full font-black uppercase">重试</button>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default ActivityMap;
