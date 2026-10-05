// Hairline layer sigils on a 24 grid, the same family as the menu and the dial.
export const SIGILS: Record<string, string> = {
  lore: '<path d="M12 6.5C9.8 5 6.9 4.6 4 5v13c2.9-.4 5.8 0 8 1.5 2.2-1.5 5.1-1.9 8-1.5V5c-2.9-.4-5.8 0-8 1.5zM12 6.5v13"/>',
  law: '<path d="M12 3v18M7.5 21h9M4 6.5h16"/><path d="M6.5 6.5L3.5 13h6zM17.5 6.5l-3 6.5h6z"/><path d="M3.5 13a3 2 0 0 0 6 0M14.5 13a3 2 0 0 0 6 0"/>',
  language: '<path d="M20 3C13.5 4.2 8.6 9.4 6.6 16.4L5.4 21"/><path d="M6.8 15.6c3.4.2 6.8-1.2 9-3.6M9.4 10.8c2.4.1 4.6-.7 6.2-2"/>',
  map: '<path d="M3 6.2 9 4l6 2.2L21 4v13.8L15 20l-6-2.2L3 20z"/><path d="M9 4v13.8M15 6.2V20"/>',
  ground: '<path d="M4.5 21V9.5h2.5V6.5h2.5v3h1.5v-3h2v3h1.5v-3h2.5v3h2.5V21z"/><path d="M10 21v-4.5a2 2 0 0 1 4 0V21"/>',
  artifacts: '<path d="M10 2.5h4V6l2.2 3.2V21H7.8V9.2L10 6z"/><path d="M7.8 12h8.4v5H7.8z"/>',
  machinery: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
};

// One sigil for each world, the same family as the layers.
export const WORLD_SIGILS: Record<string, string> = {
  'restoration-medical': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/><path d="M5.2 17.6c2-1.4 4.3-2.1 6.8-2.1s4.8.7 6.8 2.1"/>',
  'black-lotus-coffee': '<path d="M12 4c2.2 2.6 2.2 6.6 0 9.2-2.2-2.6-2.2-6.6 0-9.2z"/><path d="M12 13.2c-1.6-2.8-4.6-4.2-7.6-3.8.4 3 2.8 5.4 7.6 3.8zM12 13.2c1.6-2.8 4.6-4.2 7.6-3.8-.4 3-2.8 5.4-7.6 3.8z"/><path d="M5 17.5h14M8 20.5h8"/>',
  'castleblack-spirits': '<path d="M7 21V8h2V5.5h2V8h2V5.5h2V8h2v13z"/><path d="M10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21M10.5 12h3"/>',
  'lisa-dang-immigration-law': '<path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M9 21v-9a3 3 0 0 1 6 0v9"/><path d="M3 21h18"/>',
  lorelyns: '<path d="M6 11h12l-1.6 9H7.6z"/><path d="M6 11a6 4.5 0 0 1 12 0"/><path d="M12 6.5V4M9.5 15.5h5"/>',
  'rum-raiders-ring': '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 10h8"/><path d="M4.5 13.5c0 4 3.4 6.5 7.5 6.5s7.5-2.5 7.5-6.5M4.5 13.5 3 15.5M19.5 13.5 21 15.5"/>',
  'toronto-beauty': '<ellipse cx="12" cy="9.5" rx="5.5" ry="6.5"/><path d="M12 16v5M9 21h6"/><path d="M9.5 7.5c.8-1.2 2-1.8 3.3-1.6"/>',
  'wellfit-social-club': '<path d="M8.6 10.2V8.5a3.4 3.4 0 0 1 6.8 0v1.7"/><circle cx="12" cy="15" r="5.6"/><path d="M10 15h4"/>',
  'art-colouring': '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.6 0 2-1.2 1.4-2.2-.7-1.2.1-2.6 1.6-2.6H18a2.5 2.5 0 0 0 2.5-2.5A8.5 8.5 0 0 0 12 3.5z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>',
};
