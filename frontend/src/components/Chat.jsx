import { useState, useRef, useEffect } from 'react';
import './Chat.css';

const INITIAL_CONVERSATIONS = [
  { id: 1, title: '初次见面 💫', lastMsg: '你好呀！今天过得怎么样？' },
  { id: 2, title: '日常闲聊 ☕', lastMsg: '有什么有趣的事想分享吗？' },
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: '你好呀！我是 Bunny 🌟，你的 AI 伴侣助手。有什么想聊的吗？',
};

export default function Chat() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState(1);
  const [messages, setMessages] = useState({ 1: [WELCOME_MESSAGE], 2: [] });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const activeMessages = messages[activeConvId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = { ...messages, [activeConvId]: [...activeMessages, userMsg] };
    setMessages(updated);
    setInput('');
    setIsTyping(true);

    // TODO: 接入真正的 AI API
    setTimeout(() => {
      const reply = {
        role: 'assistant',
        content: '这是 AI 的回复（待接入 API）🤖\n\n你说的是："' + input.trim() + '"',
      };
      setMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), reply],
      }));
      setIsTyping(false);
    }, 1000);
  };

  const newConversation = () => {
    const id = Date.now();
    setConversations((prev) => [
      { id, title: `新对话 💬`, lastMsg: '' },
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
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Bunny 🌸</h2>
          <button className="new-chat-btn" onClick={newConversation}>
            ✦ 新对话
          </button>
        </div>
        <div className="conv-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => setActiveConvId(conv.id)}
            >
              <div className="conv-title">{conv.title}</div>
              <div className="conv-preview">{conv.lastMsg || '新对话'}</div>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span>❤️ 诗清的 Bunny</span>
        </div>
      </aside>

      {/* 主聊天区 */}
      <main className="chat-main">
        <header className="chat-header">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <span className="chat-title">
            {conversations.find((c) => c.id === activeConvId)?.title || '新对话'}
          </span>
        </header>

        <div className="messages-area">
          {activeMessages.length === 0 && !isTyping && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>开始一段新的对话吧！</p>
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
