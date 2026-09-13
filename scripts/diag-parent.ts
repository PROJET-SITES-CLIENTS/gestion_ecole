import { renderToString } from 'react-dom/server';
import * as React from 'react';
const Module = require('module');
const resOrig = Module._resolveFilename;
Module._resolveFilename = function (req: string, ...args: any[]) {
  if (req === 'next/navigation') return require.resolve('./stub-next-navigation');
  return resOrig.call(this, req, ...args);
};
(async () => {
  const { default: ParentPortalModule } = await import('../src/components/modules/parent-portal');
  console.log('default export:', typeof ParentPortalModule);
  try {
    renderToString(React.createElement(ParentPortalModule, { initialData: {}, mode: 'dashboard' }));
    console.log('RENDU OK');
  } catch (e: any) {
    console.error('MESSAGE COMPLET :', e.message);
    console.error('STACK :', e.stack?.split('\n').slice(0, 8).join('\n'));
  }
})();
