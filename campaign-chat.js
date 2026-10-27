(() => {
  'use strict';
  const CAMPAIGN = 'storm-kings-thunder';
  const $ = (id) => document.getElementById(id);
  let client, user, isMaster = false, masterId = null, activeContact = null;
  let contacts = [], messages = [], channel = null, initialized = false;
  const unread = new Set();

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function timeLabel(value) {
    try { return new Intl.DateTimeFormat('ru-RU', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(value)); }
    catch (_) { return ''; }
  }
  function toast(message, bad = false) {
    let node = $('campaign-chat-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'campaign-chat-toast';
      node.className = 'campaign-chat-toast';
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.toggle('error', bad);
    node.classList.add('show');
    window.setTimeout(() => node.classList.remove('show'), 4200);
  }
  function addStyles() {
    if ($('campaign-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'campaign-chat-styles';
    style.textContent = `
      .campaign-chat-actions{display:flex;align-items:center;gap:8px}
      .campaign-chat-action{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:8px 12px;border:1px solid rgba(245,158,11,.35);border-radius:12px;background:rgba(245,158,11,.09);color:#fde68a;font:600 13px system-ui;cursor:pointer}
      .campaign-chat-action:hover{background:rgba(245,158,11,.17)}
      .campaign-chat-count{display:none;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#dc2626;color:white;font-size:11px;line-height:18px;text-align:center}
      .campaign-chat-count.visible{display:inline-block}
      .campaign-chat-modal{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(3,7,18,.78);backdrop-filter:blur(5px)}
      .campaign-chat-modal.open{display:flex}
      .campaign-chat-window{display:flex;flex-direction:column;width:min(920px,100%);height:min(700px,90vh);overflow:hidden;border:1px solid #3f3f46;border-radius:20px;background:#09090b;box-shadow:0 25px 80px #0009}
      .campaign-chat-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid #27272a}
      .campaign-chat-head h2{margin:0;color:#fef3c7;font-size:18px;font-weight:800}
      .campaign-chat-close{border:1px solid #3f3f46;border-radius:10px;padding:6px 11px;color:#e4e4e7;background:#18181b;cursor:pointer}
      .campaign-chat-body{display:grid;grid-template-columns:240px minmax(0,1fr);flex:1;min-height:0}
      .campaign-chat-sidebar{overflow:auto;border-right:1px solid #27272a;padding:10px}
      .campaign-chat-section-label{padding:9px 9px 5px;color:#a1a1aa;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      .campaign-chat-contact,.campaign-chat-notice{display:block;width:100%;text-align:left;border:1px solid transparent;border-radius:11px;padding:10px;margin:3px 0;background:transparent;color:#e4e4e7;cursor:pointer;overflow-wrap:anywhere}
      .campaign-chat-contact:hover,.campaign-chat-notice:hover{background:#18181b}
      .campaign-chat-contact.active{border-color:#92400e;background:rgba(120,53,15,.24)}
      .campaign-chat-contact small,.campaign-chat-notice small{display:block;margin-top:4px;color:#a1a1aa;font-size:11px}
      .campaign-chat-thread{display:flex;flex-direction:column;min-width:0;min-height:0}
      .campaign-chat-thread-title{padding:13px 18px;border-bottom:1px solid #27272a;color:#f4f4f5;font-weight:700}
      .campaign-chat-feed{display:flex;flex:1;flex-direction:column;gap:10px;overflow:auto;padding:18px}
      .campaign-chat-empty{margin:auto;max-width:340px;text-align:center;color:#a1a1aa;font-size:13px;line-height:1.6}
      .campaign-chat-bubble{max-width:min(82%,520px);align-self:flex-start;border:1px solid #3f3f46;border-radius:14px 14px 14px 4px;padding:10px 12px;background:#18181b;color:#f4f4f5;white-space:pre-wrap;overflow-wrap:anywhere}
      .campaign-chat-bubble.mine{align-self:flex-end;border-color:#92400e;background:rgba(120,53,15,.3);border-radius:14px 14px 4px 14px}
      .campaign-chat-bubble time{display:block;margin-top:6px;color:#a1a1aa;font-size:10px}
      .campaign-chat-compose{display:flex;gap:8px;padding:12px;border-top:1px solid #27272a}
      .campaign-chat-compose textarea{flex:1;min-width:0;resize:vertical;max-height:130px;min-height:42px;border:1px solid #3f3f46;border-radius:11px;padding:10px;background:#18181b;color:#fafafa;font:inherit}
      .campaign-chat-send{align-self:flex-end;border:0;border-radius:11px;padding:11px 15px;background:#d97706;color:#18181b;font-weight:800;cursor:pointer}
      .campaign-chat-send:disabled,.campaign-chat-compose textarea:disabled{opacity:.45;cursor:not-allowed}
      .campaign-chat-toast{position:fixed;z-index:10001;right:18px;bottom:18px;max-width:min(420px,calc(100vw - 36px));padding:12px 16px;border:1px solid #52525b;border-radius:12px;background:#18181b;color:#f4f4f5;box-shadow:0 10px 30px #0008;opacity:0;transform:translateY(8px);pointer-events:none;transition:.2s}
      .campaign-chat-toast.show{opacity:1;transform:translateY(0)}.campaign-chat-toast.error{border-color:#b91c1c}
      @media(max-width:600px){.campaign-chat-actions{gap:5px}.campaign-chat-action{padding:8px 9px}.campaign-chat-body{grid-template-columns:105px minmax(0,1fr)}.campaign-chat-sidebar{padding:5px}.campaign-chat-contact,.campaign-chat-notice{padding:8px 5px;font-size:12px}.campaign-chat-head{padding:13px}.campaign-chat-feed{padding:10px}.campaign-chat-compose{padding:8px}.campaign-chat-send{padding:10px}.campaign-chat-window{height:92vh}}
    `;
    document.head.appendChild(style);
  }
  function buildUI() {
    addStyles();
    const headerRight = document.querySelector('header .page-wrap > div:last-child');
    if (headerRight && !$('campaign-chat-actions')) {
      const actions = document.createElement('div');
      actions.id = 'campaign-chat-actions';
      actions.className = 'campaign-chat-actions';
      actions.innerHTML = '<button type="button" id="campaign-chat-bell" class="campaign-chat-action" aria-label="Уведомления" title="Уведомления">♧ <span id="campaign-chat-count" class="campaign-chat-count">0</span></button><button type="button" id="campaign-chat-open" class="campaign-chat-action" title="Личный чат">✉ <span>Чат</span></button>';
      headerRight.appendChild(actions);
      $('campaign-chat-bell').addEventListener('click', () => openModal(true));
      $('campaign-chat-open').addEventListener('click', () => openModal(false));
    }
    if (!$('campaign-chat-modal')) {
      const modal = document.createElement('div');
      modal.id = 'campaign-chat-modal';
      modal.className = 'campaign-chat-modal';
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
      modal.setAttribute('aria-label','Личный чат кампании');
      modal.innerHTML = `
        <section class="campaign-chat-window">
          <header class="campaign-chat-head"><h2>✉ Личный чат кампании</h2><button type="button" class="campaign-chat-close" id="campaign-chat-close">Закрыть ✕</button></header>
          <div class="campaign-chat-body">
            <aside class="campaign-chat-sidebar">
              <div class="campaign-chat-section-label">Новые сообщения</div><div id="campaign-chat-notices"></div>
              <div class="campaign-chat-section-label" id="campaign-chat-contacts-label">Переписки</div><div id="campaign-chat-contacts"></div>
            </aside>
            <section class="campaign-chat-thread">
              <div class="campaign-chat-thread-title" id="campaign-chat-thread-title">Выбери собеседника</div>
              <div class="campaign-chat-feed" id="campaign-chat-feed"><div class="campaign-chat-empty">Личные сообщения мастера и игроков. Переписку видите только вы и ваш собеседник.</div></div>
              <form class="campaign-chat-compose" id="campaign-chat-form"><textarea id="campaign-chat-input" maxlength="4000" rows="2" placeholder="Написать сообщение…" aria-label="Текст сообщения"></textarea><button class="campaign-chat-send" type="submit">Отправить</button></form>
            </section>
          </div>
        </section>`;
      document.body.appendChild(modal);
      $('campaign-chat-close').addEventListener('click', closeModal);
      modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
      $('campaign-chat-form').addEventListener('submit', sendMessage);
    }
  }
  function closeModal() { $('campaign-chat-modal')?.classList.remove('open'); }
  async function openModal(showNotices) {
    $('campaign-chat-modal')?.classList.add('open');
    await refreshAll();
    if (showNotices) {
      renderNotices();
      const firstUnread = messages.find(m => m.recipient_id === user.id && !m.read_at);
      if (firstUnread) {
        const target = isMaster ? firstUnread.sender_id : masterId;
        if (target) await selectContact(target);
      }
    } else if (!activeContact && contacts.length) {
      await selectContact(contacts[0].id);
    }
    $('campaign-chat-input')?.focus();
  }
  async function loadContacts() {
    if (isMaster) {
      const [membersResult, charactersResult] = await Promise.all([
        client.from('campaign_members').select('user_id').eq('campaign_slug', CAMPAIGN),
        client.from('campaign_characters').select('owner_id,name').eq('campaign_slug', CAMPAIGN).order('created_at',{ascending:true})
      ]);
      if (membersResult.error) throw membersResult.error;
      if (charactersResult.error) throw charactersResult.error;
      const names = new Map();
      (charactersResult.data || []).forEach(row => { if (!names.has(row.owner_id)) names.set(row.owner_id,row.name); });
      contacts = [...new Set((membersResult.data || []).map(row => row.user_id))]
        .filter(id => id !== user.id)
        .map(id => ({id,name:names.get(id) || ('Игрок ' + id.slice(0,8))}));
    } else {
      const result = await client.rpc('get_campaign_master', {p_campaign_slug:CAMPAIGN});
      if (result.error) throw result.error;
      masterId = result.data;
      contacts = masterId ? [{id:masterId,name:'Мастер'}] : [];
    }
    if (!activeContact || !contacts.some(c => c.id === activeContact)) activeContact = contacts[0]?.id || null;
    renderContacts();
  }
  async function loadMessages() {
    const result = await client.from('campaign_messages').select('id,campaign_slug,sender_id,recipient_id,body,created_at,read_at')
      .eq('campaign_slug',CAMPAIGN).or('sender_id.eq.' + user.id + ',recipient_id.eq.' + user.id)
      .order('created_at',{ascending:true}).limit(500);
    if (result.error) throw result.error;
    messages = result.data || [];
    renderNotices();
    renderContacts();
    renderThread();
    updateUnreadCount();
  }
  async function refreshAll() {
    try {
      await loadContacts();
      await loadMessages();
    } catch (error) {
      console.error('Не удалось загрузить личный чат:',error);
      const message = String(error?.message || error);
      if (/campaign_messages|campaign_members|campaign_characters|get_campaign_master|schema cache|does not exist/i.test(message)) {
        toast('Чат почти готов: выполни SQL-файл supabase/campaign-chat.sql в Supabase → SQL Editor.',true);
      } else toast('Не удалось загрузить чат: ' + message,true);
    }
  }
  function contactName(id) {
    return contacts.find(c => c.id === id)?.name || (id === masterId ? 'Мастер' : 'Игрок');
  }
  function currentThread() {
    return messages.filter(m => (m.sender_id === user.id && m.recipient_id === activeContact) ||
      (m.sender_id === activeContact && m.recipient_id === user.id));
  }
  function renderContacts() {
    const box = $('campaign-chat-contacts');
    if (!box) return;
    if (!contacts.length) {
      box.innerHTML = '<p class="campaign-chat-empty">Пока нет доступных собеседников.</p>';
      return;
    }
    box.innerHTML = contacts.map(c => {
      const thread = messages.filter(m => (m.sender_id === user.id && m.recipient_id === c.id) || (m.sender_id === c.id && m.recipient_id === user.id));
      const last = thread[thread.length-1];
      const unreadCount = thread.filter(m => m.recipient_id === user.id && !m.read_at).length;
      return '<button type="button" class="campaign-chat-contact '+(c.id===activeContact?'active':'')+'" data-contact="'+esc(c.id)+'">'+esc(c.name)+(unreadCount?' <b>('+unreadCount+')</b>':'')+'<small>'+esc(last ? last.body.slice(0,48) : 'Начать переписку')+'</small></button>';
    }).join('');
    box.querySelectorAll('[data-contact]').forEach(button => button.addEventListener('click', () => selectContact(button.dataset.contact)));
  }
  function renderNotices() {
    const box = $('campaign-chat-notices');
    if (!box) return;
    const recent = messages.filter(m => m.recipient_id === user.id && !m.read_at).slice(-8).reverse();
    if (!recent.length) {
      box.innerHTML = '<p class="campaign-chat-empty" style="padding:6px">Нет непрочитанных сообщений</p>';
      updateUnreadCount();
      return;
    }
    box.innerHTML = recent.map(m => {
      const sender = isMaster ? contactName(m.sender_id) : 'Мастер';
      return '<button type="button" class="campaign-chat-notice" data-notice="'+esc(m.id)+'">● '+esc(sender)+'<small>'+esc(m.body.slice(0,72))+' · '+esc(timeLabel(m.created_at))+'</small></button>';
    }).join('');
    box.querySelectorAll('[data-notice]').forEach(button => button.addEventListener('click', async () => {
      const message = messages.find(m => m.id === button.dataset.notice);
      if (!message) return;
      await selectContact(isMaster ? message.sender_id : masterId);
    }));
    updateUnreadCount();
  }
  function updateUnreadCount() {
    const count = messages.filter(m => m.recipient_id === user.id && !m.read_at).length;
    const badge = $('campaign-chat-count');
    if (badge) { badge.textContent = count > 99 ? '99+' : String(count); badge.classList.toggle('visible',count>0); }
    const bell = $('campaign-chat-bell');
    if (bell) bell.setAttribute('aria-label',count ? 'Уведомления: '+count+' непрочитанных' : 'Уведомления');
  }
  function renderThread() {
    const title = $('campaign-chat-thread-title'), feed = $('campaign-chat-feed'), input = $('campaign-chat-input'), send = document.querySelector('.campaign-chat-send');
    if (!activeContact) {
      title.textContent = 'Выбери собеседника';
      feed.innerHTML = '<div class="campaign-chat-empty">Чтобы начать личную переписку, выбери собеседника слева.</div>';
      if(input) input.disabled = true; if(send) send.disabled = true;
      return;
    }
    if(input) input.disabled = false; if(send) send.disabled = false;
    title.textContent = contactName(activeContact);
    const thread = currentThread();
    feed.innerHTML = thread.length ? thread.map(m => '<article class="campaign-chat-bubble '+(m.sender_id===user.id?'mine':'')+'">'+esc(m.body)+'<time>'+esc(m.sender_id===user.id?'Вы · ':'')+esc(timeLabel(m.created_at))+(m.sender_id===user.id?(m.read_at?' · прочитано':' · отправлено'):'')+'</time></article>').join('') :
      '<div class="campaign-chat-empty">Пока сообщений нет. Можно написать первым!</div>';
    feed.scrollTop = feed.scrollHeight;
  }
  async function selectContact(id) {
    activeContact = id;
    renderContacts();
    renderThread();
    const unreadIds = currentThread().filter(m => m.recipient_id === user.id && !m.read_at).map(m => m.id);
    if (unreadIds.length) {
      const result = await client.from('campaign_messages').update({read_at:new Date().toISOString()}).in('id',unreadIds);
      if (result.error) console.warn('Не удалось отметить сообщения прочитанными:',result.error);
      else {
        messages = messages.map(m => unreadIds.includes(m.id) ? {...m,read_at:new Date().toISOString()} : m);
        renderNotices(); renderContacts(); renderThread();
      }
    }
  }
  async function sendMessage(event) {
    event.preventDefault();
    const input = $('campaign-chat-input');
    const body = input.value.trim();
    if (!body || !activeContact) return;
    input.disabled = true;
    const send = document.querySelector('.campaign-chat-send');
    if(send) send.disabled = true;
    const result = await client.from('campaign_messages').insert({
      campaign_slug:CAMPAIGN,sender_id:user.id,recipient_id:activeContact,body
    }).select('id,campaign_slug,sender_id,recipient_id,body,created_at,read_at').single();
    input.disabled = false;
    if(send) send.disabled = false;
    if (result.error) {
      console.error('Не удалось отправить сообщение:',result.error);
      toast('Не удалось отправить: ' + result.error.message,true);
      return;
    }
    input.value = '';
    messages.push(result.data);
    renderThread(); renderContacts(); renderNotices(); updateUnreadCount();
    input.focus();
  }
  async function init() {
    if (initialized) return;
    client = window.dndLoreSupabase;
    user = window.dndLoreUser;
    isMaster = window.dndLoreIsMaster === true;
    if (!client || !user) return;
    initialized = true;
    buildUI();
    await refreshAll();
    channel = client.channel('campaign-chat-' + CAMPAIGN + '-' + user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'campaign_messages',filter:'campaign_slug=eq.'+CAMPAIGN},payload => {
        if (payload.eventType === 'INSERT' && payload.new?.recipient_id === user.id) {
          toast('Новое сообщение от ' + (payload.new.sender_id === masterId ? 'мастера' : (isMaster ? contactName(payload.new.sender_id) : 'игрока')) + '.');
        }
        refreshAll();
      }).subscribe();
  }
  window.addEventListener('dnd-lore-role-ready', init);
  if (document.body.classList.contains('role-verified')) init();
  window.addEventListener('beforeunload', () => { if (channel && client) client.removeChannel(channel); });
})();