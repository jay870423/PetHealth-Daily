
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
    const MAX_RETRIES = 60;

    const initMap = () => {
      if (!mapContainerRef.current || !window.BMapGL) return;

      try {
        if (mapRef.current) return; 

        const map = new window.BMapGL.Map(mapContainerRef.current, {
          enableIconClick: false,
          displayOptions: { 
            poi: true, 
            building: false, // 隐藏建筑物以保持界面简洁
            indoor: false 
          }
        });

        const defaultPoint = new window.BMapGL.Point(121.4737, 31.2304);
        map.centerAndZoom(defaultPoint, 16);
        map.enableScrollWheelZoom(true);

        // 应用自定义地图样式 (简约风格)
        map.setMapStyleV2({
          styleId: '4979e8c467a14588e0b1909a36746401' // 建议使用百度地图后台生成的简约样式ID
        });
        
        // 如果没有 styleId，也可以使用内置的主题样式
        // map.setMapStyleV2({ style: 'light' });

        mapRef.current = map;
        setIsReady(true);
      } catch (err) {
        console.error("Map Init Error:", err);
        setError("地图渲染异常，请检查百度地图 AK 配置。");
      }
    };

    checkInterval = setInterval(() => {
      timeoutCounter++;
      if (window.BMapGL) {
        clearInterval(checkInterval);
        initMap();
      } else if (timeoutCounter > MAX_RETRIES) {
        clearInterval(checkInterval);
        setError("地图引擎加载超时。");
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
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

      // 1. 绘制轨迹阴影线（增加深度感）
      const shadowLine = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#1e40af",
        strokeWeight: 10,
        strokeOpacity: 0.1,
        strokeLineJoin: 'round'
      });
      map.addOverlay(shadowLine);

      // 2. 绘制主轨迹线条 (明亮的蓝色)
      const polyline = new window.BMapGL.Polyline(validPoints, {
        strokeColor: "#3b82f6",
        strokeWeight: 6,
        strokeOpacity: 0.9,
        strokeLineJoin: 'round',
        enableClicking: false
      });
      map.addOverlay(polyline);

      // 3. 添加起点标记
      const startPoint = validPoints[0];
      const startMarker = new window.BMapGL.Marker(startPoint, {
        icon: new window.BMapGL.Icon('https://api.map.baidu.com/images/blank.gif', new window.BMapGL.Size(1, 1)) 
      });
      const startLabel = new window.BMapGL.Label("START", {
        position: startPoint,
        offset: new window.BMapGL.Size(-15, -15)
      });
      startLabel.setStyle({
        color: '#94a3b8',
        fontSize: '10px',
        fontWeight: 'bold',
        border: 'none',
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: '2px 4px',
        borderRadius: '4px'
      });
      map.addOverlay(startLabel);

      // 4. 自定义当前位置标记 (呼吸灯效果的圆点)
      const lastPoint = validPoints[validPoints.length - 1];
      
      // 使用 HTML 内容作为 Marker (百度地图 WebGL 支持 DOM 覆盖物，但这里用 Label 模拟更轻量)
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
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.6)',
        animation: 'pulse 2s infinite'
      });
      map.addOverlay(pulseLabel);

      // 自动调整视野，增加平滑度
      map.setViewport(validPoints, { margins: [80, 80, 80, 80], zoomFactor: -1 });
      
    } catch (err) {
      console.warn("Overlay error:", err);
    }
  }, [coordinates, isReady]);

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      {!isReady && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[10px] text-gray-400 font-bold tracking-widest uppercase">渲染足迹图谱中...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-50 text-red-500 p-6 text-center">
          <p className="text-xs font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-[10px] bg-red-100 px-3 py-1 rounded-full font-black uppercase">刷新重试</button>
        </div>
      )}

      {/* 覆盖在地图上的装饰层 */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">实时坐标流</span>
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full grayscale-[0.2]" />
    </div>
  );
};

export default ActivityMap;
