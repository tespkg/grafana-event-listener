import { PanelPlugin } from '@grafana/data';
import React, { useEffect } from 'react';

function ListenerPanel() {
  useEffect(() => {
    console.log('🚀 Event Listener Panel mounted (on dashboard)');

    // Flag to prevent notifying parent of changes they initiated
    let isSettingFromParent = false;

    // Store the last known URL to detect changes
    let lastUrl = window.location.href;
    let lastVariables = JSON.stringify({});

    const handleMessage = (event: MessageEvent) => {
      console.log('🔔 Message received:', event.data);

      const data = event.data;
      if (data.type === 'setVariable' && data.variables) {
        isSettingFromParent = true;
        setGrafanaVariables(data.variables);
        isSettingFromParent = false;
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

      // Update last known state to prevent polling from detecting this change
      lastUrl = window.location.href;
      lastVariables = JSON.stringify(getCurrentVariables());

      // Tell Grafana to pick up the new variables
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
      // Don't notify parent if they initiated the change
      if (isSettingFromParent) {
        console.log('⏭️ Skipping notification (change from parent)');
        return;
      }

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

    // Initialize lastVariables with actual current variables
    lastVariables = JSON.stringify(getCurrentVariables());

    // Override pushState and replaceState to detect URL changes made by Grafana
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      console.log('🔧 pushState intercepted');
      handleLocationChange();
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      console.log('🔧 replaceState intercepted');
      handleLocationChange();
    };

    // Poll for URL changes as a fallback (every 500ms)
    const urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      const currentVariables = JSON.stringify(getCurrentVariables());

      if (currentUrl !== lastUrl || currentVariables !== lastVariables) {
        console.log('🔍 URL polling detected change');
        lastUrl = currentUrl;
        lastVariables = currentVariables;
        handleLocationChange();
      }
    }, 500);

    window.addEventListener('message', handleMessage);
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    console.log('👂 Listening for postMessage events and URL changes...');

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
      window.removeEventListener('hashchange', handleLocationChange);

      // Restore original history methods
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;

      // Clear the polling interval
      clearInterval(urlCheckInterval);
    };
  }, []);

  // hidden visual element
  return <div style={{ display: 'none' }}>Listener active</div>;
}

export const plugin = new PanelPlugin(ListenerPanel);
