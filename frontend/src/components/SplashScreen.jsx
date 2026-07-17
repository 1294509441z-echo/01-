import { useState, useEffect } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('idle'); // idle → typing → done

  useEffect(() => {
    // 延迟一下开始打字效果
    const t1 = setTimeout(() => setPhase('typing'), 600);
    // 打字完停留一会儿再消失
    const t2 = setTimeout(() => setPhase('done'), 4000);
    // 切到聊天界面
    const t3 = setTimeout(() => onFinish(), 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div className={`splash-overlay ${phase === 'done' ? 'splash-fade-out' : ''}`}>
      <div className="splash-frost" />
      <div className="splash-content">
        <div className="splash-text-wrapper">
          <div className="splash-chinese">
            {phase === 'idle' ? '' : '明天又是新的一天'}
          </div>
          <div className="splash-english">
            {phase === 'idle' ? '' : 'Tomorrow is another day'}
          </div>
        </div>
      </div>
    </div>
  );
}
