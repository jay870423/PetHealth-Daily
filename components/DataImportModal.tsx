
import React, { useState, useRef } from 'react';
import { parseExcelText, parseExcelJson } from '../services/dataParser';
import { DailyReport } from '../types';
import * as XLSX from 'xlsx';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (updatedData: Partial<DailyReport>) => void;
}

const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTextImport = () => {
    const parsed = parseExcelText(text);
    if (Object.keys(parsed).length > 0) {
      onImport(parsed);
      setText('');
      onClose();
    } else {
      alert('无法识别数据，请检查格式');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const parsed = parseExcelJson(data);
        if (Object.keys(parsed).length > 0) {
          onImport(parsed);
          onClose();
        } else {
          alert('Excel 内容格式不正确，未找到“类别”或“内容”列');
        }
      } catch (err) {
        console.error(err);
        alert('解析 Excel 文件失败');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">导入健康数据</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* 文件上传区 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">方式一：直接上传文件 (.xlsx, .csv)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-gray-200 rounded-[1.5rem] p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold text-blue-600">正在分析文档...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-100 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">点击或拖拽 Excel 文件到这里</p>
                    <p className="text-xs text-gray-400 mt-1">支持标准的 4 列日报导出格式</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gray-100"></div>
              <span className="text-[10px] font-bold text-gray-300">或者</span>
              <div className="flex-1 h-[1px] bg-gray-100"></div>
            </div>

            {/* 文本粘贴区 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">方式二：粘贴 Excel 内容</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="类别	内容	说明	单位&#10;time	2026/1/26 20:14	消息时间点	&#10;STEP	2170	计步总数	步..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-[12px] font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <button
                onClick={handleTextImport}
                disabled={!text.trim()}
                className="w-full mt-3 py-3 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                导入粘贴内容
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl text-gray-400 text-xs font-bold hover:text-gray-600 transition-colors"
            >
              放弃导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportModal;
