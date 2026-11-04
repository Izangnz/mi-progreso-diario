/* Explorador DEMO: no utiliza almacenamiento, cuentas ni peticiones de red. */
(() => {
  const profiles = window.MPDCommunityProfiles || [];
  const grid = document.getElementById('communityGrid');
  const search = document.getElementById('communitySearch');
  const dialog = document.getElementById('communityProfile');
  const detail = document.getElementById('communityDetail');
  let trigger;
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  function identity(profile, parent, expanded) {
    parent.append(node('div', profile.initials, 'community-avatar'));
    const title = node(expanded ? 'h3' : 'h3', profile.name);
    if (expanded) title.id = 'communityProfileTitle';
    parent.append(title, node('p', `${profile.city} · ${profile.age} años`, 'muted'));
    const tags = node('div', '', 'community-tags');
    profile.interests.forEach(interest => tags.append(node('span', interest)));
    parent.append(tags);
  }
  function openProfile(profile, button) {
    trigger = button;
    detail.replaceChildren();
    identity(profile, detail, true);
    detail.append(node('p', 'Perfil ficticio · DEMO', 'eyebrow'), node('h4', profile.project), node('p', profile.pitch), node('h4', 'Su historia'), node('p', profile.story), node('h4', 'Lo que está aprendiendo'), node('p', profile.experience), node('h4', 'Enlaces voluntarios'));
    if (!profile.links.length) detail.append(node('p', 'Este perfil DEMO no incluye enlaces.', 'muted'));
    profile.links.forEach(link => {
      // HTTPS exclusivamente; nunca se interpreta HTML de los perfiles.
      let url;
      try { url = new URL(link.url); } catch { return; }
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const anchor = node('a', link.label + ' ↗ (nueva pestaña)');
      anchor.href = url.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      detail.append(anchor);
    });
    dialog.showModal();
    document.getElementById('communityClose').focus();
  }
  function render() {
    const query = normalize(search.value.trim());
    const matches = profiles.filter(p => normalize([p.name,p.city,...p.interests,p.description,p.project,p.pitch].join(' ')).includes(query));
    grid.replaceChildren();
    matches.forEach(profile => {
      const card = node('article', '', 'card community-card');
      identity(profile, card, false);
      card.append(node('p', profile.description), node('h4', profile.project), node('p', profile.pitch, 'muted'));
      const button = node('button', 'Conocer su historia'); button.type = 'button';
      button.setAttribute('aria-label', 'Conocer la historia de ' + profile.name);
      button.addEventListener('click', () => openProfile(profile, button));
      card.append(button); grid.append(card);
    });
    document.getElementById('communityEmpty').hidden = matches.length !== 0;
    document.getElementById('communityCount').textContent = `${matches.length} perfiles DEMO`;
  }
  search.addEventListener('input', render);
  document.getElementById('communityClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger?.focus());
  render();
})();
