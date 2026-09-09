import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=3e26475-1555';

const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Разница «серверные часы минус мои». Точность около секунды, отсчёт 3-2-1 её прячет.
let clockOffset = 0;

export async function measureClock() {
  try {
    const t0 = Date.now();
    const { data, error } = await client.rpc('server_time');
    const t1 = Date.now();
    if (!error && data) { const server = Date.parse(data); if (!Number.isNaN(server)) clockOffset = server - (t0 + t1) / 2; }
  } catch (_) { clockOffset = 0; }
  return clockOffset;
}

export function serverNow() { return Date.now() + clockOffset; }

export async function loadRoom(id) {
  const { data, error } = await client.from('rooms').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const fresh = { id, participants: [], settings: {} };
  const ins = await client.from('rooms').insert(fresh).select().single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function saveParticipants(id, participants) {
  const { error } = await client.from('rooms')
    .update({ participants, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function saveSettings(id, settings) {
  const { error } = await client.from('rooms')
    .update({ settings, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function loadGames(roomId, limit = 30) {
  const { data, error } = await client.from('games').select('*')
    .eq('room_id', roomId).order('played_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function insertGame(game) {
  const { data, error } = await client.from('games').insert(game).select().single();
  if (error) throw error;
  return data;
}

// Подписка на комнату: изменения списка и новые игры приходят всем, кто открыл ссылку.
// Канал broadcast несёт событие старта; self: true, чтобы у нажавшего игра шла тем же путём.
export function subscribeRoom(roomId, { onRoom, onGame, onStart }) {
  const channel = client.channel(`room:${roomId}`, { config: { broadcast: { self: true } } })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (p) => onRoom(p.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` },
      (p) => onGame(p.new))
    .on('broadcast', { event: 'start' }, (p) => onStart(p.payload))
    .subscribe();
  return {
    sendStart(payload) { return channel.send({ type: 'broadcast', event: 'start', payload }); },
    close() { client.removeChannel(channel); },
  };
}
