/* Campaign catalog UI for the DnD Lore Portal homepage. */
(function () {
  'use strict';

  const officialCampaigns = [
    { id: 'lost-mine', title: 'Потерянные копи Фандельвера', english: 'Lost Mine of Phandelver', description: 'Классическое приключение о пропавшей шахте, опасном заговоре и судьбе небольшого поселения.', levels: '1–5 уровень', setting: 'Forgotten Realms' },
    { id: 'dragon-icespire', title: 'Дракон Пика Ледяного Шпиля', english: 'Dragon of Icespire Peak', description: 'Защитите окрестности Фандалина от белого дракона и опасностей Дикого Севера.', levels: '1–6 уровень', setting: 'Forgotten Realms' },
    { id: 'hoard-dragon-queen', title: 'Сокровище королевы драконов', english: 'Hoard of the Dragon Queen', description: 'Культ дракона собирает силы, а героям предстоит раскрыть его планы.', levels: '1–7 уровень', setting: 'Forgotten Realms' },
    { id: 'rise-tiamat', title: 'Восстание Тиамат', english: 'The Rise of Tiamat', description: 'Продолжение саги о культе драконов: объедините фракции и остановите возвращение Тиамат.', levels: '8–15 уровень', setting: 'Forgotten Realms' },
    { id: 'princes-apocalypse', title: 'Принцы Апокалипсиса', english: 'Princes of the Apocalypse', description: 'Раскройте угрозу стихийных культов, охвативших Долину Дессарин.', levels: '1–15 уровень', setting: 'Forgotten Realms' },
    { id: 'out-of-abyss', title: 'Из Бездны', english: 'Out of the Abyss', description: 'Побег из Подземья и борьба с демоническим вторжением в глубинах мира.', levels: '1–15 уровень', setting: 'Подземье' },
    { id: 'curse-strahd', title: 'Проклятие Страда', english: 'Curse of Strahd', description: 'Готическое приключение в туманной Баровии, которой правит древний вампир.', levels: '1–10 уровень', setting: 'Равенлофт' },
    { id: 'storm-kings-thunder', title: 'Гром штурмового короля', english: "Storm King's Thunder", description: 'Эпическое приключение по Дикому Северу: великаны, древние руны и тайны Севера.', levels: '1–11 уровень', setting: 'Forgotten Realms · Дикий Север', href: 'campaign.html' },
    { id: 'tomb-annihilation', title: 'Гробница Аннигиляции', english: 'Tomb of Annihilation', description: 'Экспедиция в смертельно опасные джунгли Чульта, где герои ищут источник проклятия смерти.', levels: '1–11 уровень', setting: 'Forgotten Realms · Чульт' },
    { id: 'dragon-heist', title: 'Вотердип: Драконье ограбление', english: 'Waterdeep: Dragon Heist', description: 'Городское приключение о тайнах, соперничающих фракциях и легендарном сокровище.', levels: '1–5 уровень', setting: 'Forgotten Realms · Вотердип' },
    { id: 'mad-mage', title: 'Вотердип: Подземелье Безумного мага', english: 'Waterdeep: Dungeon of the Mad Mage', description: 'Спуск в огромный лабиринт под городом, полный монстров, ловушек и тайн.', levels: '5–20 уровень', setting: 'Forgotten Realms · Подгорье' },
    { id: 'avernus', title: 'Нисхождение в Авернус', english: 'Baldur’s Gate: Descent into Avernus', description: 'Путешествие в первый слой Девяти Преисподних, где судьба города переплетается с адскими сделками.', levels: '1–13 уровень', setting: 'Forgotten Realms · Авернус' },
    { id: 'ghosts-saltmarsh', title: 'Призраки Солёных Топей', english: 'Ghosts of Saltmarsh', description: 'Морские тайны, опасные побережья и приключения, которые можно встроить в собственную кампанию.', levels: '1–12 уровень', setting: 'Сборник приключений' },
    { id: 'yawning-portal', title: 'Сказания из Портала Зияния', english: 'Tales from the Yawning Portal', description: 'Сборник классических подземелий и испытаний для разных уровней героев.', levels: '1–15 уровень', setting: 'Сборник приключений' },
    { id: 'icewind-dale', title: 'Долина Ледяного Ветра: Иней Девы Морозов', english: 'Icewind Dale: Rime of the Frostmaiden', description: 'Выживание на севере, где вечная зима скрывает древнюю магию и мрачные секреты.', levels: '1–12 уровень', setting: 'Forgotten Realms · Долина Ледяного Ветра' },
    { id: 'witchlight', title: 'За пределами Ведьминого света', english: 'The Wild Beyond the Witchlight', description: 'Сказочное путешествие в Страну Фей, где важны хитрость, договоры и чудеса.', levels: '1–8 уровень', setting: 'Страна Фей' },
    { id: 'candlekeep', title: 'Тайны Кэндлкипа', english: 'Candlekeep Mysteries', description: 'Антология мистических историй, каждая из которых начинается с необычной книги.', levels: '1–16 уровень', setting: 'Forgotten Realms · Кэндлкип' },
    { id: 'radiant-citadel', title: 'Путешествия по Сияющей Цитадели', english: 'Journeys through the Radiant Citadel', description: 'Антология приключений с разными культурами, мирами и историями.', levels: '1–14 уровень', setting: 'Сборник приключений' },
    { id: 'golden-vault', title: 'Ключи Золотого Хранилища', english: 'Keys from the Golden Vault', description: 'Сборник ограблений и секретных операций, где успех зависит от плана и командной работы.', levels: '1–11 уровень', setting: 'Сборник приключений' },
    { id: 'dragonlance', title: 'Dragonlance: Тень Королевы Драконов', english: 'Dragonlance: Shadow of the Dragon Queen', description: 'Военное фэнтези на Кринне во время войны с драконьими армиями.', levels: '1–11 уровень', setting: 'Dragonlance · Кринн' },
    { id: 'phandelver-below', title: 'Фандельвер и дальше: Обелиск', english: 'Phandelver and Below: The Shattered Obelisk', description: 'История Фандельвера продолжается тайной древнего обелиска и угрозой за пределами привычного мира.', levels: '1–12 уровень', setting: 'Forgotten Realms' },
    { id: 'vecna', title: 'Векна: Канун Руины', english: 'Vecna: Eve of Ruin', description: 'Приключение высокого уровня: героям предстоит остановить планы легендарного лича.', levels: '10–20 уровень', setting: 'Мультивселенная D&D' },
    { id: 'spelljammer', title: 'Свет Ксариxis', english: 'Spelljammer: Light of Xaryxis', description: 'Космическое приключение с путешествиями между мирами и опасностями за пределами планет.', levels: '5–8 уровень', setting: 'Spelljammer' },
    { id: 'strixhaven', title: 'Стриксхейвен: Учебная программа хаоса', english: 'Strixhaven: A Curriculum of Chaos', description: 'Магический университет, дружба, соперничество и загадки студенческой жизни.', levels: '1–10 уровень', setting: 'Стриксхейвен' }
  ];

  const officialModal = document.getElementById('officialCampaignModal');
  const customModal = document.getElementById('customCampaignModal');
  const searchInput = document.getElementById('campaignCatalogSearch');
  const catalogList = document.getElementById('campaignCatalogList');
  const catalogEmpty = document.getElementById('campaignCatalogEmpty');
  const customForm = document.getElementById('customCampaignForm');

  if (!officialModal || !customModal || !customForm) return;

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (officialModal.hidden && customModal.hidden) document.body.style.overflow = '';
  }

  function openCustomModal() {
    closeModal(officialModal);
    openModal(customModal);
  }

  function isAlreadyAdded(item) {
    return campaigns.some(function (campaign) {
      return campaign.sourceId === item.id ||
        campaign.title.trim().toLocaleLowerCase('ru') === item.title.trim().toLocaleLowerCase('ru');
    });
  }

  function renderCatalog() {
    const query = searchInput.value.trim().toLocaleLowerCase('ru');
    catalogList.innerHTML = '';
    const filtered = officialCampaigns.filter(function (item) {
      return [item.title, item.english, item.description, item.setting, item.levels]
        .join(' ').toLocaleLowerCase('ru').includes(query);
    });
    catalogEmpty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach(function (item) {
      const added = isAlreadyAdded(item);
      const card = document.createElement('article');
      card.className = 'flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-4';
      const title = document.createElement('h3');
      title.className = 'font-bold text-amber-200';
      title.textContent = item.title;
      const originalTitle = document.createElement('p');
      originalTitle.className = 'mt-1 text-xs text-zinc-500';
      originalTitle.textContent = item.english;
      const description = document.createElement('p');
      description.className = 'mt-3 text-sm leading-relaxed text-zinc-400';
      description.textContent = item.description;
      const meta = document.createElement('p');
      meta.className = 'mb-4 mt-3 text-xs text-zinc-500';
      meta.textContent = [item.levels, item.setting].filter(Boolean).join(' · ');
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = added;
      button.className = added
        ? 'mt-auto w-full rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed'
        : 'mt-auto w-full rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-300';
      button.textContent = added ? 'Уже в моих кампаниях' : '＋ Добавить в мои кампании';
      button.addEventListener('click', function () {
        if (isAlreadyAdded(item)) return;
        const campaign = {
          title: item.title,
          description: item.description,
          levels: item.levels,
          setting: item.setting,
          sourceId: item.id,
          source: 'official',
          href: item.href || null,
          createdAt: new Date().toISOString()
        };
        campaigns.push(campaign);
        if (saveStorage(STORAGE_KEYS.campaigns, campaigns)) {
          renderCampaigns();
          renderCatalog();
        }
      });
      card.append(title, originalTitle, description, meta, button);
      catalogList.appendChild(card);
    });
  }

  function createCustomCampaign(event) {
    event.preventDefault();
    const title = document.getElementById('customCampaignTitle').value.trim();
    if (!title) return;
    const duplicate = campaigns.some(function (campaign) {
      return campaign.title.trim().toLocaleLowerCase('ru') === title.toLocaleLowerCase('ru');
    });
    if (duplicate) {
      alert('Кампания с таким названием уже есть в списке. Выбери другое название.');
      document.getElementById('customCampaignTitle').focus();
      return;
    }

    const description = document.getElementById('customCampaignDescription').value.trim();
    const levels = document.getElementById('customCampaignLevels').value.trim();
    const setting = document.getElementById('customCampaignSetting').value.trim();
    const campaign = {
      title: title,
      description: description,
      href: null,
      source: 'custom',
      createdAt: new Date().toISOString()
    };
    if (levels) campaign.levels = levels;
    if (setting) campaign.setting = setting;
    campaigns.push(campaign);

    if (saveStorage(STORAGE_KEYS.campaigns, campaigns)) {
      renderCampaigns();
      closeModal(customModal);
      customForm.reset();
      document.getElementById('campaigns').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.getElementById('createCampaignBtn').addEventListener('click', function () {
    searchInput.value = '';
    renderCatalog();
    openModal(officialModal);
  });
  document.getElementById('createCustomCampaignBtn').addEventListener('click', openCustomModal);
  document.getElementById('createCampaignSmall').addEventListener('click', openCustomModal);
  customForm.addEventListener('submit', createCustomCampaign);
  searchInput.addEventListener('input', renderCatalog);

  document.querySelectorAll('[data-close-modal]').forEach(function (button) {
    button.addEventListener('click', function () {
      closeModal(document.getElementById(button.dataset.closeModal));
    });
  });
  document.querySelectorAll('[data-open-custom]').forEach(function (button) {
    button.addEventListener('click', openCustomModal);
  });
  [officialModal, customModal].forEach(function (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal(modal);
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal(officialModal);
      closeModal(customModal);
    }
  });
})();
