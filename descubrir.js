/* Navegación interna y lectura editorial. Sin escrituras ni peticiones de red. */
(() => {
  const $ = id => document.getElementById(id);
  const sections = ['feed', 'people'];
  function select(name) {
    for (const section of sections) {
      $('discover-' + section).hidden = section !== name;
      $('discover-' + section + '-button').setAttribute('aria-pressed', String(section === name));
    }
  }
  for (const section of sections) {
    $('discover-' + section + '-button').addEventListener('click', () => select(section));
  }
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const feed = $('discoverFeed');
  const posts = window.MPDPostData.editorial.list();
  feed.replaceChildren();
  for (const post of posts) {
    const card = node('article', '', 'card editorial-card');
    card.append(node('p', post.category, 'editorial-category'), node('h3', post.title),
      node('p', post.description, 'editorial-description'), node('p', 'Editorial de muestra · Mi Progreso Diario', 'editorial-label'));
    const details = node('details', '', 'editorial-details');
    const summary = node('summary', 'Leer guía');
    summary.setAttribute('aria-label', 'Leer guía: ' + post.title);
    details.append(summary);
    for (const paragraph of post.paragraphs) details.append(node('p', paragraph));
    details.append(node('p', post.action, 'editorial-action'));
    card.append(details);
    feed.append(card);
  }
  $('discoverFeedEmpty').hidden = posts.length !== 0;
  select('feed');
})();
