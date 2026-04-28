import React from 'react';
import { SheagatHaariPage } from './SheagatHaariPage';

// Curated list of "full" battalions — same checks as שאגת הארי, scoped to
// only these battalions. Order doesn't matter; matched against the
// battalion label produced by the backend (DB suffix after `battalion_`).
const GDUDIM_MALEIM = ['335', '945', '240', '241', '7660', '5722'];

export const GdudimMaleimPage: React.FC = () => (
  <SheagatHaariPage battalionFilter={GDUDIM_MALEIM} title="גדודים מלאים" />
);
