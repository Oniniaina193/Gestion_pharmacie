import { useCallback, useState } from 'react';

class NativeNotificationManager {
  constructor() {
    this.permission = null;
    this.fallbackContainer = null;
    this.init();
  }

  async init() {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
    }
    
    // Créer conteneur pour fallback
    this.createFallbackContainer();
  }

  createFallbackContainer() {
    if (!document.getElementById('notification-fallback')) {
      const container = document.createElement('div');
      container.id = 'notification-fallback';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
      `;
      document.body.appendChild(container);
      this.fallbackContainer = container;
    }
  }

  show(message, type = 'info', options = {}) {
    const optimisticOptions = {
      duration: 3000,
      clickToClose: true,
      showProgress: false,
      ...options
    };

    // Essayer notification native 
    if (this.canUseNative()) {
      return this.showNative(message, type, optimisticOptions);
    }
    return this.showFallback(message, type, optimisticOptions);
  }

  canUseNative() {
    return 'Notification' in window && 
           this.permission === 'granted' && 
           document.visibilityState !== 'visible';
  }

  showNative(message, type, options) {
    const notification = new Notification(this.getTitle(type), {
      body: message,
      icon: this.getIcon(type),
      tag: `pharma-${type}-${Date.now()}`,
      requireInteraction: false,
      silent: type !== 'error'
    });

    // Auto-close
    if (options.duration > 0) {
      setTimeout(() => notification.close(), options.duration);
    }

    return notification;
  }

  showFallback(message, type, options) {
    const notification = document.createElement('div');
    const id = `notif-${Date.now()}`;
    
    notification.id = id;
    notification.innerHTML = this.getFallbackHTML(message, type, id);
    
    this.fallbackContainer.appendChild(notification);

    // Animation d'entrée
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Auto-remove
    const remove = () => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };

    if (options.duration > 0) {
      setTimeout(remove, options.duration);
    }

    // Click to close
    if (options.clickToClose) {
      notification.addEventListener('click', remove);
    }

    return { close: remove };
  }

  getFallbackHTML(message, type, id) {
    const colors = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-black',
      info: 'bg-blue-500 text-white'
    };

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    return `
      <div class="notification-item ${colors[type] || colors.info}" 
           style="
             display: flex;
             align-items: center;
             padding: 12px 16px;
             margin-bottom: 8px;
             border-radius: 8px;
             box-shadow: 0 4px 12px rgba(0,0,0,0.15);
             transform: translateX(100%);
             opacity: 0;
             transition: all 0.3s ease;
             cursor: pointer;
             pointer-events: auto;
             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
             font-size: 14px;
             line-height: 1.4;
           ">
        <span style="margin-right: 8px; font-weight: bold; font-size: 16px;">
          ${icons[type] || icons.info}
        </span>
        <span style="flex: 1;">${message}</span>
        <button onclick="document.getElementById('${id}').style.display='none'" 
                style="
                  background: none;
                  border: none;
                  color: inherit;
                  margin-left: 8px;
                  cursor: pointer;
                  opacity: 0.7;
                  font-size: 18px;
                  padding: 0;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">×</button>
      </div>
    `;
  }

  getTitle(type) {
    const titles = {
      success: 'Succès',
      error: 'Erreur',
      warning: 'Attention',
      info: 'Information'
    };
    return `Pharmacie - ${titles[type] || titles.info}`;
  }

  getIcon(type) {
    return '/favicon.ico'; 
  }
}

const notificationManager = new NativeNotificationManager();

export const useOptimizedNotifications = () => {
  const [isShowing, setIsShowing] = useState(false);

  const show = useCallback((message, type = 'info', options = {}) => {
    setIsShowing(true);
    
    const notification = notificationManager.show(message, type, {
      duration: 3000,
      ...options
    });

    setTimeout(() => setIsShowing(false), options.duration || 3000);

    return notification;
  }, []);

  const showSuccess = useCallback((message, options = {}) => {
    return show(message, 'success', options);
  }, [show]);

  const showError = useCallback((message, options = {}) => {
    return show(message, 'error', { duration: 5000, ...options });
  }, [show]);

  const showWarning = useCallback((message, options = {}) => {
    return show(message, 'warning', options);
  }, [show]);

  const showInfo = useCallback((message, options = {}) => {
    return show(message, 'info', options);
  }, [show]);

  return {
    show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    isShowing
  };
};

export const withOptimisticAction = (action, notifications, messages = {}) => {
  return async (...args) => {
    if (messages.loading) {
      notifications.showInfo(messages.loading);
    }

    try {
      const result = await action(...args);
      
      if (messages.success) {
        notifications.showSuccess(messages.success);
      }
      
      return result;
    } catch (error) {
      const errorMessage = messages.error || error.message || 'Une erreur est survenue';
      notifications.showError(errorMessage);
      throw error;
    }
  };
};

export const batchActionWithFeedback = async (actions, notifications, batchMessages = {}) => {
  const total = actions.length;
  let completed = 0;
  let errors = 0;

  notifications.showInfo(batchMessages.start || `Traitement de ${total} éléments...`);

  const results = await Promise.allSettled(actions.map(async (action, index) => {
    try {
      const result = await action();
      completed++;
      
      if (completed % 5 === 0 || completed === total) {
        notifications.showInfo(`${completed}/${total} traités`);
      }
      
      return result;
    } catch (error) {
      errors++;
      console.error(`Erreur action ${index + 1}:`, error);
      throw error;
    }
  }));

  if (errors === 0) {
    notifications.showSuccess(batchMessages.success || `${completed} éléments traités avec succès`);
  } else {
    notifications.showWarning(`${completed} réussis, ${errors} erreurs`);
  }

  return results;
};

export default notificationManager;