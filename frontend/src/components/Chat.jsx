import { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

const API_BASE = 'https://bunny-elliott.onrender.com/api';

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // 待发送的图片
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFor, setAvatarFor] = useState(null); // 'user' | 'assistant'
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('bunny_avatar_user') || null);
  const [assistantAvatar, setAssistantAvatar] = useState(() => localStorage.getItem('bunny_avatar_assistant') || null);
  const messagesEndRef = useRef(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeMessages = messages[activeConvId] || [];

  // 加载对话
  useEffect(() => {
    fetch(`${API_BASE}/conversations`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data);
        if (data.length > 0) setActiveConvId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // 切换对话加载消息
  useEffect(() => {
    if (!activeConvId || messages[activeConvId]) return;
    fetch(`${API_BASE}/conversations/${activeConvId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages((prev) => ({ ...prev, [activeConvId]: data })))
      .catch(() => {});
  }, [activeConvId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  // ===== 发送消息 =====
  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    const imgData = pendingImage;
    const userMsg = imgData
      ? { role: 'user', content: '', image: imgData }
      : { role: 'user', content: text };
    setMessages((prev) => ({ ...prev, [activeConvId]: [...(prev[activeConvId] || []), userMsg] }));
    setInput('');
    setPendingImage(null);
    setIsTyping(true);

    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 50000);
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, image: imgData, conversationId: activeConvId }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.sessionId && data.sessionId !== activeConvId) {
        const oldMsgs = messages[activeConvId] || [];
        const userMsgOnly = oldMsgs.filter((m) => m.role === 'user');
        setActiveConvId(data.sessionId);
        setConversations((prev) => [
          { id: data.sessionId, name: '新对话 💬' },
          ...prev,
        ]);
        setMessages((prev) => ({
          ...prev,
          [data.sessionId]: [...userMsgOnly, { role: 'assistant', content: data.content }],
        }));
        setIsTyping(false);
        return;
      }

      setMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), { role: 'assistant', content: data.content }],
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), { role: 'assistant', content: 'Bunny 还在睡觉呢～再试一次吧 🐰💤' }],
      }));
    }
    setIsTyping(false);
  };

  // ===== 重命名 =====
  const startRename = (conv) => {
    setEditingId(conv.id);
    setEditName(conv.name || '新对话');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveRename = async () => {
    if (!editingId || !editName.trim()) { setEditingId(null); return; }
    // 如果是临时对话（前端新建但还没存到后端），只改本地
    if (typeof editingId === 'string' && editingId.startsWith('new-')) {
      setConversations((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, name: editName.trim() } : c))
      );
      setEditingId(null);
      return;
    }
    try {
      await fetch(`${API_BASE}/conversations/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, name: editName.trim() } : c))
      );
    } catch {}
    setEditingId(null);
  };

  // ===== 删除对话 =====
  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;
    // 临时对话直接删本地
    if (typeof id === 'string' && id.startsWith('new-')) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
      return;
    }
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
    } catch {}
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // ===== 头像上传 =====
  const handleAvatarClick = (role) => {
    setAvatarFor(role);
    setShowAvatarModal(true);
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (avatarFor === 'user') {
        setUserAvatar(dataUrl);
        localStorage.setItem('bunny_avatar_user', dataUrl);
      } else {
        setAssistantAvatar(dataUrl);
        localStorage.setItem('bunny_avatar_assistant', dataUrl);
      }
      setShowAvatarModal(false);
    };
    reader.readAsDataURL(file);
  };

  // ===== 发送图片 =====
  const handleImageSend = () => {
    fileInputRef.current?.click();
  };

  const handleImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const newConversation = () => {
    const id = `new-${Date.now()}`;
    setConversations((prev) => [{ id, name: '新对话 💬' }, ...prev]);
    setMessages((prev) => ({ ...prev, [id]: [] }));
    setActiveConvId(id);
  };

  // ===== 渲染 =====
  return (
    <div className={`chat-container ${sidebarOpen ? '' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2></h2>
          <button className="new-chat-btn" onClick={newConversation}>✦ 新对话</button>
        </div>
        <div className="conv-list">
          {conversations.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8aaa9a' }}>
              开始你的第一段对话吧～
            </div>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === activeConvId ? 'active' : ''}`}
              onClick={() => setActiveConvId(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  ref={editInputRef}
                  className="conv-title-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="conv-title" onDoubleClick={() => startRename(conv)}>
                  {conv.name || '新对话 💬'}
                </div>
              )}
              <button className="conv-delete" onClick={(e) => deleteConversation(e, conv.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer"></div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </header>

        <div className="messages-area">
          {activeMessages.length === 0 && !isTyping && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>开始聊天吧</p>
            </div>
          )}
          {activeMessages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="avatar" onClick={() => handleAvatarClick(msg.role)}>
                {msg.role === 'assistant'
                  ? (assistantAvatar ? <img src={assistantAvatar} alt="" /> : '🌸')
                  : (userAvatar ? <img src={userAvatar} alt="" /> : '🧑')
                }
              </div>
              <div className="bubble">
                <div className="msg-content">
                  {msg.content}
                  {msg.image && <img src={msg.image} className="msg-image" alt="" />}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message assistant">
              <div className="avatar">{assistantAvatar ? <img src={assistantAvatar} alt="" /> : '🌸'}</div>
              <div className="bubble typing">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <button
            onClick={handleImageSend}
            style={{
              background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
              padding: '8px', color: '#7a9a8a',
            }}
            title="发送图片"
          >
            🖼️
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageFile} style={{ display: 'none' }} />
          {pendingImage && (
            <div style={{ position: 'relative' }}>
              <img src={pendingImage} alt="" style={{ height: '40px', borderRadius: '8px' }} />
              <button onClick={() => setPendingImage(null)} style={{
                position: 'absolute', top: '-6px', right: '-6px',
                width: '16px', height: '16px', borderRadius: '50%', border: 'none',
                background: 'rgba(200,100,100,0.6)', color: '#fff', fontSize: '10px',
                cursor: 'pointer', lineHeight: '16px', textAlign: 'center', padding: 0,
              }}>✕</button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发消息..."
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || isTyping}>发送</button>
        </div>
      </main>

      {/* 头像上传弹窗 */}
      {showAvatarModal && (
        <div className="avatar-modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>修改头像</h3>
            <input type="file" accept="image/*" onChange={handleAvatarFile} />
            <div className="avatar-modal-buttons">
              <button className="btn-cancel" onClick={() => setShowAvatarModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
