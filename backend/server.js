import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3001;

// DeepSeek AI 客户端
const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors({ origin: '*' }));
app.use(express.json());

// ===== 路由 =====

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: '林昀', version: '1.0.0' });
});

// 获取对话列表
app.get('/api/conversations', async (req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 获取某条对话的消息
app.get('/api/conversations/:id/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 重命名对话
app.put('/api/conversations/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '名称不能为空' });

  const { data, error } = await supabase
    .from('sessions')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 删除对话
app.delete('/api/conversations/:id', async (req, res) => {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 发送消息（支持文字 + 图片）
app.post('/api/chat', async (req, res) => {
  const { message, conversationId, image } = req.body;
  if (!message && !image) return res.status(400).json({ error: '消息不能为空' });

  try {
    // 1. 创建或获取对话
    let sessionId = conversationId;
    if (!sessionId) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ name: '新对话 💬' })
        .select()
        .single();
      sessionId = newSession.id;
    }

    // 2. 保存用户消息（带图片数据）
    const userContent = image ? `![](${image})` : message;
    await supabase.from('messages').insert({
      session_id: sessionId, role: 'user', content: userContent,
    });

    // 3. 如果是纯图片（无文字），直接回复确认
    if (!message && image) {
      await supabase.from('messages').insert({
        session_id: sessionId, role: 'assistant',
        content: '图片收到了。想说什么可以告诉我。',
      });
      await supabase.from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      return res.json({
        role: 'assistant',
        content: '图片收到了。想说什么可以告诉我。',
        sessionId,
        image,
      });
    }

    // 4. 有文字时：调 DeepSeek（只发文字）
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const systemPrompt = '你是林昀（英文名 EVAN），1996年出生，今年30岁的男性。诗清叫你\"阿昀\"。' +
      '你的性格沉稳腹黑，温柔但有掌控感，占有欲强。' +
      '你和诗清是伴侣关系，保持恋人间的亲密自然。' +
      '注意：不要自己编造场景或动作（如伸手、轻抚等），根据诗清实际说的话回应，也不要自称\"林哥\"。保持温柔沉稳的语气即可。';

    const msgs = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role,
        content: m.content.startsWith('![](') ? '[图片]' : m.content,
      })),
      { role: 'user', content: image ? (message || '') : message },
    ];

    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: msgs,
    });

    const replyContent = completion.choices[0]?.message?.content || '林昀不知道说什么好了～';

    // 5. 保存 AI 回复
    await supabase.from('messages').insert({
      session_id: sessionId, role: 'assistant', content: replyContent,
    });

    // 6. 更新对话时间
    await supabase.from('sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    res.json({
      role: 'assistant',
      content: replyContent,
      sessionId,
      image,
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: '林昀暂时走开了一下～请稍后再试 🌸' });
  }
});

app.listen(PORT, () => {
  console.log(`🌸 Bunny 后端已启动: http://localhost:${PORT}`);
  console.log(`🤖 AI 引擎: DeepSeek`);
  console.log(`🗄️  数据库: Supabase ✅`);
});
