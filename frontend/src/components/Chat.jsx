import { useState, useRef, useEffect } from 'react';
import './Chat.css';

// 后端 API 地址（部署在 Render）
const API_BASE = 'https://bunny-elliott.onrender.com/api';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const activeMessages = messages[activeConvId] || [];

  // 初始加载对话列表
  useEffect(() => {
    fetch(`${API_BASE}/conversations`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data);
        if (data.length > 0) {
          setActiveConvId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // 切换对话时加载消息
  useEffect(() => {
    if (!activeConvId) return;
    if (messages[activeConvId]) return; // 已缓存

    fetch(`${API_BASE}/conversations/${activeConvId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages((prev) => ({ ...prev, [activeConvId]: data }));
      })
      .catch(() => {});
  }, [activeConvId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const text = input.trim();
    const userMsg = { role: 'user', content: text };

    // 立即显示用户消息
    const updatedMsgs = [...activeMessages, userMsg];
    setMessages((prev) => ({ ...prev, [activeConvId]: updatedMsgs }));
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeConvId }),
      });
      const data = await res.json();

      // 如果是新对话，更新列表
      if (data.sessionId && data.sessionId !== activeConvId) {
        setActiveConvId(data.sessionId);
        setConversations((prev) => [
          { id: data.sessionId, name: '新对话 💬', created_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      // 显示 AI 回复
      setMessages((prev) => ({
        ...prev,
        [data.sessionId || activeConvId]: [
          ...(prev[data.sessionId || activeConvId] || []),
          { role: 'assistant', content: data.content },
        ],
      }));
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [activeConvId]: [
          ...(prev[activeConvId] || []),
          { role: 'assistant', content: 'Bunny 暂时联系不上了～请稍后再试 🌸' },
        ],
      }));
    }
    setIsTyping(false);
  };

  const newConversation = () => {
    const id = `new-${Date.now()}`;
    setConversations((prev) => [
      { id, name: '新对话 💬', created_at: new Date().toISOString() },
      ...prev,
    ]);
    setMessages((prev) => ({ ...prev, [id]: [] }));
    setActiveConvId(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`chat-container ${sidebarOpen ? '' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Bunny 🌸</h2>
          <button className="new-chat-btn" onClick={newConversation}>
            ✦ 新对话
          </button>
        </div>
        <div className="conv-list">
          {conversations.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              开始你的第一段对话吧～
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => setActiveConvId(conv.id)}
            >
              <div className="conv-title">{conv.name || '新对话 💬'}</div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span>❤️ 诗清的 Bunny</span>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <span className="chat-title">
            {conversations.find((c) => c.id === activeConvId)?.name || '新对话'}
          </span>
        </header>

        <div className="messages-area">
          {activeMessages.length === 0 && !isTyping && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>给 Bunny 发一条消息吧！</p>
            </div>
          )}
          {activeMessages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="avatar">{msg.role === 'assistant' ? '🌸' : '🧑'}</div>
              <div className="bubble">
                <div className="msg-content">{msg.content}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message assistant">
              <div className="avatar">🌸</div>
              <div className="bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="给 Bunny 发消息..."
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || isTyping}>
            发送
          </button>
        </div>
      </main>
    </div>
  );
}
