import { PanelPlugin } from '@grafana/data';
import React, { useEffect } from 'react';

function ListenerPanel() {
  useEffect(() => {
    console.log('🚀 Event Listener Panel mounted (on dashboard)');

    const handleMessage = (event: MessageEvent) => {
      console.log('🔔 Message received:', event.data);

      const data = event.data;
      if (data.type === 'setVariable' && data.variables) {
        setGrafanaVariables(data.variables);
      }
    };

    function setGrafanaVariables(vars: Record<string, string | string[]>) {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);

      Object.entries(vars).forEach(([k, v]) => {
        const name = `var-${k}`;
        if (Array.isArray(v)) {
          params.delete(name);
          v.forEach(x => params.append(name, x));
        } else {
          params.set(name, v);
        }
      });

      const newUrl = `${url.pathname}?${params}${url.hash}`;
      window.history.pushState({}, '', newUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    window.addEventListener('message', handleMessage);
    console.log('👂 Listening for postMessage events...');

    return () => {
      console.log('🛑 Listener Panel unmounted');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // hidden visual element
  return <div style={{ display: 'none' }}>Listener active</div>;
}

export const plugin = new PanelPlugin(ListenerPanel);
