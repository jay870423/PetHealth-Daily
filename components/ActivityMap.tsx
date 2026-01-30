
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

  // 初始化地图
  useEffect(() => {
    let checkInterval: any;
    let timeoutCounter = 0;
    const MAX_RETRIES = 60;

    const initMap = () => {
      if (!mapContainerRef.current || !window.BMapGL) return;

      try {
        if (mapRef.current) return; 

        const map = new window.BMapGL.Map(mapContainerRef.current, {
          enableIconClick: false,
          displayOptions: { 
            poi: true, 
            building: false,
            indoor: false 
          }
        });

        // 默认中心点 (北京或上海)
        const defaultPoint = new window.BMapGL.Point(121.4737, 31.2304);
        map.centerAndZoom(defaultPoint, 15);
        map.enableScrollWheelZoom(true);

        // 设置极简样式
        map.setMapStyleV2({ style: 'light' });

        mapRef.current = map;
        setIsReady(true);
      } catch (err) {
        console.error("Map Init Error:", err);
        setError("地图渲染引擎异常。");
      }
    };

    checkInterval = setInterval(() => {
      timeoutCounter++;
      if (window.BMapGL) {
        clearInterval(checkInterval);
        initMap();
      } else if (timeoutCounter > MAX_RETRIES) {
        clearInterval(checkInterval);
        setError("无法加载地图引擎。");
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // 绘制轨迹
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !coordinates || coordinates.length === 0) return;

    // 清除旧覆盖物
    map.clearOverlays();

    try {
      // 过滤并转换为百度 Point 对象 (注意百度地图是 Lng, Lat 顺序)
      const validPoints = coordinates
        .filter(c => Array.isArray(c) && c.length >= 2 && !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0)
        .map(coord => new window.BMapGL.Point(coord[1], coord[0]));

      if (validPoints.length === 0) return;

      // 1. 绘制轨迹阴影 (增加立体感)
      const shadowLine = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#1e40af",
        strokeWeight: 12,
        strokeOpacity: 0.1,
        strokeLineJoin: 'round'
      });
      map.addOverlay(shadowLine);

      // 2. 绘制主轨迹线
      const polyline = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#3b82f6",
        strokeWeight: 8,
        strokeOpacity: 0.9,
        strokeLineJoin: 'round'
      });
      map.addOverlay(polyline);

      // 3. 起点标记 (使用自定义 Label 代替 Icon 以防加载失败)
      const startPoint = validPoints[0];
      const startLabel = new window.BMapGL.Label("START", {
        position: startPoint,
        offset: new window.BMapGL.Size(-20, -35)
      });
      startLabel.setStyle({
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: '#64748b',
        padding: '2px 6px',
        borderRadius: '6px',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      });
      map.addOverlay(startLabel);

      // 4. 当前位置 (动态呼吸圆点)
      const lastPoint = validPoints[validPoints.length - 1];
      const pulseLabel = new window.BMapGL.Label("", {
        position: lastPoint,
        offset: new window.BMapGL.Size(-10, -10)
      });
      
      pulseLabel.setStyle({
        width: '20px',
        height: '20px',
        border: '4px solid white',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.8)',
        animation: 'pulse 2s infinite'
      });
      map.addOverlay(pulseLabel);

      // 5. 自动调整视野
      setTimeout(() => {
        map.setViewport(validPoints, { 
          margins: [60, 60, 60, 60], 
          zoomFactor: -1,
          delay: 200 
        });
      }, 100);

    } catch (err) {
      console.warn("Trajectory rendering error:", err);
    }
  }, [coordinates, isReady]);

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      {!isReady && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 text-red-500 text-[10px] font-bold">
          {error}
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default ActivityMap;
