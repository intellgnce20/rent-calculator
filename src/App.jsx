import React, { useState, useEffect } from 'react';
import { Plus, Settings, Copy, Share2, CheckCircle2, ChevronRight, Calculator } from 'lucide-react';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDeLfTZxg5ennrPr1bGVpKcZZHmu2g-Cs06aiBtKhmTgs8g8qpTOWbhHEW6WkTip3YSw/exec';
function App() {
  const [rooms, setRooms] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState('');

  // view: 'main', 'settings', 'addRoom'
  const [view, setView] = useState('main');

  const [newRoomId, setNewRoomId] = useState('');
  const [currentMeter, setCurrentMeter] = useState('');

  const [showResult, setShowResult] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Settings form state
  const [editRent, setEditRent] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPrevMeter, setEditPrevMeter] = useState('');

  // 從 Google Sheets 抓取資料
  useEffect(() => {
    fetch(SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        setRooms(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('讀取雲端資料失敗');
        setIsLoading(false);
      });
  }, []);

  const saveToCloud = (newRooms, logData = null) => {
    setRooms(newRooms);
    showToast('雲端同步中...');

    const payload = {
      rooms: newRooms,
      log: logData
    };

    fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' }
    }).then(() => {
      showToast('雲端儲存成功！');
    }).catch(() => {
      showToast('雲端儲存失敗！');
    });
  };

  // Set first room as active initially if available
  useEffect(() => {
    const roomKeys = Object.keys(rooms);
    if (!activeRoomId && roomKeys.length > 0) {
      setActiveRoomId(roomKeys[0]);
    }
  }, [rooms, activeRoomId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleAddRoom = () => {
    if (!newRoomId.trim()) return showToast('請輸入房號');
    if (rooms[newRoomId]) return showToast('房號已存在');

    const newRooms = {
      ...rooms,
      [newRoomId]: {
        rent: '',
        pricePerUnit: '',
        prevMeter: ''
      }
    };
    saveToCloud(newRooms);
    setActiveRoomId(newRoomId);
    setNewRoomId('');
    setView('settings');
  };

  const handleSaveSettings = () => {
    if (!editRent || !editPrice || !editPrevMeter) {
      return showToast('請填寫完整設定資料');
    }

    const newRooms = {
      ...rooms,
      [activeRoomId]: {
        rent: Number(editRent),
        pricePerUnit: Number(editPrice),
        prevMeter: Number(editPrevMeter)
      }
    };
    saveToCloud(newRooms);
    setView('main');
    showToast('設定已儲存');
  };

  const openSettings = () => {
    const room = rooms[activeRoomId];
    setEditRent(room.rent || '');
    setEditPrice(room.pricePerUnit || '');
    setEditPrevMeter(room.prevMeter || '');
    setView('settings');
    setShowResult(false);
    setCurrentMeter('');
  };

  const calculateResult = () => {
    const room = rooms[activeRoomId];
    if (!room.rent || !room.pricePerUnit || room.prevMeter === '') {
      return showToast('請先完成房間基本設定');
    }
    if (!currentMeter) {
      return showToast('請輸入本期度數');
    }
    if (Number(currentMeter) < room.prevMeter) {
      return showToast('本期度數不能小於上期度數！如果換電表請重新設定。');
    }
    setShowResult(true);
  };

  const activeRoom = rooms[activeRoomId] || {};
  const currentNum = Number(currentMeter);
  const electricityUsed = currentNum - activeRoom.prevMeter;
  const electricityCost = electricityUsed * activeRoom.pricePerUnit;
  const totalCost = activeRoom.rent + electricityCost;

  const resultText = `親愛的 ${activeRoomId} 房客您好，本月租金明細如下：
租金：${activeRoom.rent} 元
電費：(${currentNum}度 - ${activeRoom.prevMeter}度) * ${activeRoom.pricePerUnit}元 = ${electricityCost} 元
本月總共應繳：${totalCost} 元。再麻煩您抽空匯款，謝謝！`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      showToast('文字已複製！');
    } catch (err) {
      showToast('複製失敗，請檢查瀏覽器權限');
    }
  };

  const handleShareLine = () => {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(resultText)}`;
    window.open(lineUrl, '_blank');
  };

  const handleNextMonth = () => {
    if (window.confirm('確定要結算並進入下個月嗎？\n（本期度數將變成下期上個月度數，本期度數將清空）')) {
      const room = rooms[activeRoomId];
      const currentNum = Number(currentMeter);

      const logData = {
        roomId: activeRoomId,
        prevMeter: room.prevMeter,
        currentMeter: currentNum,
        timestamp: new Date().toLocaleString('zh-TW')
      };

      const newRooms = {
        ...rooms,
        [activeRoomId]: {
          ...room,
          prevMeter: currentNum
        }
      };
      saveToCloud(newRooms, logData);
      setCurrentMeter('');
      setShowResult(false);
      showToast('已成功結算，進入下個月！');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rentBg flex flex-col items-center justify-center font-sans">
        <Calculator className="w-16 h-16 text-rentPrimary mb-4 animate-bounce" />
        <div className="text-2xl font-black text-rentPrimary">載入雲端資料中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rentBg max-w-md mx-auto shadow-xl overflow-hidden flex flex-col font-sans relative">
      <header className="bg-rentPrimary text-white p-5 shadow-md flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          <h1 className="text-2xl font-bold tracking-wide">收租計算機</h1>
        </div>
      </header>

      <main className="flex-1 p-5 overflow-y-auto pb-24">
        {toastMsg && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 animate-fade-in text-base font-bold whitespace-nowrap">
            {toastMsg}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-gray-700 font-bold mb-3 flex items-center gap-1 text-lg">
            選擇房號 <ChevronRight className="w-5 h-5 text-gray-400" />
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x hide-scrollbar">
            {Object.keys(rooms).map(roomId => (
              <button
                key={roomId}
                onClick={() => {
                  setActiveRoomId(roomId);
                  setView('main');
                  setShowResult(false);
                  setCurrentMeter('');
                }}
                className={`flex-none snap-start whitespace-nowrap px-6 py-4 rounded-2xl font-bold text-xl transition-all shadow-sm ${activeRoomId === roomId
                  ? 'bg-rentSecondary text-white scale-105'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
              >
                {roomId}
              </button>
            ))}
            <button
              onClick={() => setView('addRoom')}
              className="flex-none snap-start flex items-center gap-1 px-5 py-4 rounded-2xl font-bold text-rentPrimary bg-orange-50 border-2 border-dashed border-rentPrimary/30 hover:bg-orange-100 transition-colors text-xl"
            >
              <Plus className="w-6 h-6" /> 新增
            </button>
          </div>
        </div>

        {view === 'addRoom' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-5">新增房間</h3>
            <div className="mb-6">
              <label className="block text-gray-600 font-bold mb-3 text-lg">房號名稱（例如：101）</label>
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                placeholder="輸入房號..."
                className="w-full text-2xl p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-rentPrimary outline-none transition-colors font-bold text-gray-800"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setView('main')}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={handleAddRoom}
                className="flex-[2] py-4 bg-rentPrimary text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform"
              >
                確定新增
              </button>
            </div>
          </div>
        )}

        {view === 'settings' && activeRoomId && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-rentPrimary" /> {activeRoomId} 房間設定
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-600 font-bold mb-3 text-lg">固定月租金 (元)</label>
                <input
                  type="number"
                  value={editRent}
                  onChange={(e) => setEditRent(e.target.value)}
                  placeholder="如: 8000"
                  className="w-full text-2xl p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-rentSecondary outline-none transition-colors font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-bold mb-3 text-lg">每度電費 (元)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="如: 5"
                  className="w-full text-2xl p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-rentSecondary outline-none transition-colors font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-bold mb-3 text-lg">目前電表度數 (上期)</label>
                <input
                  type="number"
                  value={editPrevMeter}
                  onChange={(e) => setEditPrevMeter(e.target.value)}
                  placeholder="如: 1400"
                  className="w-full text-2xl p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-rentSecondary outline-none transition-colors font-bold text-gray-800"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setView('main')}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-[2] py-4 bg-rentSecondary text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform"
              >
                儲存設定
              </button>
            </div>
          </div>
        )}

        {view === 'main' && activeRoomId && (
          <div className="animate-fade-in">
            {!activeRoom.rent || !activeRoom.pricePerUnit || activeRoom.prevMeter === '' ? (
              <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-8 text-center mt-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 text-rentPrimary shadow-sm">
                  <Settings className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">請先完成基本設定</h3>
                <p className="text-gray-500 mb-8 text-lg">設定您的租金與電費後即可開始計算繳費金額！</p>
                <button
                  onClick={openSettings}
                  className="w-full py-5 bg-rentPrimary text-white rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform"
                >
                  前往設定
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-3xl shadow-sm border border-orange-50 p-6 mb-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-800 mb-2">{activeRoomId} 房</h3>
                      <p className="text-gray-500 font-bold text-lg">月租：{activeRoom.rent} 元 | 電費：{activeRoom.pricePerUnit} 元/度</p>
                    </div>
                    <button
                      onClick={openSettings}
                      className="p-3 text-gray-400 hover:text-rentPrimary bg-gray-50 rounded-2xl transition-colors active:scale-95"
                    >
                      <Settings className="w-7 h-7" />
                    </button>
                  </div>

                  <div className="bg-rentBg/60 p-5 rounded-2xl mb-8 border border-orange-100 flex justify-between items-center">
                    <span className="text-lg text-gray-600 font-bold">上期電表度數</span>
                    <span className="text-3xl font-bold text-rentSecondary">{activeRoom.prevMeter} <span className="text-lg text-gray-500 ml-1">度</span></span>
                  </div>

                  <div>
                    <label className="block text-rentPrimary font-black mb-4 text-2xl text-center">👇 請輸入「本期」度數 👇</label>
                    <input
                      type="number"
                      value={currentMeter}
                      onChange={(e) => {
                        setCurrentMeter(e.target.value);
                        setShowResult(false);
                      }}
                      placeholder="點我輸入數字"
                      className="w-full text-5xl p-6 bg-orange-50/30 border-2 border-rentPrimary/30 rounded-3xl focus:border-rentPrimary focus:ring-4 focus:ring-rentPrimary/20 outline-none text-center font-black text-gray-800 transition-all shadow-inner"
                    />
                  </div>

                  <button
                    onClick={calculateResult}
                    disabled={!currentMeter}
                    className={`w-full mt-8 py-5 rounded-2xl font-bold text-2xl shadow-lg transition-all active:scale-95 ${!currentMeter ? 'bg-gray-200 text-gray-400' : 'bg-rentPrimary text-white hover:bg-orange-500'
                      }`}
                  >
                    {!currentMeter ? '請輸入度數' : '計算本月總應收'}
                  </button>
                </div>

                {showResult && (
                  <div className="bg-gray-800 text-white rounded-3xl p-6 shadow-2xl animate-slide-up mb-8 border-4 border-gray-700">
                    <div className="flex items-center gap-3 mb-5 text-rentSecondary">
                      <CheckCircle2 className="w-8 h-8" />
                      <h3 className="text-2xl font-black">計算完成！</h3>
                    </div>

                    <div className="bg-white text-gray-800 rounded-2xl p-5 mb-6 whitespace-pre-line font-medium leading-relaxed text-lg shadow-inner">
                      {resultText}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <button
                        onClick={handleCopy}
                        className="py-4 bg-white text-gray-800 rounded-2xl font-bold flex items-center justify-center gap-2 shadow hover:bg-gray-50 active:scale-95 transition-all text-xl"
                      >
                        <Copy className="w-6 h-6" /> 複製
                      </button>
                      <button
                        onClick={handleShareLine}
                        className="py-4 bg-[#06C755] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow hover:bg-[#05b34c] active:scale-95 transition-all text-xl"
                      >
                        <Share2 className="w-6 h-6" /> LINE
                      </button>
                    </div>

                    <button
                      onClick={handleNextMonth}
                      className="w-full py-5 border-2 border-rentSecondary text-rentSecondary rounded-2xl font-black text-2xl hover:bg-rentSecondary hover:text-white transition-colors active:scale-95 bg-gray-900"
                    >
                      結算並進入下個月
                    </button>
                    <p className="text-center text-sm md:text-base mt-4 text-gray-400 font-medium">
                      按下後會把「本期度數」儲存變成下個月的「上期度數」
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {Object.keys(rooms).length === 0 && view === 'main' && (
          <div className="text-center mt-20 p-6 flex flex-col items-center">
            <div className="w-28 h-28 bg-white rounded-full flex justify-center items-center text-rentPrimary mb-8 shadow-sm">
              <Plus className="w-16 h-16" />
            </div>
            <h2 className="text-3xl font-black text-gray-700 mb-4">目前沒有任何房號</h2>
            <p className="text-gray-500 text-xl font-medium mb-10 leading-relaxed">請先點選上方的「新增」<br />來建立第一個房間資料吧！</p>
            <button
              onClick={() => setView('addRoom')}
              className="px-10 py-5 bg-rentPrimary text-white rounded-3xl font-black text-2xl shadow-xl hover:scale-105 transition-transform"
            >
              馬上新增房號
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
