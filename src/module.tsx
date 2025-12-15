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

    function getCurrentVariables(): Record<string, string | string[]> {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      const variables: Record<string, string | string[]> = {};

      params.forEach((value, key) => {
        if (key.startsWith('var-')) {
          const varName = key.substring(4);
          const existing = variables[varName];
          if (existing) {
            if (Array.isArray(existing)) {
              existing.push(value);
            } else {
              variables[varName] = [existing, value];
            }
          } else {
            variables[varName] = value;
          }
        }
      });

      return variables;
    }

    function notifyParentOfVariables() {
      const variables = getCurrentVariables();
      if (window.parent) {
        console.log('📤 Sending variable change to parent:', variables);
        window.parent.postMessage({
          type: 'variableChanged',
          variables
        }, '*');
      }
    }

    const handleLocationChange = () => {
      console.log('🔄 URL changed, checking for variable updates');
      notifyParentOfVariables();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('popstate', handleLocationChange);
    console.log('👂 Listening for postMessage events...');

    if (window.parent) {
      console.log('👋 Sending ready message to parent');
      window.parent.postMessage({ type: 'grafanaPanelReady' }, '*');

      // Send initial variable state
      notifyParentOfVariables();
    }

    return () => {
      console.log('🛑 Listener Panel unmounted');
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // hidden visual element
  return <div style={{ display: 'none' }}>Listener active</div>;
}

export const plugin = new PanelPlugin(ListenerPanel);
