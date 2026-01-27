
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

  // 1. 初始化地图引擎
  useEffect(() => {
    let checkInterval: any;

    const initMap = () => {
      if (!mapContainerRef.current) return;
      if (!window.BMapGL) return;

      try {
        if (mapRef.current) return; // 避免重复初始化

        const map = new window.BMapGL.Map(mapContainerRef.current, {
          enableIconClick: false,
          displayOptions: {
            poi: true,
            building: true
          }
        });

        // 默认显示北京或上海中心，直到数据加载
        const defaultPoint = new window.BMapGL.Point(121.4737, 31.2304);
        map.centerAndZoom(defaultPoint, 15);
        map.enableScrollWheelZoom(true);
        
        // 强制触发布局计算，解决容器初始化高度为 0 的问题
        setTimeout(() => {
          if (map) map.resize();
        }, 300);

        mapRef.current = map;
        setIsReady(true);
        console.log("Baidu Map GL Engine Ready.");
      } catch (err) {
        console.error("Baidu Map Init Error:", err);
        setError("地图引擎启动失败");
      }
    };

    checkInterval = setInterval(() => {
      if (window.BMapGL) {
        clearInterval(checkInterval);
        initMap();
      }
    }, 100);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. 渲染轨迹数据
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !coordinates || coordinates.length === 0) return;

    try {
      // 过滤无效坐标 (0,0) 并转换为百度点位
      const points = coordinates
        .filter(coord => coord[0] !== 0 && coord[1] !== 0)
        .map(coord => new window.BMapGL.Point(coord[1], coord[0]));

      if (points.length === 0) return;

      map.clearOverlays();

      // 绘制平滑轨迹
      const polyline = new window.BMapGL.Polyline(points, {
        strokeColor: "#3b82f6", // 典型的健康应用蓝色
        strokeWeight: 6,
        strokeOpacity: 0.9,
        strokeLineJoin: 'round',
        enableClicking: false
      });
      map.addOverlay(polyline);

      // 起点标记
      const startLabel = new window.BMapGL.Label("轨迹起点", {
        position: points[0],
        offset: new window.BMapGL.Size(-20, -30)
      });
      startLabel.setStyle({
        color: "#10b981",
        fontSize: "10px",
        fontWeight: "bold",
        border: "1px solid #10b981",
        padding: "2px 4px",
        borderRadius: "4px",
        backgroundColor: "rgba(255,255,255,0.9)"
      });
      map.addOverlay(startLabel);

      // 当前位置 (终点) 标记
      const lastPoint = points[points.length - 1];
      const marker = new window.BMapGL.Marker(lastPoint);
      map.addOverlay(marker);

      // 自动调整视野，确保轨迹完整显示
      map.setViewport(points, { 
        margins: [80, 80, 80, 80],
        zoomFactor: -1 // 留出更多边距
      });

    } catch (err) {
      console.error("Overlay update failed:", err);
    }
  }, [coordinates, isReady]);

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden">
      {!isReady && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">定位中...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 text-red-500 p-4 text-center">
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default ActivityMap;
