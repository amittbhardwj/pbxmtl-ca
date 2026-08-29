(() => {
  const menuButton = document.querySelector('.menu-button');
  const navigation = document.querySelector('.nav-links');

  if (menuButton && navigation) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', 'site-navigation');
    navigation.id = 'site-navigation';

    const closeMenu = () => {
      navigation.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    };

    menuButton.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const messages = {
    fr: {
      sending: 'Envoi en cours…',
      success: 'Merci! Votre demande a bien été envoyée. Amitt vous répondra personnellement.',
      error: 'La demande n’a pas pu être envoyée. Réessayez ou écrivez directement à amitt.bhardwj@gmail.com.'
    },
    en: {
      sending: 'Sending…',
      success: 'Thank you! Your request was sent. Amitt will reply personally.',
      error: 'The request could not be sent. Please try again or email amitt.bhardwj@gmail.com directly.'
    }
  };

  document.querySelectorAll('[data-lead-form]').forEach((form) => {
    const language = form.dataset.language === 'en' ? 'en' : 'fr';
    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('button[type="submit"]');
    const originalLabel = submit.innerHTML;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      submit.disabled = true;
      submit.textContent = messages[language].sending;
      status.hidden = false;
      status.className = 'form-ready is-sending';
      status.textContent = messages[language].sending;

      try {
        const fields = Object.fromEntries(new FormData(form).entries());
        fields.agreement = Boolean(fields.agreement);
        fields.language = language;
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(fields)
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        form.reset();
        status.className = 'form-ready is-success';
        status.textContent = messages[language].success;
      } catch (error) {
        console.error(error);
        status.className = 'form-ready is-error';
        status.textContent = messages[language].error;
      } finally {
        submit.disabled = false;
        submit.innerHTML = originalLabel;
      }
    });
  });
})();
